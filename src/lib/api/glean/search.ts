/**
 * Glean Search Service
 * Integrates with Glean's Search API for enterprise knowledge search
 */

import type {
  GleanSearchRequest,
  GleanSearchResponse,
  GleanSearchResult,
  GleanCitation,
  GleanServiceConfig,
  GleanSourceType,
} from './types'

export class GleanSearchService {
  private apiKey: string
  private apiUrl: string

  constructor(config?: GleanServiceConfig) {
    this.apiKey = config?.apiKey || process.env.GLEAN_API_KEY || ''
    const url = config?.apiUrl || process.env.GLEAN_API_URL || 'https://api.glean.com/rest/api/v1'
    // Normalize: strip trailing slash to avoid double-slash in URL construction
    this.apiUrl = url.replace(/\/+$/, '')
  }

  private getHeaders(userEmail?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }
    if (userEmail) {
      headers['X-Scio-Actas'] = userEmail
    }
    return headers
  }

  /**
   * Search Glean knowledge base
   */
  async search(request: GleanSearchRequest, userEmail?: string): Promise<GleanSearchResponse> {
    if (!this.apiKey) {
      throw new Error('Glean API key is not configured')
    }

    const response = await fetch(`${this.apiUrl}/search`, {
      method: 'POST',
      headers: this.getHeaders(userEmail),
      body: JSON.stringify({
        query: request.query,
        pageSize: request.pageSize || 10,
        cursor: request.cursor,
        requestOptions: request.requestOptions,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Glean search failed: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Search and convert results to citations format
   */
  async searchWithCitations(
    query: string,
    options?: {
      datasource?: string
      maxResults?: number
      userEmail?: string
    }
  ): Promise<{ citations: GleanCitation[]; totalCount: number }> {
    const searchRequest: GleanSearchRequest = {
      query,
      pageSize: options?.maxResults || 10,
    }

    if (options?.datasource) {
      searchRequest.requestOptions = {
        datasourceFilter: options.datasource,
      }
    }

    const response = await this.search(searchRequest, options?.userEmail)

    const citations = response.results.map((result) =>
      this.resultToCitation(result)
    )

    return {
      citations,
      totalCount: response.totalResultCount || response.results.length,
    }
  }

  /**
   * Convert a search result to a citation
   */
  private resultToCitation(result: GleanSearchResult): GleanCitation {
    const doc = result.document
    const snippet = result.snippets[0]?.snippet || ''

    return {
      id: doc.id,
      title: doc.title,
      url: doc.url,
      snippet: this.cleanSnippet(snippet),
      sourceType: this.mapDatasourceToType(doc.datasource),
      author: doc.author?.name,
      updatedAt: doc.updatedAt,
      datasource: doc.datasource,
    }
  }

  /**
   * Map Glean datasource name to source type
   */
  private mapDatasourceToType(datasource: string): GleanSourceType {
    const mapping: Record<string, GleanSourceType> = {
      confluence: 'confluence',
      'google-drive': 'gdrive',
      gdrive: 'gdrive',
      slack: 'slack',
      github: 'github',
      notion: 'notion',
      jira: 'jira',
      sharepoint: 'sharepoint',
    }

    const normalized = datasource.toLowerCase()
    return mapping[normalized] || 'custom'
  }

  /**
   * Clean up snippet text
   */
  private cleanSnippet(snippet: string): string {
    return snippet
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * List available data sources
   */
  async listDataSources(userEmail?: string): Promise<Array<{ id: string; name: string; type: string }>> {
    if (!this.apiKey) {
      throw new Error('Glean API key is not configured')
    }

    const response = await fetch(`${this.apiUrl}/datasources`, {
      headers: this.getHeaders(userEmail),
    })

    if (!response.ok) {
      throw new Error(`Failed to list data sources: ${response.status}`)
    }

    interface DataSourceResponse {
      datasources: Array<{
        name: string
        displayName: string
        datasourceCategory: string
      }>
    }

    const data: DataSourceResponse = await response.json()

    return data.datasources.map((ds) => ({
      id: ds.name,
      name: ds.displayName || ds.name,
      type: ds.datasourceCategory,
    }))
  }
}

// Singleton instance
let searchService: GleanSearchService | null = null

export function getGleanSearchService(): GleanSearchService {
  if (!searchService) {
    searchService = new GleanSearchService()
  }
  return searchService
}
