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

// AI Import (D-023, FR-FOOD-7). Output shape matches the admin bulk-import ParsedItem
// schema exactly (web/src/pages/AdminFoodImport.tsx) so the same preview/save path can
// handle both. This is always a pre-fill for a human to review — see D-023's governance
// note and docs/research/ai-import.md §4: the model can only ever estimate a category
// average, it has no way to know the specific restaurant/recipe's actual formula, so the
// client-side preview must carry an explicit "estimated, please verify" disclaimer.
const NUTRITION_MODEL = "claude-haiku-4-5-20251001";

export async function getNutritionEstimate(name, quantity, photoBase64, photoMediaType) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const promptText = `Estimate nutrition facts for a food-tracking app, the way a knowledgeable person would look up category-average nutrition data for a dish (e.g. from a food composition database) based on its name and stated quantity — NOT guessing one specific restaurant's exact recipe.

Food name: ${name}
Quantity: ${quantity}
${photoBase64 ? "A photo is attached for extra context (e.g. to help identify ambiguous ingredients) — use it as supporting context only, not as your primary source for portion size; the stated quantity above is the primary source." : ""}

kcal, protein_g, carbs_g, fat_g must always be your best numeric estimate for the stated quantity — never omit these. For every other nutrient field, only include it if you have a reasonable estimate; omit fields you're not confident about instead of guessing 0. Respond in Thai for name/serving_label. Respond using the submit_nutrition_estimate tool.`;

  const content = [{ type: "text", text: promptText }];
  if (photoBase64) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: photoMediaType || "image/jpeg", data: photoBase64 },
    });
  }

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: NUTRITION_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content }],
      tools: [
        {
          name: "submit_nutrition_estimate",
          description: "Submit a structured nutrition estimate for the given food and quantity",
          input_schema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Clean food name in Thai" },
              serving_label: {
                type: "string",
                description: "Human-readable serving description matching the stated quantity, e.g. '1 จาน', '250 กรัม' — omit if you can't state one clearly",
              },
              serving_size_g: { type: "number", description: "Best-estimate weight in grams for the stated quantity" },
              kcal: { type: "number" },
              protein_g: { type: "number" },
              carbs_g: { type: "number" },
              fat_g: { type: "number" },
              nutrients: {
                type: "object",
                description: "Only include keys you have a reasonable estimate for — omit anything uncertain rather than guessing 0",
                properties: {
                  saturated_fat_g: { type: "number" },
                  trans_fat_g: { type: "number" },
                  polyunsaturated_fat_g: { type: "number" },
                  monounsaturated_fat_g: { type: "number" },
                  cholesterol_mg: { type: "number" },
                  sodium_mg: { type: "number" },
                  fiber_g: { type: "number" },
                  sugar_g: { type: "number" },
                  vitamins: {
                    type: "object",
                    properties: { vitamin_a_mcg: { type: "number" }, vitamin_c_mg: { type: "number" }, vitamin_d_mcg: { type: "number" } },
                  },
                  minerals: {
                    type: "object",
                    properties: { calcium_mg: { type: "number" }, iron_mg: { type: "number" }, potassium_mg: { type: "number" } },
                  },
                },
              },
            },
            required: ["name", "serving_size_g", "kcal", "protein_g", "carbs_g", "fat_g", "nutrients"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "submit_nutrition_estimate" },
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

  const est = toolUse.input;
  return {
    name: est.name,
    serving_label: est.serving_label ?? null,
    serving_size_g: est.serving_size_g,
    kcal: est.kcal,
    protein_g: est.protein_g,
    carbs_g: est.carbs_g,
    fat_g: est.fat_g,
    nutrients: est.nutrients ?? {},
  };
}
