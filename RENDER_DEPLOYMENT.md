# Render Deployment Guide

## Step-by-Step Deployment Instructions

### Prerequisites
- ✅ GitHub account connected to Render
- ✅ MongoDB Atlas database ready
- ✅ Gemini API key
- ✅ Cloudinary credentials

---

## Part 1: Deploy Backend (Express API)

### Step 1: Create Backend Web Service

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Click **"New +"** → **"Web Service"**

2. **Connect Repository**
   - Select **"Build and deploy from a Git repository"**
   - Choose your GitHub account
   - Select repository: `codeBunny2022/CentrAlignWebapp`

3. **Configure Backend Service**
   - **Name**: `centralign-backend` (or any name you prefer)
   - **Region**: Choose closest to you (e.g., `Oregon (US West)`)
   - **Branch**: `master`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. **Set Environment Variables**
   Click "Advanced" → "Add Environment Variable" and add:

   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=your-mongodb-connection-string-here
   JWT_SECRET=your-super-secret-jwt-key-min-32-characters
   GEMINI_API_KEY=your-gemini-api-key
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   ```

5. **Deploy**
   - Click **"Create Web Service"**
   - Wait for build to complete (5-10 minutes)
   - Note the URL: `https://centralign-backend.onrender.com` (or similar)

---

## Part 2: Deploy Frontend (Next.js)

### Step 1: Create Frontend Web Service

1. **Go to Render Dashboard**
   - Click **"New +"** → **"Web Service"**

2. **Connect Repository**
   - Select **"Build and deploy from a Git repository"**
   - Choose your GitHub account
   - Select repository: `codeBunny2022/CentrAlignWebapp`

3. **Configure Frontend Service**
   - **Name**: `centralign-frontend` (or any name you prefer)
   - **Region**: Same as backend
   - **Branch**: `master`
   - **Root Directory**: `frontend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. **Set Environment Variables**
   Click "Advanced" → "Add Environment Variable" and add:

   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
   ```

   **Important**: Replace `your-backend-url` with your actual backend URL from Part 1!

5. **Deploy**
   - Click **"Create Web Service"**
   - Wait for build to complete (5-10 minutes)
   - Your app will be live at: `https://centralign-frontend.onrender.com`

---

## Important Notes

### CORS Configuration
The backend CORS is configured to allow all origins. For production, you may want to restrict it to your frontend URL only.

### Free Tier Limitations
- **Render Free Tier**:
  - Services spin down after 15 minutes of inactivity
  - First request after spin-down takes ~30 seconds (cold start)
  - 750 hours/month free (enough for always-on if you have 1 service)

### MongoDB Atlas IP Whitelist
- Add Render's IP ranges or use `0.0.0.0/0` for development
- For production, whitelist specific Render IPs

### Environment Variables
- Never commit `.env` files
- All secrets should be in Render's environment variables
- Update `NEXT_PUBLIC_API_URL` after backend deploys

---

## Troubleshooting

### Backend won't start
- Check build logs in Render dashboard
- Verify all environment variables are set
- Ensure MongoDB IP is whitelisted

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check backend is running (not spun down)
- Check CORS settings in backend

### Build fails
- Check Node version (Render uses Node 18+ by default)
- Verify all dependencies in package.json
- Check build logs for specific errors

---

## After Deployment

1. **Test the application**:
   - Visit your frontend URL
   - Sign up for an account
   - Generate a form
   - Test form submission

2. **Monitor**:
   - Check Render dashboard for logs
   - Monitor MongoDB Atlas for connections
   - Check API health endpoint

3. **Update MongoDB Whitelist**:
   - Go to MongoDB Atlas → Network Access
   - Add Render service IPs or use `0.0.0.0/0` for development

---

## Quick Reference

**Backend URL**: `https://centralign-backend.onrender.com`  
**Frontend URL**: `https://centralign-frontend.onrender.com`  
**API Health Check**: `https://centralign-backend.onrender.com/api/health`

