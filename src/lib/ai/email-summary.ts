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

export interface EmailSummaryResult {
  summary: string
  actionNeeded: boolean
}

/**
 * Generate AI summary of email content
 */
export async function summarizeEmail({
  subject,
  snippet,
  direction,
}: {
  subject: string
  snippet: string
  direction: 'sent' | 'received'
}): Promise<EmailSummaryResult> {
  try {
    const prompt = `Summarize this ${direction} email in 1-2 sentences. Also indicate if action is needed.

Subject: ${subject}
Preview: ${snippet}

Respond in JSON format:
{
  "summary": "Brief summary of what this email is about",
  "actionNeeded": true/false (does the recipient need to respond or take action?)
}`

    const response = await getAnthropicClient().messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]?.type === 'text' ? response.content[0].text : null
    if (!content) {
      return { summary: snippet.slice(0, 100), actionNeeded: false }
    }

    const parsed = JSON.parse(stripMarkdownCodeBlock(content))
    return {
      summary: parsed.summary || snippet.slice(0, 100),
      actionNeeded: Boolean(parsed.actionNeeded),
    }
  } catch (error) {
    console.error('Email summary error:', error)
    // Fallback to snippet if AI fails
    return { summary: snippet.slice(0, 100), actionNeeded: false }
  }
}
