# DocuGen AI - AI-Assisted Document Authoring Platform

### Local Development

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**
```bash
# Initialize Supabase
npx supabase init

# Link to your project
npx supabase link --project-ref your-project-ref

# Run migrations
npx supabase db push
```

4. **Run development server**
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

### Deployment

#### Frontend Deployment
Deploy to any static hosting platform:
- Vercel: `vercel deploy`
- Netlify: `netlify deploy`
- Custom server: `npm run build` and serve the `dist` folder

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

For edge functions, configure these secrets in your Supabase project:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_API_KEY` (your AI gateway API key)


#### Backend Deployment
Edge functions are automatically deployed through Supabase CLI:
```bash
supabase functions deploy generate-outline
supabase functions deploy generate-content
supabase functions deploy refine-content
```

## Demo Video
<a href="https://drive.google.com/file/d/1WsHzlRW2jjIgNpjnp9K9ODoHXyqoaq5s/view?usp=drivesdk"><img src="public/DemoVideo.png" height = 250px style="border-radius: 5px"/></a>



## Usage Guide

### 1. Registration & Login
- Navigate to the app URL
- Click "Sign up" to create a new account
- Enter email and password
- Login with your credentials

### 2. Creating a Project
- Click "New Project" on the dashboard
- Choose document type (Word or PowerPoint)
- Enter your topic/prompt
- **Option A**: Manually enter section titles
- **Option B**: Click "AI Suggest" to auto-generate outline
- Click "Create Project"

### 3. Generating Content
- On the editor page, click "Generate Content"
- AI will generate content for all sections/slides
- Wait for generation to complete (may take 30-60 seconds)

### 4. Refining Content
- For each section, enter a refinement prompt (e.g., "Make this more technical", "Add statistics")
- Click "Refine" to regenerate that section
- Use Like/Dislike buttons to provide feedback
- Add comments for your own notes

### 5. Exporting Document
- Once satisfied with content, click "Export"
- Choose download location
- File will be saved in the selected format (.docx or .pptx)

## API Endpoints (Edge Functions)

### 1. generate-outline
**Purpose**: Generate AI-suggested section/slide titles
```typescript
POST /functions/v1/generate-outline
Body: {
  topic: string,
  documentType: 'docx' | 'pptx'
}
Response: {
  outline: string[]
}
```

### 2. generate-content
**Purpose**: Generate content for all sections
```typescript
POST /functions/v1/generate-content
Body: {
  projectId: string,
  topic: string,
  documentType: 'docx' | 'pptx',
  sections: Array<{ id: string, title: string }>
}
Response: {
  success: boolean
}
```

### 3. refine-content
**Purpose**: Refine a specific section based on user prompt
```typescript
POST /functions/v1/refine-content
Body: {
  sectionId: string,
  prompt: string,
  currentContent: string,
  title: string
}
Response: {
  success: boolean,
  content: string
}
```

## Code Quality Features

- ✅ TypeScript for type safety
- ✅ ESLint configuration for code quality
- ✅ Modular component architecture
- ✅ Separation of concerns (contexts, hooks, components)
- ✅ Reusable UI components
- ✅ Proper error handling and loading states
- ✅ Toast notifications for user feedback
- ✅ Responsive design for mobile and desktop
- ✅ Security with RLS policies and authentication
- ✅ Clean, readable code with comments

## Security Features

- Email/password authentication
- Row Level Security (RLS) on all database tables
- Protected routes requiring authentication
- Secure API key management
- User data isolation
- CORS headers on edge functions

## Design System

### Colors
- **Primary**: Blue (#3B82F6) - Professional, trustworthy
- **Secondary**: Light gray - Clean backgrounds
- **Accent**: Amber - Call-to-action highlights
- **Success**: Green - Completed states

### Typography
- **Headings**: Lora (serif) - Professional, editorial feel
- **Body**: Inter (sans-serif) - Clean, readable

### Layout
- Professional document-focused aesthetic
- Clean white cards with subtle shadows
- Generous spacing and padding
- Clear visual hierarchy
