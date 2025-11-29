import mongoose, { Document, Schema } from 'mongoose';

export interface IFormField {
  id: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date';
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    acceptedTypes?: string[]; // For file uploads
  };
  options?: string[]; // For select, radio, checkbox
  defaultValue?: string | number | boolean;
}

export interface IForm extends Omit<Document, 'schema'> {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  schema: IFormField[]; // Form field definitions (not Mongoose schema)
  shareableId: string; // Unique ID for public sharing
  embedding?: number[]; // Vector embedding for semantic search
  summary?: string; // Text summary for retrieval
  purpose?: string; // Extracted purpose/category
  createdAt: Date;
  updatedAt: Date;
}

const FormSchema = new Schema<IForm>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  schema: {
    type: [{
      id: { type: String, required: true },
      type: { type: String, required: true },
      label: { type: String, required: true },
      name: { type: String, required: true },
      placeholder: { type: String, required: false },
      required: { type: Boolean, default: false },
      validation: {
        type: {
          min: Number,
          max: Number,
          pattern: String,
          minLength: Number,
          maxLength: Number,
          acceptedTypes: [String],
        },
        required: false,
      },
      options: { type: [String], required: false },
      defaultValue: { type: Schema.Types.Mixed, required: false },
    }],
    required: true,
  },
  shareableId: {
    type: String,
    required: true,
    unique: true,
  },
  embedding: {
    type: [Number],
    sparse: true, // Sparse index for optional field
  },
  summary: {
    type: String,
  },
  purpose: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt on save
FormSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for efficient querying
FormSchema.index({ userId: 1, createdAt: -1 });
// shareableId index is automatically created by unique: true above

export default mongoose.model<IForm>('Form', FormSchema) as mongoose.Model<IForm>;

