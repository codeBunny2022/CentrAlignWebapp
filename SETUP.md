# Quick Setup Guide

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

Or use the convenience script:
```bash
npm run install:all
```

### 2. Set Up Environment Variables

#### Backend (.env in root directory)

Create a `.env` file in the root directory:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/centralign?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
GEMINI_API_KEY=your-gemini-api-key-here
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### Frontend (.env.local in frontend directory)

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Get API Keys

#### MongoDB Atlas
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user
4. Whitelist your IP (or use 0.0.0.0/0 for development)
5. Get connection string and replace in `MONGODB_URI`

#### Google Gemini API
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy to `GEMINI_API_KEY`

#### Cloudinary
1. Go to https://cloudinary.com/users/register_free
2. Sign up for free account
3. Get credentials from dashboard
4. Add to `.env` file

### 4. Start the Application

```bash
# Start both frontend and backend
npm run dev

# Or start separately:
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

### 6. Test the Application

1. **Sign Up**: Create a new account at http://localhost:3000/signup
2. **Generate Form**: Go to Dashboard → New Form
3. **Try a prompt**: "I need a signup form with name, email, and profile picture"
4. **View Form**: Click "View Form" to see the generated form
5. **Submit**: Fill and submit the form
6. **View Submissions**: Go back to dashboard → Submissions

## Troubleshooting

### MongoDB Connection Issues
- Check your connection string format
- Ensure IP is whitelisted in MongoDB Atlas
- Verify database user credentials

### Gemini API Errors
- Verify API key is correct
- Check API quota/rate limits
- Ensure internet connection

### Cloudinary Upload Fails
- Verify all three Cloudinary credentials
- Check file size limits (10MB max)
- Ensure file is an image type

### Port Already in Use
- Change `PORT` in backend `.env`
- Update `NEXT_PUBLIC_API_URL` in frontend `.env.local`

### Frontend Can't Connect to Backend
- Ensure backend is running on port 5000
- Check `NEXT_PUBLIC_API_URL` matches backend URL
- Verify CORS is configured correctly

## Development Tips

1. **Hot Reload**: Both frontend and backend support hot reload
2. **API Testing**: Use Postman or curl to test API endpoints
3. **Database**: Use MongoDB Compass to view database contents
4. **Logs**: Check console for backend logs and browser console for frontend

## Next Steps

- Read the full [README.md](./README.md) for architecture details
- Try different form generation prompts
- Test context-aware memory with multiple forms
- Explore the codebase structure

