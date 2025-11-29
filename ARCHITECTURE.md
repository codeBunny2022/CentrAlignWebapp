# Architecture Deep Dive

## Context-Aware Memory System

### Problem Statement

When a user has generated thousands of forms, we cannot send all form history to the LLM because:


1. **Token Limits**: Exceeds LLM context windows (32K-128K tokens)
2. **Latency**: Processing millions of tokens takes too long
3. **Cost**: API pricing scales with token count
4. **Relevance**: Most forms are irrelevant to current request

### Solution: Semantic Top-K Retrieval

#### Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Generates New Form                  │
│                    "I need an internship form"              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Step 1: Generate Prompt Embedding              │
│  - Convert prompt text to vector embedding (128 dimensions) │
│  - Uses hash-based TF-IDF style embedding (fallback)        │
│  - Production: Use OpenAI/Cohere/Google embeddings          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│        Step 2: Retrieve User's Past Forms from DB           │
│  - Query: { userId, embedding: { $exists: true } }          │
│  - Limit: 1,000 most recent (prevents memory issues)        │
│  - Projection: Only fetch embedding + metadata              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│      Step 3: Calculate Cosine Similarity for Each Form      │
│  - For each form: cosine_similarity(prompt_emb, form_emb)   │
│  - Complexity: O(n) where n = number of forms               │
│  - Time: ~1ms per form (1,000 forms = ~1 second)            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│          Step 4: Select Top-K Most Similar Forms            │
│  - Sort by similarity score (descending)                    │
│  - Take top 5 forms (configurable)                          │
│  - Filter: similarity > 0.1 threshold                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│        Step 5: Extract Context from Top-K Forms             │
│  - Extract: purpose, field names, field types, patterns     │
│  - Build context array with relevant information            │
│  - Example: [{ purpose: "job", fields: ["resume", ...] }]   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│     Step 6: Assemble Context-Aware Prompt for LLM           │
│  System Prompt: "You are a form generator..."               │
│  Context: "Here is relevant user form history: [...]"       │
│  User Request: "I need an internship form..."               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            Step 7: Generate Form Schema via Gemini          │
│  - Send prompt to Gemini Pro API                            │
│  - Receive JSON form schema                                 │
│  - Parse and validate schema                                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│        Step 8: Store Form with Embedding for Future         │
│  - Save schema to MongoDB                                   │
│  - Generate embedding from prompt + summary                 │
│  - Store embedding for future semantic search               │
└─────────────────────────────────────────────────────────────┘
```

### Example: Context Retrieval in Action

#### User's Past Forms (1,000 total)

* 300 job application forms
* 200 survey forms
* 200 medical forms
* 150 college admission forms
* 150 other forms

#### New Request

```
"I need an internship hiring form with resume upload and GitHub link"
```

#### System Behavior


1. **Embedding Generation**: Converts prompt to vector
2. **Similarity Calculation**:
   * Job forms: 0.85 similarity (high)
   * Survey forms: 0.12 similarity (low)
   * Medical forms: 0.08 similarity (very low)
   * College forms: 0.15 similarity (low)
3. **Top-K Selection**: Selects 5 job application forms
4. **Context Assembly**:

   ```json
   [
     {
       "purpose": "job",
       "fields": ["name", "email", "resume", "portfolio"],
       "schema": { /* job form pattern */ }
     },
     // ... 4 more similar job forms
   ]
   ```
5. **LLM Generation**: Uses job form patterns to generate internship form
6. **Result**: Internship form follows job form conventions (resume field, portfolio links, etc.)

### Performance Metrics

| Metric | Value | Notes |
|----|----|----|
| Forms Retrieved | 1,000 max | Prevents memory overflow |
| Similarity Calculation | \~1ms/form | O(n) complexity |
| Top-K Selection | 5 forms | Configurable, optimal for context |
| Context Size | \~2-5K tokens | Manageable for LLM |
| Total Latency | +200-500ms | Acceptable for UX |
| Token Savings | 99%+ | vs sending all forms |

### Scalability Analysis

#### Current Implementation (MongoDB + In-Memory Search)

**Works Well For:**

* < 10,000 forms per user
* < 100 concurrent users
* Low-frequency form generation

**Bottlenecks:**

* In-memory similarity calculation: O(n) per request
* MongoDB query: Limited to 1,000 forms
* No distributed caching

#### Production Recommendation (Pinecone)

**Benefits:**

* Sub-100ms search with millions of vectors
* Automatic scaling
* Built-in similarity search optimization
* Filter by metadata (userId, purpose, etc.)

**Implementation:**

```typescript
// Store embeddings in Pinecone
await pinecone.upsert({
  id: formId,
  values: embedding,
  metadata: { userId, purpose, summary, createdAt }
});

