import { StreetViewImage } from "./types";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

const TIER1_DISTANCES = [30, 50, 80];
const TIER2_DISTANCES = [120, 150];
const ANGLES         = [0, 45, 90, 135, 180, 225, 270, 315];
const ANGLE_LABELS   = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function compassLabel(panoLat: number, panoLng: number, buildingLat: number, buildingLng: number): string {
  // Direction from building → pano (i.e. which side of the building the camera is on)
  const bearing = calculateHeading(buildingLat, buildingLng, panoLat, panoLng);
  const sectors = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return `${sectors[Math.round(bearing / 45) % 8]} approach`;
}

function calculateHeading(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const dLng = (toLng - fromLng) * Math.PI / 180;
  const fromLatRad = fromLat * Math.PI / 180;
  const toLatRad   = toLat   * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(toLatRad);
  const x = Math.cos(fromLatRad) * Math.sin(toLatRad) - Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

interface PanoMeta {
  status: string;
  pano_id?: string;
  location?: { lat: number; lng: number };
}

interface PanoCandidate {
  panoId:  string;
  lat:     number;
  lng:     number;
  label:   string;
  heading: number;
}

function buildCandidatePoints(
  lat: number,
  lng: number,
  distances: number[]
): Array<{ lat: number; lng: number; label: string; distance: number }> {
  const cosLat = Math.cos(lat * Math.PI / 180);
  const points = [];
  for (const distance of distances) {
    for (let i = 0; i < ANGLES.length; i++) {
      const rad = ANGLES[i] * Math.PI / 180;
      points.push({
        lat:      lat + (distance * Math.cos(rad)) / 111320,
        lng:      lng + (distance * Math.sin(rad)) / (111320 * cosLat),
        label:    `${ANGLE_LABELS[i]} approach`,
        distance,
      });
    }
  }
  return points;
}

async function fetchMeta(lat: number, lng: number): Promise<PanoMeta> {
  const url =
    `https://maps.googleapis.com/maps/api/streetview/metadata` +
    `?location=${lat},${lng}&source=outdoor&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Metadata HTTP ${res.status}`);
  return res.json();
}

