'use client'

import { useState } from 'react'
import {
  User,
  Users,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  FileText,
  Calendar,
  Building,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  OndoBotStructuredResult,
  OwnershipSearchStructured,
  OwnerListStructured,
  OwnerAreasStructured,
  CandidateSearchStructured,
  CandidateProfileStructured,
  RecentCandidatesStructured,
  HelpStructured,
  FormSubmissionStructured,
  ErrorStructured,
  PaginationInfo,
} from '@/types/ondobot'

interface OndoBotResultsProps {
  structured: OndoBotStructuredResult
  className?: string
}

/**
 * Main component that routes to the appropriate result renderer
 */
export function OndoBotResults({ structured, className }: OndoBotResultsProps) {
  switch (structured.type) {
    case 'ownership_search':
      return <OwnershipSearchResult data={structured} className={className} />
    case 'owner_list':
      return <OwnerListResult data={structured} className={className} />
    case 'owner_areas':
      return <OwnerAreasResult data={structured} className={className} />
    case 'candidate_search':
      return <CandidateSearchResult data={structured} className={className} />
    case 'candidate_profile':
      return <CandidateProfileResult data={structured} className={className} />
    case 'recent_candidates':
      return <RecentCandidatesResult data={structured} className={className} />
    case 'help':
      return <HelpResult data={structured} className={className} />
    case 'form_submission':
      return <FormSubmissionResult data={structured} className={className} />
    case 'error':
      return <ErrorResult data={structured} className={className} />
    default:
      return null
  }
}

/**
 * Pagination footer component
 */
function PaginationFooter({ pagination }: { pagination: PaginationInfo }) {
  if (pagination.total === 0) return null

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
      <span>
        Showing {pagination.showing} of {pagination.total}
      </span>
      {pagination.hasMore && (
        <span className="text-primary">More results available</span>
      )}
    </div>
  )
}

/**
 * Ownership Search Results
 */
function OwnershipSearchResult({
  data,
  className,
}: {
  data: OwnershipSearchStructured
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const results = data.data.results
  const displayCount = expanded ? results.length : Math.min(3, results.length)

  if (results.length === 0) {
    return (
      <Card className={cn('bg-muted/50', className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No ownership results found</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Ownership Results
          </CardTitle>
          <Badge variant="secondary">{data.pagination.total} found</Badge>
        </div>
        <CardDescription>{data.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.slice(0, displayCount).map((result, idx) => (
          <div
            key={idx}
            className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="space-y-1 flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{result.area}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{result.owner}</span>
              </div>
              {result.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {result.description}
                </p>
              )}
            </div>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 p-1.5 rounded-md hover:bg-background transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        ))}

        {results.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {results.length - 3} more
              </>
            )}
          </Button>
        )}

        <PaginationFooter pagination={data.pagination} />
      </CardContent>
    </Card>
  )
}

/**
 * Owner List Results
 */
function OwnerListResult({
  data,
  className,
}: {
  data: OwnerListStructured
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const owners = data.data.owners
  const displayCount = expanded ? owners.length : Math.min(5, owners.length)

  if (owners.length === 0) {
    return (
      <Card className={cn('bg-muted/50', className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No ownership data available</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Ownership Overview
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{data.pagination.total} owners</Badge>
            <Badge variant="secondary">{data.data.totalAreas} areas</Badge>
          </div>
        </div>
        <CardDescription>{data.summary}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {owners.slice(0, displayCount).map((owner, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{owner.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {owner.topAreas.slice(0, 2).join(', ')}
                    {owner.areaCount > 2 && ` +${owner.areaCount - 2} more`}
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {owner.areaCount} areas
              </Badge>
            </div>
          ))}
        </div>

        {owners.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {owners.length - 5} more
              </>
            )}
          </Button>
        )}

        <PaginationFooter pagination={data.pagination} />
      </CardContent>
    </Card>
  )
}

/**
 * Owner Areas Results
 */
function OwnerAreasResult({
  data,
  className,
}: {
  data: OwnerAreasStructured
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const areas = data.data.areas
  const displayCount = expanded ? areas.length : Math.min(5, areas.length)

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            {data.data.owner}
          </CardTitle>
          <Badge variant="secondary">{data.pagination.total} areas</Badge>
        </div>
        <CardDescription>{data.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {areas.slice(0, displayCount).map((area, idx) => (
          <div
            key={idx}
            className="flex items-start justify-between p-2 rounded-lg bg-muted/50"
          >
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="font-medium text-sm">{area.area}</div>
              {area.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {area.description}
                </p>
              )}
            </div>
            <a
              href={area.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 p-1 rounded-md hover:bg-background transition-colors shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        ))}

        {areas.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {areas.length - 5} more
              </>
            )}
          </Button>
        )}

        <PaginationFooter pagination={data.pagination} />
      </CardContent>
    </Card>
  )
}

