import express, { Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Form from '../models/Form';
import { generateFormSchema } from '../services/gemini';
import { retrieveRelevantForms, extractFormSummary, generateEmbedding } from '../services/embedding';
import { z } from 'zod';
import crypto from 'crypto';

const router = express.Router();

const generateFormSchema_validation = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  imageUrls: z.array(z.string().url()).optional(),
});

// Generate new form with AI
router.post('/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, imageUrls } = generateFormSchema_validation.parse(req.body);
    const userId = req.userId!;

    // Retrieve relevant past forms (top-K)
    const relevantForms = await retrieveRelevantForms(userId, prompt, 5);

    // Build context from relevant forms
    const context = relevantForms.map(form => ({
      purpose: form.purpose || form.title,
      fields: form.schema.map(f => f.label || f.name),
      schema: form.schema,
    }));

    // Generate form schema using AI (with images if provided)
    const generatedSchema = await generateFormSchema({
      prompt,
      context: context.length > 0 ? context : undefined,
      imageUrls: imageUrls || [],
    });

    // Validate and ensure fields is an array
    if (!generatedSchema.fields || !Array.isArray(generatedSchema.fields)) {
      throw new Error('Generated schema must have a fields array');
    }

    // Ensure each field has required properties and clean up undefined values
    const validatedFields = generatedSchema.fields.map((field: any, index: number) => {
      if (!field.id || !field.type || !field.label || !field.name) {
        throw new Error(`Field at index ${index} is missing required properties (id, type, label, name)`);
      }
      
      const validatedField: any = {
        id: String(field.id),
        type: String(field.type),
        label: String(field.label),
        name: String(field.name),
        required: Boolean(field.required || false),
      };
      
      // Only add optional fields if they exist
      if (field.placeholder) {
        validatedField.placeholder = String(field.placeholder);
      }
      
      if (field.validation) {
        const validation: any = {};
        if (field.validation.min !== undefined) validation.min = Number(field.validation.min);
        if (field.validation.max !== undefined) validation.max = Number(field.validation.max);
        if (field.validation.pattern) validation.pattern = String(field.validation.pattern);
        if (field.validation.minLength !== undefined) validation.minLength = Number(field.validation.minLength);
        if (field.validation.maxLength !== undefined) validation.maxLength = Number(field.validation.maxLength);
        if (field.validation.acceptedTypes && Array.isArray(field.validation.acceptedTypes)) {
          validation.acceptedTypes = field.validation.acceptedTypes.map((t: any) => String(t));
        }
        if (Object.keys(validation).length > 0) {
          validatedField.validation = validation;
        }
      }
      
      if (field.options && Array.isArray(field.options) && field.options.length > 0) {
        validatedField.options = field.options.map((opt: any) => String(opt));
      }
      
      if (field.defaultValue !== undefined) {
        validatedField.defaultValue = field.defaultValue;
      }
      
      return validatedField;
    });

    // Extract purpose/summary for future retrieval
    const summary = extractFormSummary({
      title: generatedSchema.title,
      description: generatedSchema.description || '',
      schema: validatedFields,
    } as any);

    // Generate embedding for semantic search
    const embeddingText = `${prompt} ${summary}`;
    const embedding = await generateEmbedding(embeddingText);

    // Extract purpose (simple keyword extraction)
    const purpose = extractPurpose(prompt, generatedSchema);

    // Create form with unique shareable ID
    const shareableId = crypto.randomBytes(16).toString('hex');
    
    const form = new Form({
      userId,
      title: String(generatedSchema.title || 'Untitled Form'),
      description: generatedSchema.description ? String(generatedSchema.description) : undefined,
      schema: validatedFields,
      shareableId,
      embedding,
      summary,
      purpose,
    });

    await form.save();

    res.status(201).json({
      message: 'Form generated successfully',
      form: {
        id: form._id,
        title: form.title,
        description: form.description,
        schema: form.schema,
        shareableId: form.shareableId,
        createdAt: form.createdAt,
      },
      contextUsed: context.length,
    });
  } catch (error: any) {
    console.error('Form generation error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate form',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Get all user's forms
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const forms = await Form.find({ userId })
      .select('-embedding') // Don't send embeddings to frontend
      .sort({ createdAt: -1 });

    res.json({ forms });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch forms' });
  }
});

// Get form by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const form = await Form.findOne({ _id: req.params.id, userId })
      .select('-embedding');

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json({ form });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch form' });
  }
});

// Get form by shareable ID (public, no auth required)
router.get('/share/:shareableId', async (req: Request, res: Response) => {
  try {
    const form = await Form.findOne({ shareableId: req.params.shareableId })
      .select('-embedding -userId');

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json({ form });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch form' });
  }
});

// Delete form
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const form = await Form.findOneAndDelete({ _id: req.params.id, userId });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json({ message: 'Form deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete form' });
  }
});

// Helper function to extract purpose from prompt and schema
function extractPurpose(prompt: string, schema: any): string {
  const lowerPrompt = prompt.toLowerCase();
  
  // Common form purposes
  const purposes = [
    'signup', 'registration', 'application', 'survey', 'contact',
    'job', 'hiring', 'internship', 'resume', 'career',
    'medical', 'patient', 'health', 'appointment',
    'admission', 'college', 'university', 'education',
    'feedback', 'review', 'testimonial',
  ];

  for (const purpose of purposes) {
    if (lowerPrompt.includes(purpose)) {
      return purpose;
    }
  }

  // Fallback: use first field type or title
  if (schema.fields && schema.fields.length > 0) {
    const firstField = schema.fields[0];
    if (firstField.type === 'file' && (firstField.label?.toLowerCase().includes('resume') || firstField.label?.toLowerCase().includes('cv'))) {
      return 'job';
    }
  }

  return 'general';
}

export default router;

