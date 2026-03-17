import { GeocodingResult } from "./types";

async function searchNominatim(query: string): Promise<GeocodingResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;

  console.log("Geocoding query:", query);
  console.log("Nominatim URL:", url);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "AccessAudit/1.0",
      Accept: "application/json",
    },
  });

  console.log("Nominatim status:", res.status);

  if (!res.ok) {
    console.error(`Nominatim request failed: ${res.status}`);
    return null;
  }

  const data = await res.json();
  console.log("Nominatim results:", JSON.stringify(data).slice(0, 200));

  if (!data || data.length === 0) {
    return null;
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

// ── Institution / city abbreviations ────────────────────────────────────────
const ABBREVIATIONS: Record<string, string> = {
  SJSU: "San Jose State University",
  UCLA: "University of California Los Angeles",
  USC:  "University of Southern California",
  MIT:  "Massachusetts Institute of Technology",
  SF:   "San Francisco",
  SJ:   "San Jose",
  LA:   "Los Angeles",
  NYC:  "New York City",
};

function expandAbbreviations(address: string): string {
  let expanded = address;
  for (const [abbr, full] of Object.entries(ABBREVIATIONS)) {
    expanded = expanded.replace(new RegExp(`\\b${abbr}\\b`, "gi"), full);
  }
  return expanded;
}

// ── Street-level abbreviations ───────────────────────────────────────────────
const STREET_ABBREVIATIONS: Record<string, string> = {
  St:   "Street",
  Ave:  "Avenue",
  Blvd: "Boulevard",
  Dr:   "Drive",
  Ln:   "Lane",
  Rd:   "Road",
  Ct:   "Court",
  Pl:   "Place",
  S:    "South",
  N:    "North",
  E:    "East",
  W:    "West",
};

function ordinalSuffix(n: number): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  const mod10  = abs % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

function normalizeStreetAddress(address: string): string {
  let normalized = address;

  // Expand street abbreviations (word-boundary match, case-sensitive to avoid
  // stomping on words like "blend" when looking for "Blvd")
  for (const [abbr, full] of Object.entries(STREET_ABBREVIATIONS)) {
    normalized = normalized.replace(new RegExp(`\\b${abbr}\\b`, "g"), full);
  }

  // Add ordinal suffixes to bare street numbers: "9 Street" → "9th Street"
  // Only match numbers that are followed by a street-type word
  normalized = normalized.replace(
    /\b(\d+)\b(?=\s+(?:Street|Avenue|Boulevard|Drive|Lane|Road|Court|Place))/g,
    (_, num) => ordinalSuffix(parseInt(num, 10))
  );

  return normalized;
}

// ── Main export ──────────────────────────────────────────────────────────────
export async function geocode(address: string): Promise<GeocodingResult | null> {
  // Try 1: Original query
  let result = await searchNominatim(address);
  if (result) return result;

  // Try 2: Expand institution abbreviations
  const expanded = expandAbbreviations(address);
  if (expanded !== address) {
    result = await searchNominatim(expanded);
    if (result) return result;
  }

  // Try 3: Append USA
  result = await searchNominatim(address + ", USA");
  if (result) return result;

  // Try 4: Expanded + USA
  if (expanded !== address) {
    result = await searchNominatim(expanded + ", USA");
    if (result) return result;
  }

  // Try 5: Normalize street abbreviations + ordinal suffixes
  // e.g. "211 S 9 St, San Jose, CA" → "211 South 9th Street, San Jose, CA"
  const normalized = normalizeStreetAddress(expanded);
  if (normalized !== expanded) {
    result = await searchNominatim(normalized);
    if (result) return result;

    result = await searchNominatim(normalized + ", USA");
    if (result) return result;
  }

  // Try 6 (last resort): Progressive strip — remove comma-separated parts from
  // the front until something matches. Only for venue-style queries like
  // "SJSU Student Union, San Jose, CA" where the venue itself isn't in OSM.
  const parts = normalized.split(",").map((s) => s.trim());
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      const shorter = parts.slice(i).join(", ");
      result = await searchNominatim(shorter);
      if (result) {
        console.warn("WARNING: Fell back to city-level geocoding for:", address);
        return result;
      }
    }
  }

  return null;
}
