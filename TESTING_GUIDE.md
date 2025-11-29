# Local Testing Guide

## Step-by-Step Testing Instructions

### Step 1: Install Dependencies

Open a terminal in the project root and run:

```bash
# Install all dependencies (root, frontend, and backend)
npm run install:all
```

This will install:
- Root dependencies (concurrently for running both servers)
- Frontend dependencies (Next.js, React, etc.)
- Backend dependencies (Express, MongoDB, etc.)

**Expected time:** 2-5 minutes depending on your internet speed.

---

### Step 2: Set Up Environment Variables

#### 2.1 Create Backend `.env` file

Create a `.env` file in the **root directory** (`/home/chirag/Documents/Projects/CentrAlignWebApp/.env`):

```env
# Backend Configuration
PORT=5000
NODE_ENV=development

# MongoDB Atlas (your connection string)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/centralign?retryWrites=true&w=majority

# JWT Secret (generate a random string, at least 32 characters)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars

# Google Gemini API Key (get from https://makersuite.google.com/app/apikey)
# For testing, you can use a placeholder, but form generation won't work without it
GEMINI_API_KEY=your-gemini-api-key-here

# Cloudinary (get from https://cloudinary.com)
# For testing, you can use placeholders, but image uploads won't work without it
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### 2.2 Create Frontend `.env.local` file

Create a `.env.local` file in the **frontend directory** (`/home/chirag/Documents/Projects/CentrAlignWebApp/frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

#### 2.3 Verify MongoDB IP Whitelist

**IMPORTANT:** Make sure your IP is whitelisted in MongoDB Atlas:
1. Go to https://cloud.mongodb.com
2. Network Access → Add IP Address → Add Current IP Address

---

### Step 3: Start the Application

#### Option A: Run Both Servers Together (Recommended)

From the root directory:

```bash
npm run dev
```

This starts both frontend (port 3000) and backend (port 5000) simultaneously.

#### Option B: Run Servers Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Expected Output:**

Backend:
```
✅ Connected to MongoDB
🚀 Server running on port 5000
```

Frontend:
```
  ▲ Next.js 15.0.0
  - Local:        http://localhost:3000
  - ready started server on 0.0.0.0:3000
```

---

### Step 4: Test the Application

#### Test 1: Health Check

Open your browser and visit:
```
http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "CentrAlign API is running"
}
```

✅ **If you see this, backend is working!**

---

#### Test 2: Frontend Landing Page

Open your browser and visit:
```
http://localhost:3000
```

**Expected:** You should see the CentrAlign landing page with "Login" and "Sign Up" buttons.

✅ **If you see this, frontend is working!**

---

#### Test 3: User Registration

1. Click **"Sign Up"** on the landing page
2. Enter:
   - Email: `test@example.com`
   - Password: `test1234` (minimum 6 characters)
3. Click **"Sign Up"**

**Expected:**
- Success toast notification
- Redirected to dashboard
- Dashboard shows "No forms yet"

✅ **If this works, authentication is working!**

**Check MongoDB:**
- Go to MongoDB Atlas → Browse Collections
- You should see a `users` collection with your new user

---

#### Test 4: User Login

1. Logout (click "Logout" in dashboard)
2. Click **"Login"**
3. Enter:
   - Email: `test@example.com`
   - Password: `test1234`
4. Click **"Login"**

**Expected:**
- Success toast notification
- Redirected to dashboard

✅ **If this works, login is working!**

---

#### Test 5: Generate a Form (Requires Gemini API Key)

**Prerequisites:** You need a valid `GEMINI_API_KEY` in your `.env` file.

1. In the dashboard, click **"New Form"** or **"Generate Form"**
2. Enter a prompt, for example:
   ```
   I need a signup form with name, email, age, and profile picture.
   ```
3. Click **"Generate Form"**

**Expected:**
- Loading state while generating
- Success toast notification
- Redirected to dashboard
- New form card appears in dashboard

✅ **If this works, AI form generation is working!**

**Check MongoDB:**
- Go to MongoDB Atlas → Browse Collections
- You should see a `forms` collection with your generated form
- The form should have a `shareableId` field

---

#### Test 6: View Generated Form

1. In the dashboard, find your generated form
2. Click **"View Form"** (opens in new tab)

**Expected:**
- Public form page loads
- Shows form title and description
- Displays all form fields (name, email, age, file upload, etc.)

✅ **If this works, dynamic form rendering is working!**

---

#### Test 7: Submit a Form

1. On the public form page, fill out the form:
   - Enter name: `John Doe`
   - Enter email: `john@example.com`
   - Enter age: `25`
   - Upload a profile picture (optional, requires Cloudinary)
2. Click **"Submit"**

**Expected:**
- Success message: "Thank you! Your submission has been received successfully."
- Form data is saved

✅ **If this works, form submission is working!**

**Check MongoDB:**
- Go to MongoDB Atlas → Browse Collections
- You should see a `submissions` collection with your submission

---

#### Test 8: View Submissions

1. Go back to dashboard
2. Click **"Submissions"** on your form card
3. View the submission details

**Expected:**
- Submissions page loads
- Shows submission data (name, email, age)
- Shows uploaded images (if any)

