# Feature: Vision/Image Upload Support

## Overview
Enable users to upload images and have the AI analyze them using OpenAI's vision capabilities and Anthropic's Claude vision.

## Requirements

### 1. Type Definitions
Update `src/types/chat.ts`:
- Extend `Attachment` type with image-specific fields
- Add `ImageContent` type for vision messages
- Add `ContentPart` union type (text | image)

### 2. Image Upload Component
Create `src/components/chat/ImageUpload.tsx`:
- Drag-and-drop image upload
- Paste image from clipboard
- File picker button
- Image preview with remove option
- Support multiple images
- File size validation (max 20MB)
- Format validation (PNG, JPEG, GIF, WebP)

### 3. Image Preview Component
Create `src/components/chat/ImagePreview.tsx`:
- Thumbnail display in chat input
- Full-size preview on click
- Remove button
- Loading state during upload

### 4. Chat Input Updates
Modify `src/components/chat/ChatInput.tsx`:
- Integrate ImageUpload component
- Show attached images before send
- Clear images after sending
- Handle paste events for images

### 5. Message Bubble Updates
Modify `src/components/chat/MessageBubble.tsx`:
- Display images in user messages
- Support image grid layout
- Lightbox for full-size viewing
- Alt text display

### 6. OpenAI Provider Updates
Modify `src/lib/api/providers/openai.ts`:
- Convert messages with images to vision format
- Use `gpt-4-vision-preview` or `gpt-4o` for images
- Handle base64 and URL image formats
- Set `detail` parameter (auto/low/high)

### 7. Anthropic Provider Updates
Modify `src/lib/api/providers/anthropic.ts`:
- Convert images to Claude's vision format
- Support base64 image encoding
- Handle image media types

### 8. API Route Updates
Modify `src/app/api/chat/route.ts`:
- Accept multipart/form-data for images
- Convert images to base64
- Forward to appropriate provider

### 9. Chat Store Updates
Modify `src/stores/chatStore.ts`:
- Handle image attachments in messages
- Track upload progress
- Store image references

## Acceptance Criteria
- [ ] Can drag and drop images into chat
- [ ] Can paste images from clipboard
- [ ] Images display as previews before sending
- [ ] Images appear in conversation history
- [ ] AI can describe and analyze images
- [ ] Works with both OpenAI and Anthropic
- [ ] Proper error handling for invalid files
- [ ] Loading states during upload

## Technical Notes
- Use base64 encoding for API transmission
- Consider image compression for large files
- Implement client-side image resizing if needed
- Cache image data to avoid re-uploads