/**
 * Candidate Search Results
 */
function CandidateSearchResult({
  data,
  className,
}: {
  data: CandidateSearchStructured
  className?: string
}) {
  const candidates = data.data.candidates

  if (candidates.length === 0) {
    return (
      <Card className={cn('bg-muted/50', className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No candidates found</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Candidates
          </CardTitle>
          <Badge variant="secondary">{data.pagination.total} found</Badge>
        </div>
        <CardDescription>{data.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="space-y-1 flex-1 min-w-0">
              <div className="font-medium text-sm">{candidate.name}</div>
              {(candidate.title || candidate.company) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {candidate.title && <span>{candidate.title}</span>}
                  {candidate.title && candidate.company && <span>at</span>}
                  {candidate.company && (
                    <span className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {candidate.company}
                    </span>
                  )}
                </div>
              )}
              {candidate.email && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span>{candidate.email}</span>
                </div>
              )}
            </div>
            <a
              href={candidate.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 p-1.5 rounded-md hover:bg-background transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        ))}

        <PaginationFooter pagination={data.pagination} />
      </CardContent>
    </Card>
  )
}

/**
 * Candidate Profile Result
 */
function CandidateProfileResult({
  data,
  className,
}: {
  data: CandidateProfileStructured
  className?: string
}) {
  const profile = data.data

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{profile.name}</CardTitle>
            {(profile.title || profile.company) && (
              <CardDescription>
                {profile.title}
                {profile.title && profile.company && ' at '}
                {profile.company}
              </CardDescription>
            )}
          </div>
          <a
            href={profile.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-md hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {profile.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${profile.email}`} className="text-primary hover:underline">
                {profile.email}
              </a>
            </div>
          )}
          {profile.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{profile.phone}</span>
            </div>
          )}
          {profile.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.linkedIn && (
            <div className="flex items-center gap-2 text-sm">
              <Linkedin className="h-4 w-4 text-muted-foreground" />
              <a
                href={profile.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                LinkedIn Profile
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Recent Candidates Results
 */
function RecentCandidatesResult({
  data,
  className,
}: {
  data: RecentCandidatesStructured
  className?: string
}) {
  const candidates = data.data.candidates

  if (candidates.length === 0) {
    return (
      <Card className={cn('bg-muted/50', className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No recent candidates</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Recent Candidates
          </CardTitle>
          <Badge variant="secondary">{data.pagination.showing} shown</Badge>
        </div>
        <CardDescription>{data.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="space-y-1 flex-1 min-w-0">
              <div className="font-medium text-sm">{candidate.name}</div>
              {candidate.title && (
                <div className="text-xs text-muted-foreground">{candidate.title}</div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {candidate.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {candidate.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(candidate.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <a
              href={candidate.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 p-1.5 rounded-md hover:bg-background transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        ))}

        <PaginationFooter pagination={data.pagination} />
      </CardContent>
    </Card>
  )
}

/**
 * Help Result
 */
function HelpResult({
  data,
  className,
}: {
  data: HelpStructured
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          OndoBot Help
        </CardTitle>
        <CardDescription>{data.data.overview}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.data.categories.map((category, idx) => (
          <div key={idx}>
            <h4 className="font-medium text-sm mb-2">{category.name}</h4>
            <div className="space-y-1">
              {category.tools.map((tool, toolIdx) => (
                <div
                  key={toolIdx}
                  className="text-xs text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-primary">•</span>
                  <span>{tool.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <h4 className="font-medium text-sm mb-2">Try Asking</h4>
          <div className="flex flex-wrap gap-2">
            {data.data.examples.map((example, idx) => (
              <Badge key={idx} variant="outline" className="font-normal">
                {example}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Form Submission Result
 */
function FormSubmissionResult({
  data,
  className,
}: {
  data: FormSubmissionStructured
  className?: string
}) {
  const formLabels: Record<string, string> = {
    incident_report: 'Incident Report',
    project_proposal: 'Project Proposal',
    issue: 'Issue',
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {data.data.submitted ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <CardTitle className="text-base">
            {formLabels[data.data.formType]} {data.data.submitted ? 'Submitted' : 'Failed'}
          </CardTitle>
        </div>
        <CardDescription>{data.summary}</CardDescription>
      </CardHeader>
      {data.data.notionPageUrl && (
        <CardContent>
          <a
            href={data.data.notionPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <FileText className="h-4 w-4" />
            View in Notion
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Error Result
 */
function ErrorResult({
  data,
  className,
}: {
  data: ErrorStructured
  className?: string
}) {
  return (
    <Card className={cn('border-destructive/50 bg-destructive/5', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-base text-destructive">Error</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{data.data.message}</p>
        {data.data.code && (
          <Badge variant="outline" className="mt-2 font-mono text-xs">
            {data.data.code}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

export default OndoBotResults
