import mongoose, { Document, Schema } from 'mongoose';

export interface ISubmissionData {
  [fieldName: string]: string | number | boolean | string[] | File | null;
}

export interface ISubmission extends Document {
  formId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId | null; // Optional for anonymous submissions
  data: ISubmissionData;
  imageUrls?: string[]; // URLs of uploaded images
  submittedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>({
  formId: {
    type: Schema.Types.ObjectId,
    ref: 'Form',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Allow anonymous submissions
    index: true,
    default: null,
  },
  data: {
    type: Schema.Types.Mixed,
    required: true,
  },
  imageUrls: {
    type: [String],
    default: [],
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient querying
SubmissionSchema.index({ formId: 1, submittedAt: -1 });
SubmissionSchema.index({ userId: 1, submittedAt: -1 });

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);

