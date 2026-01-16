# Feature: File Attachments for Conversations

## Overview
Enable users to upload and attach files (PDFs, documents, code files) to conversations for AI analysis.

## Requirements

### 1. Type Definitions
Update `src/types/chat.ts`:
```typescript
interface FileAttachment {
  id: string
  name: string
  type: 'pdf' | 'document' | 'code' | 'text' | 'image'
  mimeType: string
  size: number
  url?: string
  content?: string // For text files
  status: 'uploading' | 'ready' | 'error'
  error?: string
}
```

### 2. File Upload Component
Create `src/components/chat/FileUpload.tsx`:
- Drag-and-drop zone
- File picker button (📎 icon)
- Support multiple files
- Progress indicator for uploads
- File type validation
- Size limit enforcement (25MB)

### 3. File Preview Component
Create `src/components/chat/FilePreview.tsx`:
- File icon by type
- File name and size
- Remove button
- Error state display
- Click to expand/preview

### 4. Supported File Types
Create `src/lib/files/types.ts`:
- PDF extraction utilities
- Code file detection
- Document parsing config
- MIME type mapping

### 5. Chat Input Updates
Modify `src/components/chat/ChatInput.tsx`:
- Integrate FileUpload
- Show attached files
- Handle file removal
- Validate before send

### 6. Message Bubble Updates
Modify `src/components/chat/MessageBubble.tsx`:
- Display attached files
- File download link
- File preview for text/code
- PDF page indicator

### 7. File Processing Service
Create `src/lib/files/processor.ts`:
- Extract text from PDFs (using pdf-parse)
- Read code files
- Process document formats
- Generate file summaries

### 8. API Routes
Create `src/app/api/files/route.ts`:
- POST: Upload file
- GET: Retrieve file
- DELETE: Remove file

Create `src/app/api/files/[fileId]/route.ts`:
- GET: Download specific file
- DELETE: Remove specific file

### 9. Provider Updates
Update providers to handle file content:
- OpenAI: Include file text in context
- Anthropic: Format as document context
- Glean: Use file content in query

### 10. Chat Store Updates
Modify `src/stores/chatStore.ts`:
- Add `attachments` to message state
- Track upload progress
- Handle file references
- Clean up on conversation delete

## Acceptance Criteria
- [ ] Can drag and drop files
- [ ] Can select files via picker
- [ ] Progress shown during upload
- [ ] Files display in chat
- [ ] AI can reference file contents
- [ ] PDF text extraction works
- [ ] Code files syntax highlighted
- [ ] Error handling for unsupported types
- [ ] Files persist with conversation

## Supported File Types
| Type | Extensions | Max Size |
|------|------------|----------|
| PDF | .pdf | 25MB |
| Code | .js, .ts, .py, .go, .rs, .java, .cpp, .c, .rb | 5MB |
| Text | .txt, .md, .json, .yaml, .xml | 5MB |
| Document | .doc, .docx (future) | 10MB |

## Technical Notes
- Use client-side file reading for text files
- Implement chunking for large PDFs
- Consider summarization for very long files
- Add file content to system context
- Rate limit file uploads