// Query top-K
const results = await pinecone.query({
  vector: promptEmbedding,
  topK: 5,
  filter: { userId: { $eq: userId } },
  includeMetadata: true
});
```

**Performance:**

* Search time: < 100ms (regardless of form count)
* Supports: Millions of forms
* Cost: \~$70/month for 1M vectors

### Database Design

#### Form Collection Indexes

```javascript
// Compound index for user queries
db.forms.createIndex({ userId: 1, createdAt: -1 });

// Unique index for public access
db.forms.createIndex({ shareableId: 1 }, { unique: true });

// Sparse index for embedding queries
db.forms.createIndex({ embedding: 1 }, { sparse: true });
```

#### Query Patterns


1. **Get User Forms**: `{ userId, createdAt: -1 }` → Uses compound index
2. **Public Form Access**: `{ shareableId }` → Uses unique index
3. **Embedding Search**: `{ userId, embedding: { $exists: true } }` → Uses sparse index + userId

### Caching Strategy (Future Enhancement)

```typescript
// Cache top-K results for common prompts
const cacheKey = `forms:${userId}:${hashPrompt(prompt)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

// ... perform search ...

await redis.setex(cacheKey, 3600, JSON.stringify(results)); // 1 hour TTL
```

**Benefits:**

* Reduce database queries
* Faster response for repeated prompts
* Lower API costs

### Token Management

#### Context Size Calculation

```
System Prompt:        ~500 tokens
Context (5 forms):     ~2,500 tokens (500/form)
User Request:         ~50 tokens
Response Schema:       ~1,000 tokens
─────────────────────────────────
Total:                ~4,050 tokens
```

**vs Full Context:**

```
System Prompt:        ~500 tokens
All Forms (1,000):    ~500,000 tokens
User Request:         ~50 tokens
─────────────────────────────────
Total:                ~500,550 tokens (EXCEEDS LIMIT)
```

**Savings: 99.2% token reduction**

## Form Generation Prompt Engineering

### Base System Prompt

```
You are an intelligent form schema generator. Your task is to convert 
natural language requests into structured JSON form schemas.

Form fields can have the following types:
- text: Single-line text input
- email: Email input with validation
- number: Numeric input
- textarea: Multi-line text input
- select: Dropdown selection
- checkbox: Multiple selection checkboxes
- radio: Single selection radio buttons
- file: File upload (for images, documents, etc.)
- date: Date picker

Each field should have:
- id: Unique identifier (camelCase)
- type: Field type from above
- label: Human-readable label
- name: Field name (camelCase)
- placeholder: Optional placeholder text
- required: Boolean indicating if field is required
- validation: Optional validation rules
- options: Array of options for select/radio/checkbox types
- defaultValue: Optional default value

Return ONLY valid JSON, no markdown, no explanations.
```

### Context Injection

```
Here is relevant user form history for reference:
[
  { "purpose": "Job form", "fields": ["name","email","resume","photo"], ... },
  { "purpose": "Career form", "fields": ["portfolio","github"], ... }
]

Use patterns from similar forms to maintain consistency.
```

### User Request

```
I need an internship hiring form with resume upload and GitHub link.
```

### Expected Output

