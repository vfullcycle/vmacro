const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

const TARGET_LABEL = { th: "Thai", en: "English" };

export async function translateBatch(texts, targetLang) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const targetLabel = TARGET_LABEL[targetLang];
  if (!targetLabel) {
    throw new Error(`unsupported targetLang: ${targetLang}`);
  }

  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Translate each of these food/ingredient names to ${targetLabel}. Use natural, commonly-used terms for a food-tracking app — not overly literal word-for-word translation. Respond using the submit_translations tool.\n\n${numbered}`,
        },
      ],
      tools: [
        {
          name: "submit_translations",
          description: "Submit the translated food names, in the same order as given",
          input_schema: {
            type: "object",
            properties: {
              translations: {
                type: "array",
                items: { type: "string" },
                description: "Translated food names — same order and count as the input list",
              },
            },
            required: ["translations"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "submit_translations" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const toolUse = data.content.find((block) => block.type === "tool_use");
  if (!toolUse) {
    throw new Error("Anthropic response had no tool_use block");
  }

  const translations = toolUse.input.translations;
  if (!Array.isArray(translations) || translations.length !== texts.length) {
    throw new Error("Anthropic returned a mismatched translations array");
  }

  return translations;
}
