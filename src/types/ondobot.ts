/**
 * OndoBot Structured Response Types
 *
 * These types match the structured data returned by OndoBot's Chat API.
 * Used for rich UI rendering of OndoBot responses.
 */

/**
 * Pagination info for list results
 */
export interface PaginationInfo {
  total: number
  showing: number
  hasMore: boolean
}

/**
 * Ownership search result
 */
export interface OwnershipSearchStructured {
  type: 'ownership_search'
  data: {
    results: Array<{
      area: string
      owner: string
      description: string | null
      url: string
      relevanceScore?: number
    }>
  }
  summary: string
  pagination: PaginationInfo
}

/**
 * Owner list result
 */
export interface OwnerListStructured {
  type: 'owner_list'
  data: {
    owners: Array<{
      name: string
      areaCount: number
      topAreas: string[]
    }>
    totalAreas: number
  }
  summary: string
  pagination: PaginationInfo
}

/**
 * Owner areas result
 */
export interface OwnerAreasStructured {
  type: 'owner_areas'
  data: {
    owner: string
    areas: Array<{
      area: string
      description: string | null
      url: string
    }>
  }
  summary: string
  pagination: PaginationInfo
}

/**
 * Ownership created result
 */
export interface OwnershipCreatedStructured {
  type: 'ownership_created'
  data: {
    area: string
    owner: string
    pageUrl: string
    parentName?: string
    description?: string
  }
  summary: string
}

/**
 * Ownership form - returned to show the full ownership creation form
 * Pre-filled with values extracted from natural language request
 */
export interface OwnershipFormStructured {
  type: 'ownership_form'
  data: {
    prefill: {
      area?: string
      owner?: string
      description?: string
      parentSearch?: string
    }
    hierarchy: Array<{
      id: string
      name: string
      fullPath: string
      owner?: string
      parentId?: string
      hasChildren: boolean
    }>
  }
  summary: string
}

/**
 * Ownership parent selection - returned when user needs to select a parent area
 * @deprecated Use OwnershipFormStructured instead for better UX
 */
export interface OwnershipParentSelectionStructured {
  type: 'ownership_parent_selection'
  data: {
    pendingArea: string
    pendingOwner: string
    pendingOwnerSlackId: string
    pendingDescription?: string
    searchQuery: string
    parentMatches: Array<{
      id: string
      name: string
      fullPath: string
      owner?: string
    }>
    totalMatches: number
  }
  summary: string
}

/**
 * Candidate search result
 */
export interface CandidateSearchStructured {
  type: 'candidate_search'
  data: {
    candidates: Array<{
      id: string
      name: string
      email: string | null
      title: string | null
      company: string | null
      profileUrl: string
    }>
  }
  summary: string
  pagination: PaginationInfo
}

/**
 * Candidate profile result
 */
export interface CandidateProfileStructured {
  type: 'candidate_profile'
  data: {
    id: string
    name: string
    email: string | null
    title: string | null
    company: string | null
    location: string | null
    linkedIn: string | null
    phone: string | null
    profileUrl: string
    createdAt?: string
  }
  summary: string
}

/**
 * Recent candidates result
 */
export interface RecentCandidatesStructured {
  type: 'recent_candidates'
  data: {
    candidates: Array<{
      id: string
      name: string
      email: string | null
      title: string | null
      company: string | null
      createdAt: string
      profileUrl: string
    }>
  }
  summary: string
  pagination: PaginationInfo
}

/**
 * Help result
 */
export interface HelpStructured {
  type: 'help'
  data: {
    overview: string
    categories: Array<{
      name: string
      tools: Array<{
        name: string
        description: string
      }>
    }>
    examples: string[]
  }
  summary: string
}

/**
 * Form submission result
 */
export interface FormSubmissionStructured {
  type: 'form_submission'
  data: {
    submitted: boolean
    formType: 'incident_report' | 'project_proposal' | 'issue'
    title: string
    notionPageUrl?: string
  }
  summary: string
}

/**
 * Error result
 */
export interface ErrorStructured {
  type: 'error'
  data: {
    code: string
    message: string
  }
  summary: string
}

/**
 * Union type for all structured result types
 */
export type OndoBotStructuredResult =
  | OwnershipSearchStructured
  | OwnerListStructured
  | OwnerAreasStructured
  | OwnershipCreatedStructured
  | OwnershipFormStructured
  | OwnershipParentSelectionStructured
  | CandidateSearchStructured
  | CandidateProfileStructured
  | RecentCandidatesStructured
  | HelpStructured
  | FormSubmissionStructured
  | ErrorStructured

/**
 * Check if a value is an OndoBot structured result
 */
export function isOndoBotStructuredResult(value: unknown): value is OndoBotStructuredResult {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.type === 'string' &&
    typeof obj.data === 'object' &&
    typeof obj.summary === 'string'
  )
}

/**
 * OndoBot response with optional structured data
 */
export interface OndoBotResponse {
  id: string
  response: string
  structured?: OndoBotStructuredResult
  metadata?: {
    model?: string
    tokensUsed?: number
    toolUsed?: string
  }
}
