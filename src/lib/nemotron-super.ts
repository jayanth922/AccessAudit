import { AccessibilityFinding } from "./types";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY!;
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

export interface SynthesisResult {
  overallScore: number;
  grade: string;
  summary: string;
  findings: AccessibilityFinding[];
  recommendations: string[];
}

const FALLBACK: SynthesisResult = {
  overallScore: 50,
  grade: "C",
  summary: "Analysis completed but the AI model did not return a structured report. Please try again.",
  findings: [],
  recommendations: ["Try auditing this location again for detailed results."],
};

function safeParseJSON(raw: string): SynthesisResult {
  // Strip markdown code fences
  let cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned) as SynthesisResult;
  } catch {}

  // Extract first JSON object using brace matching
  const start = cleaned.indexOf("{");
  if (start === -1) {
    console.error("No JSON found in response. Full raw text:", raw);
    return FALLBACK;
  }

  let depth = 0;
  let end = -1;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    else if (cleaned[i] === "}") {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }

  if (end === -1) {
    // JSON was truncated — close it manually
    cleaned = cleaned.slice(start) + ']}]}';
  } else {
    cleaned = cleaned.slice(start, end);
  }

  // Fix trailing commas before ] or }
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  try {
    return JSON.parse(cleaned) as SynthesisResult;
  } catch {}

  // Final fallback
  console.error("JSON parse failed, using fallback. Raw:", raw.slice(0, 500));
  return FALLBACK;
}

export async function synthesizeReport(
  locationName: string,
  allFindings: AccessibilityFinding[]
): Promise<SynthesisResult> {
  const body = {
    model: "nvidia/nemotron-3-super-120b-a12b",
    messages: [
      {
        role: "system",
        content:
          "You are an ADA compliance and wheelchair accessibility expert. Always respond with ONLY a valid JSON object — no prose, no markdown, no explanation.",
      },
      {
        role: "user",
        content: `Analyze these accessibility findings for "${locationName}":

${JSON.stringify(allFindings, null, 2)}

Respond with ONLY a JSON object, no other text. Keep it concise — max 5 findings, descriptions under 20 words each.

Score scale: 90-100=A, 75-89=B, 60-74=C, 40-59=D, 0-39=F.

{"overallScore": 0-100, "grade": "A|B|C|D|F", "summary": "2 sentences max", "findings": [{"issue": "short title", "severity": "critical|major|minor|positive", "description": "under 20 words", "direction": "which view", "category": "entrance|pathway|signage|parking|surface|curb|other"}], "recommendations": ["rec 1", "rec 2", "rec 3"]}`,
      },
    ],
    max_tokens: 2000,
    temperature: 0.3,
  };

  const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Nemotron Super error: ${res.status}`, errText.slice(0, 300));
    return FALLBACK;
  }

  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = await res.json();
  } catch (err) {
    console.error("Nemotron Super JSON parse error:", err);
    return FALLBACK;
  }
  const content: string = data.choices?.[0]?.message?.content ?? "";

  console.log("Nemotron Super raw response:", content.slice(0, 500));

  return safeParseJSON(content);
}
