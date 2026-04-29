import { AccessibilityFinding } from "./types";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY!;
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

interface VLAnalysisResult {
  findings: Omit<AccessibilityFinding, "direction">[];
}

function safeParseVL(raw: string, direction: string): VLAnalysisResult {
  // Strip markdown code fences
  let cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  // Try direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.findings)) return parsed as VLAnalysisResult;
  } catch {}

  // Extract first JSON object using brace matching
  const start = cleaned.indexOf("{");
  if (start !== -1) {
    let depth = 0;
    let end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === "{") depth++;
      else if (cleaned[i] === "}") {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }

    const candidate = end === -1
      ? cleaned.slice(start) + "]}"        // truncated — close the findings array
      : cleaned.slice(start, end);

    // Fix trailing commas before ] or }
    const fixed = candidate.replace(/,\s*([\]}])/g, "$1");

    try {
      const parsed = JSON.parse(fixed);
      if (Array.isArray(parsed.findings)) return parsed as VLAnalysisResult;
    } catch {}
  }

  // Final fallback: wrap raw text as a single finding
  console.error(`VL JSON parse failed for ${direction}, using text fallback. Raw:`, raw.slice(0, 300));
  return {
    findings: [
      {
        issue: `${direction} view observation`,
        severity: "minor",
        description: raw.slice(0, 400),
        category: "other",
      },
    ],
  };
}

export async function analyzeAccessibility(
  base64: string,
  direction: string
): Promise<VLAnalysisResult> {
  const body = {
    model: "nvidia/nemotron-nano-12b-v2-vl",
    messages: [
      {
        role: "system",
        content:
          "/no_think You are a wheelchair accessibility auditor. Analyze the street-level image and identify ALL accessibility features and barriers visible. Be specific and detailed. Only mark a finding as 'positive' if you can clearly see a specific accessibility feature present (like a ramp, curb cut, or automatic door). If a feature is simply absent or you cannot assess it, classify it as 'minor' with a note that it could not be assessed from this angle. Never mark the absence of a barrier as a positive finding.",
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64}` },
          },
          {
            type: "text",
            text: `Analyze this image of the building as seen from the ${direction}. Focus on the building entrance, doorways, ramps, and pathways visible from this angle. Evaluate for wheelchair accessibility:

Evaluate and report on ALL of the following you can see:
- Entrance accessibility (steps, ramps, door width, automatic doors)
- Pathway/sidewalk condition (width, surface, obstacles, slope)
- Curb cuts and crosswalks
- Parking (accessible spots, proximity)
- Signage (accessibility symbols, braille)
- Surface conditions (cracks, uneven, gravel vs paved)
- Handrails and grab bars
- Tactile paving / detectable warnings
- Any other barriers or positive features

For each finding, state:
1. What you observe (be specific)
2. Whether it's a BARRIER or POSITIVE feature
3. Severity: critical (blocks access), major (significantly difficult), minor (inconvenient), or positive (good accessibility feature)
4. Category: entrance, pathway, signage, parking, surface, curb, other

Respond in JSON format:
{
  "findings": [
    {
      "issue": "short title",
      "severity": "critical|major|minor|positive",
      "description": "detailed description of what you see",
      "category": "entrance|pathway|signage|parking|surface|curb|other"
    }
  ]
}`,
          },
        ],
      },
    ],
    max_tokens: 1024,
    temperature: 0.2,
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
    throw new Error(`Vision API error (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";

  return safeParseVL(content, direction);
}
