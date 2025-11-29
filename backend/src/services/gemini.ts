import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

/**
 * Fetch image from URL and convert to base64 with MIME type
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });
    const buffer = Buffer.from(response.data);
    const base64 = buffer.toString('base64');
    
    // Detect MIME type from URL or Content-Type header
    let mimeType = 'image/jpeg'; // Default
    const contentType = response.headers['content-type'];
    if (contentType && contentType.startsWith('image/')) {
      mimeType = contentType;
    } else if (imageUrl.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
      const ext = imageUrl.match(/\.(\w+)$/i)?.[1]?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };
      mimeType = mimeTypes[ext || ''] || 'image/jpeg';
    }
    
    return { data: base64, mimeType };
  } catch (error) {
    console.error('Error fetching image:', error);
    throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
  }
}

/**
 * Convert JavaScript object notation to valid JSON
 * Handles single quotes, unquoted keys, trailing commas, etc.
 */
function convertJavaScriptToJSON(jsCode: string): string {
  let json = jsCode.trim();
  
  // Remove variable assignments and return statements
  json = json.replace(/^(const|let|var)\s+\w+\s*=\s*/i, '');
  json = json.replace(/^return\s+/i, '');
  json = json.replace(/;?\s*$/, '');
  
  // Handle string concatenation patterns like: '[\n' + '  {\n' + ...
  // Extract the actual content between quotes
  if (json.includes("' +") || json.includes('" +')) {
    // This is a concatenated string, extract the actual content
    const matches = json.match(/(['"])(?:(?=(\\?))\2.)*?\1/g);
    if (matches) {
      json = matches.map(m => m.slice(1, -1)).join('');
    }
  }
  
  // Replace single quotes with double quotes (but preserve escaped quotes)
  json = json.replace(/(?<!\\)'/g, '"');
  
  // Fix unquoted keys (e.g., id: -> "id":)
  json = json.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  
  // Remove trailing commas
  json = json.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix boolean values (true/false should not be quoted)
  json = json.replace(/:\s*"true"/g, ': true');
  json = json.replace(/:\s*"false"/g, ': false');
  json = json.replace(/:\s*"null"/g, ': null');
  
  // Fix numeric values (remove quotes from numbers)
  json = json.replace(/:\s*"(\d+)"/g, ': $1');
  json = json.replace(/:\s*"(\d+\.\d+)"/g, ': $1');
  
  return json.trim();
}

// Lazy initialization to ensure env vars are loaded
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI | null {
  if (genAI === null) {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      console.warn('⚠️  GEMINI_API_KEY not set. Form generation will not work.');
      return null;
    }
    genAI = new GoogleGenerativeAI(API_KEY);
  }
  return genAI;
}

export interface FormContext {
  purpose: string;
  fields: string[];
  schema?: any;
}

export interface GenerateFormParams {
  prompt: string;
  context?: FormContext[]; // Relevant past forms
  imageUrls?: string[]; // Example images to analyze
}

export async function generateFormSchema(params: GenerateFormParams): Promise<any> {
  const ai = getGenAI();
  if (!ai) {
    throw new Error('Gemini API key not configured');
  }

  // Build context-aware prompt
  let systemPrompt = `You are a JSON form schema generator. Convert natural language requests into valid JSON only.

CRITICAL: Return ONLY valid JSON. Use double quotes for all strings. No JavaScript code, no markdown, no explanations, no code blocks.

Form field types: text, email, number, textarea, select, checkbox, radio, file, date

Each field must have:
- id: string (camelCase)
- type: string (one of the types above)
- label: string
- name: string (camelCase)
- placeholder: string (optional)
- required: boolean
- validation: object (optional, with min, max, pattern, minLength, maxLength, acceptedTypes)
- options: array of strings (for select/radio/checkbox)
- defaultValue: string|number|boolean (optional)

Return this exact JSON structure:
{
  "title": "Form Title",
  "description": "Form description",
  "fields": [
    {
      "id": "fieldId",
      "type": "text",
      "label": "Field Label",
      "name": "fieldName",
      "placeholder": "Placeholder text",
      "required": true
    }
  ]
}

IMPORTANT: Use double quotes for all strings. Return valid JSON only, no code.`;

  let userPrompt = params.prompt;

  // Add context if available
  if (params.context && params.context.length > 0) {
    systemPrompt += `\n\nHere is relevant user form history for reference:\n${JSON.stringify(params.context, null, 2)}\n\nUse patterns from similar forms to maintain consistency.`;
  }

  userPrompt += '\n\nReturn ONLY valid JSON with double quotes. No code, no markdown.';

  // Use vision-capable model if images are provided, otherwise use text model
  const hasImages = params.imageUrls && params.imageUrls.length > 0;
  // Many Gemini models support vision when images are passed in content array
  // Try the working text model first with images, then fallback models
  const modelNames = hasImages 
    ? ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro'] // Try vision with known working models
    : ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro']; // Text models
  let lastError: any = null;
  let visionFailed = false;

  for (const modelName of modelNames) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      
      // Build content with images if provided
      let content: any;
      if (hasImages && params.imageUrls) {
        // Use vision model - include images in the prompt
        // Fetch all images in parallel
        const imageData = await Promise.all(
          params.imageUrls.map(url => fetchImageAsBase64(url))
        );
        
        const imageParts = imageData.map(({ data, mimeType }) => ({
          inlineData: {
            data,
            mimeType,
          }
        }));
        
        content = [
          `${systemPrompt}\n\nUser request: ${userPrompt}\n\nIMPORTANT: Analyze the provided example images carefully. Generate a form schema that matches the design, layout, and fields shown in the images. Pay attention to field names, types, and the overall structure.`,
          ...imageParts
        ];
      } else {
        // Text-only prompt
        content = `${systemPrompt}\n\nUser request: ${userPrompt}`;
      }
      
      const result = await model.generateContent(content);
      const response = await result.response;
      const text = response.text();

      // Log raw response in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Raw Gemini response:', text.substring(0, 500));
      }

      // Extract and clean JSON from response
      let jsonText = text.trim();
      
      // Remove markdown code blocks
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/g, '').replace(/\s*```$/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/g, '').replace(/\s*```$/g, '');
      }
      
      // Try to parse as JSON first
      let schema;
      try {
        schema = JSON.parse(jsonText);
      } catch (parseError: any) {
        // If JSON parse fails, try to convert JavaScript object notation to JSON
        console.warn('JSON parse failed, attempting to convert JavaScript to JSON...');
        console.warn('Raw text:', jsonText.substring(0, 200));
        
        try {
          jsonText = convertJavaScriptToJSON(jsonText);
          schema = JSON.parse(jsonText);
        } catch (convertError: any) {
          // Last resort: try to extract JSON object/array from the text
          const jsonMatch = jsonText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              schema = JSON.parse(jsonMatch[0]);
            } catch (e) {
              throw new Error(`Failed to parse JSON: ${parseError.message}. Conversion also failed: ${convertError.message}`);
            }
          } else {
            throw new Error(`Failed to parse JSON: ${parseError.message}. No JSON structure found in response.`);
          }
        }
      }

      // Validate schema structure
      if (!schema.title || !schema.fields || !Array.isArray(schema.fields)) {
        // If schema is just an array of fields, wrap it
        if (Array.isArray(schema)) {
          schema = {
            title: 'Generated Form',
            description: '',
            fields: schema
          };
        } else {
          throw new Error('Invalid schema structure: missing title or fields array');
        }
      }

      return schema;
    } catch (error: any) {
      // If it's a 404 (model not found), try next model
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.warn(`Model ${modelName} not available, trying next model...`);
        lastError = error;
        continue;
      }
      
      // If vision failed and we have images, try text-only as fallback
      if (hasImages && !visionFailed && (error.message?.includes('vision') || error.message?.includes('image'))) {
        console.warn('Vision model failed, falling back to text-only generation...');
        visionFailed = true;
        // Retry with text-only (no images)
        try {
          const textModel = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const textContent = `${systemPrompt}\n\nUser request: ${userPrompt}\n\nNote: Example images were provided but could not be processed. Generate form based on the text description only.`;
          const textResult = await textModel.generateContent(textContent);
          const textResponse = await textResult.response;
          const text = textResponse.text();
          
          // Parse and return (reuse existing parsing logic)
          let jsonText = text.trim();
          if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/g, '').replace(/\s*```$/g, '');
          } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/g, '').replace(/\s*```$/g, '');
          }
          
          const schema = JSON.parse(jsonText);
          if (!schema.title || !schema.fields || !Array.isArray(schema.fields)) {
            if (Array.isArray(schema)) {
              return { title: 'Generated Form', description: '', fields: schema };
            }
            throw new Error('Invalid schema structure');
          }
          return schema;
        } catch (fallbackError: any) {
          console.error('Text-only fallback also failed:', fallbackError);
          // Continue to throw original error
        }
      }
      
      // For other errors, throw immediately
      console.error('Gemini API error:', error);
      throw new Error(`Failed to generate form schema: ${error.message}`);
    }
  }

  // If all models failed, try text-only as last resort if we had images
  if (hasImages && !visionFailed) {
    console.warn('All vision models failed, trying text-only as last resort...');
    try {
      const textModel = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const textContent = `${systemPrompt}\n\nUser request: ${userPrompt}\n\nNote: Example images were provided but could not be processed. Generate form based on the text description only.`;
      const textResult = await textModel.generateContent(textContent);
      const textResponse = await textResult.response;
      const text = textResponse.text();
      
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/g, '').replace(/\s*```$/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/g, '').replace(/\s*```$/g, '');
      }
      
      const schema = JSON.parse(jsonText);
      if (!schema.title || !schema.fields || !Array.isArray(schema.fields)) {
        if (Array.isArray(schema)) {
          return { title: 'Generated Form', description: '', fields: schema };
        }
      }
      return schema;
    } catch (fallbackError) {
      // Ignore and throw original error
    }
  }

  // If all models failed, throw the last error
  console.error('All Gemini models failed. Last error:', lastError);
  throw new Error(`Failed to generate form schema: No available models. Last error: ${lastError?.message || 'Unknown error'}`);
}

