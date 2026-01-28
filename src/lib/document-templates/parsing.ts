import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import type { ParsedTemplate } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Strip markdown code blocks from AI response
 * Claude sometimes wraps JSON in ```json ... ``` despite instructions
 */
function stripMarkdownCodeBlock(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

export async function parseDocumentTemplate(
  fileBuffer: Buffer,
  fileName: string
): Promise<ParsedTemplate> {
  // Extract text from DOCX
  const { value: rawText } = await mammoth.extractRawText({ buffer: fileBuffer });
  const { value: htmlContent } = await mammoth.convertToHtml({ buffer: fileBuffer });

  // Use Claude to analyze the document
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Analyze this legal document template and extract its structure.

IMPORTANT: Do NOT modify any wording. Only analyze and extract.

Document content:
---
${rawText}
---

Return a JSON object with:
1. suggestedName: A short name for this template
2. suggestedCategory: One of "consent", "billing", "privacy", "engagement", "other"
3. sections: Array of sections, each with:
   - name: Section heading or "Main Content" if no heading
   - content: The exact text content (DO NOT MODIFY)
   - suggestedConditional: true if this section might be conditional (e.g., telehealth-specific)
   - suggestedConditionField: If conditional, what field would control it
   - placeholders: Array of detected placeholders in this section
4. allPlaceholders: Array of all unique placeholders found, each with:
   - original: The exact text as it appears (e.g., "{{client_name}}", "[PRACTICE NAME]", "___________")
   - suggestedFieldName: snake_case field name
   - suggestedLabel: Human-readable label
   - suggestedType: One of "text", "multi_line", "date", "currency", "number", "select", "checkbox"
   - suggestedOutputType: "merge" if lawyer fills, "fillable" if patient fills in PDF
   - context: A few words of surrounding text for context

Return ONLY valid JSON, no markdown.`,
      },
    ],
  });

  // Parse Claude's response
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  try {
    const cleanedText = stripMarkdownCodeBlock(content.text);
    const parsed = JSON.parse(cleanedText) as ParsedTemplate;
    return parsed;
  } catch (err) {
    console.error("Raw Claude response:", content.text);
    throw new Error(`Failed to parse Claude response: ${err}`);
  }
}
