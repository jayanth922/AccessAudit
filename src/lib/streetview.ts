import { StreetViewImage } from "./types";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
const OFFSET_METERS = 150;

const OFFSETS_TEMPLATE = [
  { latOff:  OFFSET_METERS,        lngOff:  0,                   label: "North approach"     },
  { latOff:  OFFSET_METERS * 0.7,  lngOff:  OFFSET_METERS * 0.7, label: "Northeast approach" },
  { latOff:  0,                    lngOff:  OFFSET_METERS,        label: "East approach"      },
  { latOff: -OFFSET_METERS * 0.7,  lngOff:  OFFSET_METERS * 0.7, label: "Southeast approach" },
  { latOff: -OFFSET_METERS,        lngOff:  0,                   label: "South approach"     },
  { latOff: -OFFSET_METERS * 0.7,  lngOff: -OFFSET_METERS * 0.7, label: "Southwest approach" },
  { latOff:  0,                    lngOff: -OFFSET_METERS,        label: "West approach"      },
  { latOff:  OFFSET_METERS * 0.7,  lngOff: -OFFSET_METERS * 0.7, label: "Northwest approach" },
];

function calculateHeading(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const dLng = (toLng - fromLng) * Math.PI / 180;
  const fromLatRad = fromLat * Math.PI / 180;
  const toLatRad = toLat * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(toLatRad);
  const x = Math.cos(fromLatRad) * Math.sin(toLatRad) - Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

interface PanoMeta {
  status: string;
  pano_id?: string;
  location?: { lat: number; lng: number };
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
  panoId: string,
  heading: number,
  label: string
): Promise<StreetViewImage> {
  const imageUrl =
    `https://maps.googleapis.com/maps/api/streetview` +
    `?size=640x480&pano=${panoId}&heading=${heading.toFixed(1)}&pitch=0&fov=90&key=${GOOGLE_MAPS_API_KEY}`;

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Street View image HTTP ${res.status} for ${label}`);

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    const text = await res.text();
    throw new Error(`Street View non-image response for ${label}: ${text.slice(0, 80)}`);
  }

  const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  return { heading, direction: label, imageUrl, base64 };
}

async function fetchWithDedup(
  buildingLat: number,
  buildingLng: number
): Promise<StreetViewImage[]> {
  const cosLat = Math.cos(buildingLat * Math.PI / 180);
  const usedPanoIds = new Set<string>();
  const images: StreetViewImage[] = [];

  for (const tpl of OFFSETS_TEMPLATE) {
    if (images.length >= 4) break;

    const pointLat = buildingLat + tpl.latOff / 111320;
    const pointLng = buildingLng + tpl.lngOff / (111320 * cosLat);

    let meta: PanoMeta;
    try {
      meta = await fetchMeta(pointLat, pointLng);
    } catch (err) {
      console.warn(`Metadata fetch failed for ${tpl.label}:`, (err as Error).message);
      continue;
    }

    if (meta.status !== "OK" || !meta.pano_id || !meta.location) {
      console.log(`${tpl.label}: no panorama (status: ${meta.status})`);
      continue;
    }

    if (usedPanoIds.has(meta.pano_id)) {
      console.log(`${tpl.label}: duplicate pano_id ${meta.pano_id} — skipping`);
      continue;
    }

    usedPanoIds.add(meta.pano_id);

    const heading = calculateHeading(meta.location.lat, meta.location.lng, buildingLat, buildingLng);
    console.log(`Fetching Street View from offset: ${tpl.label} pano=${meta.pano_id} at ${meta.location.lat.toFixed(5)},${meta.location.lng.toFixed(5)} heading: ${heading.toFixed(1)}`);

    try {
      const img = await fetchImageByPanoId(meta.pano_id, heading, tpl.label);
      images.push(img);
    } catch (err) {
      console.warn(`Image fetch failed for ${tpl.label}:`, (err as Error).message);
      usedPanoIds.delete(meta.pano_id); // allow retry on another offset
    }
  }

  console.log(`Selected ${images.length} unique panoramas from ${OFFSETS_TEMPLATE.length} candidates`);
  console.log("Pano IDs used:", Array.from(usedPanoIds));
  return images;
}

async function fetchFallback(buildingLat: number, buildingLng: number): Promise<StreetViewImage[]> {
  console.log("Falling back to single-point 4-compass approach");
  const meta = await fetchMeta(buildingLat, buildingLng);
  if (meta.status !== "OK" || !meta.pano_id || !meta.location) {
    throw new Error("No Street View imagery available for this location.");
  }

  const baseHeading = calculateHeading(meta.location.lat, meta.location.lng, buildingLat, buildingLng);
  const compassLabels = ["Front", "Right side", "Rear", "Left side"];
  const images: StreetViewImage[] = [];

  for (let i = 0; i < 4; i++) {
    const heading = (baseHeading + i * 90) % 360;
    try {
      const img = await fetchImageByPanoId(meta.pano_id, heading, compassLabels[i]);
      images.push(img);
    } catch (err) {
      console.warn(`Fallback image failed for ${compassLabels[i]}:`, (err as Error).message);
    }
  }

  return images;
}

export async function fetchStreetViewImages(lat: number, lng: number): Promise<StreetViewImage[]> {
  const images = await fetchWithDedup(lat, lng);

  if (images.length >= 3) return images;

  console.warn(`Only ${images.length} unique panoramas found — trying fallback`);
  const fallback = await fetchFallback(lat, lng);
  if (fallback.length > 0) return fallback;

  throw new Error("No Street View imagery available for this location.");
}
