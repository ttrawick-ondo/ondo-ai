import type { FileType } from '@/types/chat'

// File extension to MIME type mapping
export const MIME_TYPES: Record<string, string> = {
  // PDFs
  '.pdf': 'application/pdf',

  // Code files
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript',
  '.py': 'text/x-python',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.java': 'text/x-java',
  '.cpp': 'text/x-c++src',
  '.c': 'text/x-csrc',
  '.h': 'text/x-chdr',
  '.hpp': 'text/x-c++hdr',
  '.rb': 'text/x-ruby',
  '.php': 'text/x-php',
  '.swift': 'text/x-swift',
  '.kt': 'text/x-kotlin',
  '.scala': 'text/x-scala',
  '.sh': 'text/x-shellscript',
  '.bash': 'text/x-shellscript',
  '.zsh': 'text/x-shellscript',
  '.sql': 'text/x-sql',
  '.css': 'text/css',
  '.scss': 'text/x-scss',
  '.less': 'text/x-less',
  '.html': 'text/html',
  '.vue': 'text/x-vue',
  '.svelte': 'text/x-svelte',

  // Text files
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.xml': 'text/xml',
  '.csv': 'text/csv',
  '.log': 'text/plain',
  '.env': 'text/plain',
  '.gitignore': 'text/plain',
  '.dockerfile': 'text/plain',

  // Documents
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  // Images (for reference)
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

// Code file extensions for syntax highlighting
export const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java',
  '.cpp', '.c', '.h', '.hpp', '.rb', '.php', '.swift', '.kt',
  '.scala', '.sh', '.bash', '.zsh', '.sql', '.css', '.scss',
  '.less', '.html', '.vue', '.svelte',
])

// Text file extensions
export const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.json', '.yaml', '.yml',
  '.xml', '.csv', '.log', '.env', '.gitignore', '.dockerfile',
])

// Extension to language mapping for syntax highlighting
export const LANGUAGE_MAP: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.sql': 'sql',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.html': 'html',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.md': 'markdown',
  '.markdown': 'markdown',
}

// File size limits in bytes
export const FILE_SIZE_LIMITS: Record<FileType, number> = {
  pdf: 25 * 1024 * 1024,      // 25MB
  code: 5 * 1024 * 1024,      // 5MB
  text: 5 * 1024 * 1024,      // 5MB
  document: 10 * 1024 * 1024, // 10MB
  image: 20 * 1024 * 1024,    // 20MB
}

/**
 * Get the file extension from a filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot).toLowerCase()
}

/**
 * Get the MIME type from a filename
 */
export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename)
  return MIME_TYPES[ext] || 'application/octet-stream'
}

/**
 * Determine the file type from a filename or MIME type
 */
export function getFileType(filename: string, mimeType?: string): FileType {
  const ext = getFileExtension(filename)

  // Check by extension first
  if (ext === '.pdf') return 'pdf'
  if (CODE_EXTENSIONS.has(ext)) return 'code'
  if (TEXT_EXTENSIONS.has(ext)) return 'text'
  if (ext === '.doc' || ext === '.docx') return 'document'
  if (mimeType?.startsWith('image/')) return 'image'

  // Fallback to MIME type
  if (mimeType) {
    if (mimeType === 'application/pdf') return 'pdf'
    if (mimeType.startsWith('text/')) return 'text'
    if (mimeType.includes('javascript') || mimeType.includes('typescript')) return 'code'
    if (mimeType.startsWith('image/')) return 'image'
  }

  return 'text' // Default to text
}

/**
 * Get the programming language from a filename for syntax highlighting
 */
export function getLanguage(filename: string): string | undefined {
  const ext = getFileExtension(filename)
  return LANGUAGE_MAP[ext]
}

/**
 * Check if a file size is within the allowed limit
 */
export function isFileSizeValid(size: number, fileType: FileType): boolean {
  return size <= FILE_SIZE_LIMITS[fileType]
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Check if a file type is supported
 */
export function isSupportedFileType(filename: string): boolean {
  const ext = getFileExtension(filename)
  return ext in MIME_TYPES
}

/**
 * Get icon name for file type
 */
export function getFileIconName(fileType: FileType): string {
  switch (fileType) {
    case 'pdf': return 'FileText'
    case 'code': return 'FileCode'
    case 'document': return 'FileText'
    case 'text': return 'File'
    case 'image': return 'Image'
    default: return 'File'
  }
}

/**
 * Get accepted file extensions for file picker
 */
export function getAcceptedFileTypes(): string {
  return Object.keys(MIME_TYPES).join(',')
}

/**
 * Validate a file for upload
 */
export interface FileValidationResult {
  valid: boolean
  error?: string
  fileType: FileType
  language?: string
}

export function validateFile(file: File): FileValidationResult {
  const fileType = getFileType(file.name, file.type)
  const language = getLanguage(file.name)

  if (!isSupportedFileType(file.name)) {
    return {
      valid: false,
      error: `Unsupported file type: ${getFileExtension(file.name) || 'unknown'}`,
      fileType,
    }
  }

  if (!isFileSizeValid(file.size, fileType)) {
    const limit = FILE_SIZE_LIMITS[fileType]
    return {
      valid: false,
      error: `File too large. Maximum size for ${fileType} files is ${formatFileSize(limit)}`,
      fileType,
    }
  }

  return {
    valid: true,
    fileType,
    language,
  }
}