```json
{
  "title": "Internship Application Form",
  "description": "Apply for internship positions",
  "fields": [
    {
      "id": "fullName",
      "type": "text",
      "label": "Full Name",
      "name": "fullName",
      "required": true
    },
    {
      "id": "email",
      "type": "email",
      "label": "Email Address",
      "name": "email",
      "required": true
    },
    {
      "id": "resume",
      "type": "file",
      "label": "Resume",
      "name": "resume",
      "required": true,
      "validation": {
        "acceptedTypes": ["application/pdf"]
      }
    },
    {
      "id": "githubLink",
      "type": "text",
      "label": "GitHub Profile",
      "name": "githubLink",
      "placeholder": "https://github.com/username"
    }
  ]
}
```

## Security Architecture

### Authentication Flow

```
1. User signs up → Password hashed with bcrypt
2. JWT token generated → Stored in localStorage
3. Token sent in Authorization header → Backend validates
4. Token expires after 7 days → User must re-login
```

### Authorization

* **Public Routes**: `/form/[shareableId]`, `/api/forms/share/:id`
* **Protected Routes**: All `/api/forms/*` (except share), `/api/submissions/*`
* **Middleware**: `authenticate` middleware validates JWT on protected routes

### File Upload Security

* **Type Validation**: Only image MIME types allowed
* **Size Limits**: 10MB per file
* **Storage**: Cloudinary (secure URLs, CDN)
* **No Local Storage**: Files never stored on server

## API Design

### RESTful Endpoints

```
POST   /api/auth/signup          # Create user
POST   /api/auth/login           # Authenticate user

POST   /api/forms/generate       # Generate form (auth)
GET    /api/forms                # List user forms (auth)
GET    /api/forms/:id            # Get form by ID (auth)
GET    /api/forms/share/:id      # Get form by shareable ID (public)
DELETE /api/forms/:id            # Delete form (auth)

POST   /api/submissions          # Submit form (public)
GET    /api/submissions          # Get all submissions (auth)
GET    /api/submissions/form/:id # Get form submissions (auth)

POST   /api/upload/image         # Upload single image
POST   /api/upload/images        # Upload multiple images
```

### Error Handling

```typescript
// Standard error response
{
  "error": "Error message",
  "details": "Additional details (dev only)"
}

// Success response
{
  "message": "Success message",
  "data": { /* response data */ }
}
```

## Frontend Architecture

### Component Structure

```
app/
├── layout.tsx              # Root layout with Toaster
├── page.tsx                # Landing page
├── login/                  # Authentication
├── signup/
├── dashboard/              # Protected routes
│   ├── page.tsx           # Forms list
│   ├── generate/          # Form generation
│   └── submissions/[id]/   # View submissions
└── form/[shareableId]/     # Public form renderer
```

### State Management

* **Local State**: React hooks (`useState`, `useEffect`)
* **API State**: Axios interceptors for auth
* **Form State**: React Hook Form (future enhancement)

### Routing

* **Next.js App Router**: File-based routing
* **Protected Routes**: Client-side token check
* **Public Routes**: No authentication required

## Deployment Considerations

### Environment Variables

**Backend:**

* `MONGODB_URI`: Production MongoDB connection
* `JWT_SECRET`: Strong secret (32+ chars)
* `GEMINI_API_KEY`: API key with quota
* `CLOUDINARY_*`: Production credentials

**Frontend:**

* `NEXT_PUBLIC_API_URL`: Backend API URL

### Build Process

```bash
# Backend
cd backend && npm run build
# Output: dist/ directory

# Frontend
cd frontend && npm run build
# Output: .next/ directory
```

### Recommended Hosting

* **Frontend**: Vercel (optimized for Next.js)
* **Backend**: Railway, Render, or AWS Elastic Beanstalk
* **Database**: MongoDB Atlas (already configured)
* **File Storage**: Cloudinary (already configured)

### Monitoring

* **API Health**: `/api/health` endpoint
* **Error Logging**: Console logs (enhance with Sentry)
* **Performance**: Add timing logs for form generation


---

This architecture provides a solid foundation that can scale from hundreds to millions of forms with proper infrastructure upgrades.