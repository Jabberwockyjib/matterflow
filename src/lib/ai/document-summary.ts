import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return getDefaultResult(filename)
    }

    const parsed = JSON.parse(content)
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
