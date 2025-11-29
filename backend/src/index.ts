import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import authRoutes from './routes/auth';
import formRoutes from './routes/forms';
import submissionRoutes from './routes/submissions';
import uploadRoutes from './routes/upload';

// Load .env from root directory (parent of backend/) - only in development
// In production (Render), environment variables are set directly
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
} else {
  dotenv.config(); // Load from current directory in production
}

// Verify critical environment variables after loading
if (process.env.GEMINI_API_KEY) {
  console.log('✅ Gemini API key loaded');
} else {
  console.warn('⚠️  GEMINI_API_KEY not found in .env file');
}

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  console.log('✅ Cloudinary credentials loaded');
} else {
  console.warn('⚠️  Cloudinary credentials not found in .env file (image uploads will not work)');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS: Allow frontend URL in production, all origins in development
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || '*' // Set FRONTEND_URL in Render
    : '*',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/centralign';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CentrAlign API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