✅ **If this works, submission viewing is working!**

---

#### Test 9: Context-Aware Memory (Advanced)

This tests the semantic memory system:

1. Generate multiple forms with similar purposes:
   - Form 1: `"I need a job application form with resume upload"`
   - Form 2: `"Create a job application form with cover letter"`
   - Form 3: `"I need a customer survey form with rating"`
   - Form 4: `"Create a feedback form with comments"`

2. Generate a new form:
   ```
   I need an internship application form with resume and portfolio
   ```

**Expected:**
- The system should retrieve Forms 1 and 2 (job-related) as context
- The new form should follow similar patterns to job forms
- Forms 3 and 4 (survey-related) should NOT be used

✅ **If this works, context-aware memory is working!**

**How to verify:**
- Check backend console logs for "contextUsed: 2" or similar
- The generated form should have similar fields to job forms

---

### Step 5: Test Image Upload (Requires Cloudinary)

**Prerequisites:** You need valid Cloudinary credentials in your `.env` file.

1. Generate a form with file upload:
   ```
   I need a profile form with name, email, and profile picture upload
   ```

2. On the public form, upload an image
3. Submit the form

**Expected:**
- Image uploads successfully
- Image URL is stored in submission
- Image appears in submissions view

✅ **If this works, image upload is working!**

---

## Troubleshooting

### Issue: "Cannot connect to MongoDB"

**Symptoms:**
- Backend shows: `❌ MongoDB connection error`
- Error: `MongoServerError: IP not whitelisted`

**Solution:**
1. Go to MongoDB Atlas → Network Access
2. Add your current IP address
3. Wait 1-2 minutes for changes to propagate
4. Restart backend server

---

### Issue: "Frontend can't connect to backend"

**Symptoms:**
- Frontend shows network errors
- API calls fail

**Solution:**
1. Verify backend is running on port 5000
2. Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
3. Check browser console for CORS errors
4. Verify backend CORS is configured correctly

---

### Issue: "Form generation fails"

**Symptoms:**
- Error: "Gemini API key not configured"
- Error: "Failed to generate form schema"

**Solution:**
1. Get a Gemini API key from https://makersuite.google.com/app/apikey
2. Add it to `.env` file: `GEMINI_API_KEY=your-key-here`
3. Restart backend server
4. Check API quota/rate limits

---

### Issue: "Image upload fails"

**Symptoms:**
- Error: "Upload failed"
- Error: "Cloudinary configuration error"

**Solution:**
1. Get Cloudinary credentials from https://cloudinary.com
2. Add to `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```
3. Restart backend server

---

### Issue: "Port already in use"

**Symptoms:**
- Error: `EADDRINUSE: address already in use :::5000`

**Solution:**
1. Find process using port: `lsof -i :5000` (Linux/Mac) or `netstat -ano | findstr :5000` (Windows)
2. Kill the process or change PORT in `.env`
3. Update `NEXT_PUBLIC_API_URL` if you change backend port

---

### Issue: "Dependencies not installing"

**Symptoms:**
- npm errors during installation
- Missing modules

**Solution:**
1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` folders:
   ```bash
   rm -rf node_modules frontend/node_modules backend/node_modules
   ```
3. Reinstall: `npm run install:all`

---

## Quick Test Checklist

Use this checklist to verify all features:

- [ ] Backend health check works (`/api/health`)
- [ ] Frontend loads (`http://localhost:3000`)
- [ ] User can sign up
- [ ] User can login
- [ ] User can logout
- [ ] Form generation works (with Gemini API key)
- [ ] Generated form appears in dashboard
- [ ] Public form link works (`/form/[shareableId]`)
- [ ] Form can be submitted
- [ ] Submissions appear in dashboard
- [ ] Form can be deleted
- [ ] Image upload works (with Cloudinary)
- [ ] Context-aware memory works (multiple similar forms)

---

## Testing Without API Keys

You can test most features without API keys:

✅ **Works without API keys:**
- Authentication (signup/login)
- Dashboard navigation
- Form viewing
- Form submission (without images)
- Submission viewing

❌ **Requires API keys:**
- Form generation (needs Gemini API key)
- Image upload (needs Cloudinary)

---

## Next Steps After Testing

1. **Get API Keys:**
   - Gemini API: https://makersuite.google.com/app/apikey
   - Cloudinary: https://cloudinary.com/users/register_free

2. **Test Full Workflow:**
   - Generate multiple forms
   - Test context-aware memory
   - Test image uploads
   - Test form submissions

3. **Check MongoDB:**
   - Verify collections are created
   - Check data is stored correctly
   - Verify indexes are created

4. **Review Logs:**
   - Backend console for API calls
   - Browser console for frontend errors
   - MongoDB Atlas logs for connection issues

---

## Success Indicators

You'll know everything is working when:

1. ✅ Backend connects to MongoDB
2. ✅ Frontend loads without errors
3. ✅ You can create an account and login
4. ✅ You can generate a form
5. ✅ You can view and submit the form
6. ✅ You can see submissions in dashboard
7. ✅ Images upload successfully (if Cloudinary configured)

---

Happy Testing! 🚀

