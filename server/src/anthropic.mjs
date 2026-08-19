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

// mode "estimate" (default): guess from category-average knowledge, name+quantity primary,
// photo (if any) is supporting context only — see docs/research/ai-import.md §4 ceiling.
// mode "read_label" (D-023 round 2, 2026-08-19): a fundamentally different, more reliable
// task — transcribe the printed values off a nutrition label photo instead of estimating.
// Photo is required by the caller for this mode (enforced in index.mjs); read_label calls
// without a photo would just be a worse "estimate" call with a misleading name.
export async function getNutritionEstimate(name, quantity, photoBase64, photoMediaType, mode = "estimate") {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const promptText =
    mode === "read_label"
      ? `Read the nutrition facts label in the attached photo for a food-tracking app — TRANSCRIBE the
printed values, do not estimate or guess. If a value is not legible or not printed on the label, omit
that field entirely rather than guessing a number for it.

Product name (as the user typed it): ${name}
How much the user says they're eating: ${quantity}

The label states values per serving or per 100g (or both) and usually the total package size — use
those printed figures to calculate the values for what the user says they're eating. kcal, protein_g,
carbs_g, fat_g must always be present (these are always printed on a real nutrition label) — give them
as a narrow low-high range reflecting only your uncertainty about reading/scaling the label, NOT product
variance (you're reading real numbers, not guessing a category average — the range should usually be
much narrower than a name-only estimate would need). For every other nutrient field, only include it if
the label actually printed it. Respond in Thai for name/serving_label. Respond using the
submit_nutrition_estimate tool.`
      : `Estimate nutrition facts for a food-tracking app, the way a knowledgeable person would look up category-average nutrition data for a dish (e.g. from a food composition database) based on its name and stated quantity — NOT guessing one specific restaurant's exact recipe.

Food name: ${name}
Quantity: ${quantity}
${photoBase64 ? "A photo is attached for extra context (e.g. to help identify ambiguous ingredients) — use it as supporting context only, not as your primary source for portion size; the stated quantity above is the primary source." : ""}

For kcal, protein_g, carbs_g, fat_g: give a realistic low-high range for the stated quantity that you're
roughly 80% confident contains the true value — never omit these four. This is NOT an extreme min/max
("could theoretically be anywhere from 0 to 2000") — make it as narrow as your actual confidence allows.
A specific, well-known product or a simple staple food should get a narrow range; a vague or highly
variable home-cooked dish should get a wider one. For every other nutrient field, only include it if you
have a reasonable point estimate; omit fields you're not confident about instead of guessing 0. Respond
in Thai for name/serving_label. Respond using the submit_nutrition_estimate tool.`;

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
              kcal: {
                type: "object",
                description: "~80%-confidence range for kcal at the stated quantity, not an extreme min/max",
                properties: { low: { type: "number" }, high: { type: "number" } },
                required: ["low", "high"],
              },
              protein_g: {
                type: "object",
                description: "~80%-confidence range for protein (g) at the stated quantity",
                properties: { low: { type: "number" }, high: { type: "number" } },
                required: ["low", "high"],
              },
              carbs_g: {
                type: "object",
                description: "~80%-confidence range for carbs (g) at the stated quantity",
                properties: { low: { type: "number" }, high: { type: "number" } },
                required: ["low", "high"],
              },
              fat_g: {
                type: "object",
                description: "~80%-confidence range for fat (g) at the stated quantity",
                properties: { low: { type: "number" }, high: { type: "number" } },
                required: ["low", "high"],
              },
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
  // Midpoint becomes the flat single-number field (unchanged shape for custom_foods/admin
  // bulk-import save), the low/high range rides along separately for the preview UI to show
  // as a hint — never blocks or replaces the editable point value (D-023, FR-FOOD-7).
  const midpoint = (range) => (range.low + range.high) / 2;
  return {
    name: est.name,
    serving_label: est.serving_label ?? null,
    serving_size_g: est.serving_size_g,
    kcal: midpoint(est.kcal),
    protein_g: midpoint(est.protein_g),
    carbs_g: midpoint(est.carbs_g),
    fat_g: midpoint(est.fat_g),
    nutrients: est.nutrients ?? {},
    ranges: {
      kcal: [est.kcal.low, est.kcal.high],
      protein_g: [est.protein_g.low, est.protein_g.high],
      carbs_g: [est.carbs_g.low, est.carbs_g.high],
      fat_g: [est.fat_g.low, est.fat_g.high],
    },
  };
}
