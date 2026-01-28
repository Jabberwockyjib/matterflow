import Anthropic from '@anthropic-ai/sdk'

// Lazily instantiate the client to avoid issues in test environments
let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return anthropicClient
}

/**
 * Strip markdown code blocks from AI response
 * Claude sometimes wraps JSON in ```json ... ```
 */
function stripMarkdownCodeBlock(text: string): string {
  // Remove ```json or ``` at start and ``` at end
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  return cleaned.trim()
}

export interface DocumentSummaryResult {
  documentType: string
  summary: string
  suggestedFolder: string
}

const DOCUMENT_TYPES = [
  'Contract',
  'Employment Agreement',
  'Employee Handbook',
  'Policy Document',
  'Insurance Form',
  'Correspondence',
  'Invoice',
  'Legal Filing',
  'Other',
] as const

const FOLDER_MAPPING: Record<string, string> = {
  'Contract': '01 Source Docs',
  'Employment Agreement': '01 Source Docs',
  'Employee Handbook': '01 Source Docs',
  'Policy Document': '01 Source Docs',
  'Insurance Form': '01 Source Docs',
  'Correspondence': '01 Source Docs',
  'Invoice': '04 Billing & Engagement',
  'Legal Filing': '02 Work Product',
  'Other': '01 Source Docs',
}

/**
 * Generate AI summary of document content
 */
export async function summarizeDocument({
  filename,
  textContent,
}: {
  filename: string
  textContent: string
}): Promise<DocumentSummaryResult> {
  try {
    // Truncate content to avoid token limits
    const truncatedContent = textContent.slice(0, 4000)

    const prompt = `Analyze this document and provide a summary.

Filename: ${filename}

Content preview:
${truncatedContent}

Respond in JSON format:
{
  "documentType": "One of: ${DOCUMENT_TYPES.join(', ')}",
  "summary": "2-3 sentence summary of what this document contains, key parties, and notable terms"
}`

    const response = await getAnthropicClient().messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]?.type === 'text' ? response.content[0].text : null
    if (!content) {
      return getDefaultResult(filename)
    }

    const parsed = JSON.parse(stripMarkdownCodeBlock(content))
    const documentType = DOCUMENT_TYPES.includes(parsed.documentType)
      ? parsed.documentType
      : 'Other'

    return {
      documentType,
      summary: parsed.summary || `Document: ${filename}`,
      suggestedFolder: FOLDER_MAPPING[documentType] || '01 Source Docs',
    }
  } catch (error) {
    console.error('Document summary error:', error)
    return getDefaultResult(filename)
  }
}

function getDefaultResult(filename: string): DocumentSummaryResult {
  return {
    documentType: 'Other',
    summary: `Uploaded document: ${filename}`,
    suggestedFolder: '01 Source Docs',
  }
}
