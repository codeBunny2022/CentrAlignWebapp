import express, { Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Submission from '../models/Submission';
import Form from '../models/Form';
import { z } from 'zod';

const router = express.Router();

const submitFormSchema = z.object({
  formId: z.string(),
  data: z.record(z.any()),
  imageUrls: z.array(z.string()).optional(),
});

// Submit form response
router.post('/', async (req: Request, res: Response) => {
  try {
    const { formId, data, imageUrls } = submitFormSchema.parse(req.body);

    // Verify form exists
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Create submission (userId is optional for anonymous submissions)
    const submissionData: any = {
      formId,
      data,
      imageUrls: imageUrls || [],
    };
    // Don't set userId for anonymous submissions - it will default to null
    
    const submission = new Submission(submissionData);

    await submission.save();

    res.status(201).json({
      message: 'Submission successful',
      submissionId: submission._id,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: error.message || 'Failed to submit form' });
  }
});

// Get all submissions for authenticated user's forms
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get all user's forms
    const forms = await Form.find({ userId });
    const formIds = forms.map(f => f._id);

    // Get submissions grouped by form
    const submissions = await Submission.find({ formId: { $in: formIds } })
      .populate('formId', 'title shareableId')
      .sort({ submittedAt: -1 });

    // Group by form
    const grouped: Record<string, any> = {};
    submissions.forEach(sub => {
      const formId = (sub.formId as any)?._id?.toString() || 'unknown';
      if (!grouped[formId]) {
        grouped[formId] = {
          form: sub.formId,
          submissions: [],
        };
      }
      grouped[formId].submissions.push({
        id: sub._id,
        data: sub.data,
        imageUrls: sub.imageUrls,
        submittedAt: sub.submittedAt,
      });
    });

    res.json({ submissions: grouped });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch submissions' });
  }
});

// Get submissions for a specific form
router.get('/form/:formId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const formId = req.params.formId;

    // Verify form belongs to user
    const form = await Form.findOne({ _id: formId, userId });
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const submissions = await Submission.find({ formId })
      .sort({ submittedAt: -1 });

    res.json({
      form: {
        id: form._id,
        title: form.title,
        shareableId: form.shareableId,
      },
      submissions: submissions.map(sub => ({
        id: sub._id,
        data: sub.data,
        imageUrls: sub.imageUrls,
        submittedAt: sub.submittedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch submissions' });
  }
});

export default router;