async function fetchImageByPanoId(
  panoId:  string,
  heading: number,
  label:   string
): Promise<StreetViewImage> {
  const imageUrl =
    `https://maps.googleapis.com/maps/api/streetview` +
    `?size=640x480&pano=${panoId}&heading=${heading.toFixed(1)}&pitch=-10&fov=90&key=${GOOGLE_MAPS_API_KEY}`;

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Street View image HTTP ${res.status} for ${label}`);

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    const text = await res.text();
    throw new Error(`Street View non-image for ${label}: ${text.slice(0, 80)}`);
  }

  const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  return { heading, direction: label, imageUrl, base64 };
}

// Appends new unique panoramas from `candidates` into `panos`, sharing the `seen` set across calls.
async function collectInto(
  candidates:   Array<{ lat: number; lng: number; label: string; distance: number }>,
  buildingLat:  number,
  buildingLng:  number,
  seen:         Set<string>,
  panos:        PanoCandidate[],
  maxTotal:     number
): Promise<void> {
  for (const c of candidates) {
    if (panos.length >= maxTotal) break;

    let meta: PanoMeta;
    try {
      meta = await fetchMeta(c.lat, c.lng);
    } catch (err) {
      console.warn(`  Meta failed ${c.label} @${c.distance}m:`, (err as Error).message);
      continue;
    }

    if (meta.status !== "OK" || !meta.pano_id || !meta.location) {
      console.log(`  ${c.label} @${c.distance}m: no pano (${meta.status})`);
      continue;
    }

    if (seen.has(meta.pano_id)) {
      console.log(`  ${c.label} @${c.distance}m: duplicate ${meta.pano_id.slice(0, 10)}… — skip`);
      continue;
    }

    seen.add(meta.pano_id);
    const heading = calculateHeading(meta.location.lat, meta.location.lng, buildingLat, buildingLng);
    const label   = compassLabel(meta.location.lat, meta.location.lng, buildingLat, buildingLng);
    console.log(`  + ${label} (cand:${c.label} @${c.distance}m)  pano=${meta.pano_id.slice(0, 12)}…  hdg=${heading.toFixed(1)}°`);

    panos.push({ panoId: meta.pano_id, lat: meta.location.lat, lng: meta.location.lng, label, heading });
  }
}

function selectSpreadOut(panos: PanoCandidate[], count: number): PanoCandidate[] {
  if (panos.length <= count) return panos;

  const selected: PanoCandidate[] = [panos[0]];

  while (selected.length < count) {
    let best: PanoCandidate | null = null;
    let bestMinDist = -1;

    for (const candidate of panos) {
      if (selected.includes(candidate)) continue;
      const minDist = Math.min(
        ...selected.map((s) => Math.hypot(s.lat - candidate.lat, s.lng - candidate.lng))
      );
      if (minDist > bestMinDist) { bestMinDist = minDist; best = candidate; }
    }

    if (!best) break;
    selected.push(best);
  }

  return selected;
}

async function fetchFallback(buildingLat: number, buildingLng: number): Promise<StreetViewImage[]> {
  console.log("Fallback: single-point 4-compass approach");
  let meta: PanoMeta;
  try { meta = await fetchMeta(buildingLat, buildingLng); }
  catch (err) { throw new Error(`Fallback meta failed: ${(err as Error).message}`); }

  if (meta.status !== "OK" || !meta.pano_id || !meta.location) {
    throw new Error("No Street View imagery available for this location.");
  }

  const baseHeading = calculateHeading(meta.location.lat, meta.location.lng, buildingLat, buildingLng);
  const labels = ["Front", "Right side", "Rear", "Left side"];
  const images: StreetViewImage[] = [];

  for (let i = 0; i < 4; i++) {
    try {
      images.push(await fetchImageByPanoId(meta.pano_id, (baseHeading + i * 90) % 360, labels[i]));
    } catch (err) {
      console.warn(`  Fallback image failed for ${labels[i]}:`, (err as Error).message);
    }
  }
  return images;
}

export async function fetchStreetViewImages(lat: number, lng: number): Promise<StreetViewImage[]> {
  const seen:       Set<string>      = new Set();
  const allUnique:  PanoCandidate[]  = [];

  // Tier 1 — close range: 30 / 50 / 80 m  (24 candidate points)
  console.log("Tier 1: scanning 30/50/80m offsets (24 candidates)…");
  await collectInto(buildCandidatePoints(lat, lng, TIER1_DISTANCES), lat, lng, seen, allUnique, 12);
  console.log(`Tier 1 complete: ${allUnique.length} unique panoramas`);

  // Tier 2 — extend search if needed: 120 / 150 m  (16 more candidates)
  if (allUnique.length < 3) {
    console.log(`Tier 1 insufficient — extending to 120/150m…`);
    await collectInto(buildCandidatePoints(lat, lng, TIER2_DISTANCES), lat, lng, seen, allUnique, 12);
    console.log(`Tier 2 complete: ${allUnique.length} unique panoramas total`);
  }

  if (allUnique.length === 0) {
    const fallback = await fetchFallback(lat, lng);
    if (fallback.length > 0) return fallback;
    throw new Error("No Street View imagery available for this location.");
  }

  // Select 4 most geographically spread-out panoramas
  const selected = selectSpreadOut(allUnique, 4);

  // Deduplicate labels in case two panos fall in the same compass sector
  const labelCounts: Record<string, number> = {};
  for (const p of selected) {
    labelCounts[p.label] = (labelCounts[p.label] ?? 0) + 1;
  }
  const labelSeen: Record<string, number> = {};
  for (const p of selected) {
    if (labelCounts[p.label] > 1) {
      labelSeen[p.label] = (labelSeen[p.label] ?? 0) + 1;
      p.label = `${p.label} (${labelSeen[p.label]})`;
    }
  }

  console.log(`Selected ${selected.length} spread-out panos from ${allUnique.length} unique:`);
  selected.forEach((p) => console.log(`  → ${p.label}  pano=${p.panoId.slice(0, 12)}…  hdg=${p.heading.toFixed(1)}°`));

  // Fetch images sequentially to avoid rate limits
  const images: StreetViewImage[] = [];
  for (const pano of selected) {
    try {
      images.push(await fetchImageByPanoId(pano.panoId, pano.heading, pano.label));
    } catch (err) {
      console.warn(`  Image fetch failed for ${pano.label}:`, (err as Error).message);
    }
  }

  if (images.length < 3) {
    console.warn(`Only ${images.length} images — trying fallback`);
    const fallback = await fetchFallback(lat, lng);
    if (fallback.length > 0) return fallback;
  }

  if (images.length === 0) throw new Error("No Street View imagery available for this location.");
  return images;
}
