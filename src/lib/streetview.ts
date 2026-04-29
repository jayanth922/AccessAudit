import { StreetViewImage } from "./types";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
const OFFSET_METERS = 40;

function calculateHeading(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const dLng = (toLng - fromLng) * Math.PI / 180;
  const fromLatRad = fromLat * Math.PI / 180;
  const toLatRad = toLat * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(toLatRad);
  const x = Math.cos(fromLatRad) * Math.sin(toLatRad) - Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function buildStreetViewUrl(lat: number, lng: number, heading: number): string {
  return (
    `https://maps.googleapis.com/maps/api/streetview` +
    `?size=640x480&location=${lat},${lng}&heading=${heading}&pitch=0&fov=90&source=outdoor&key=${GOOGLE_MAPS_API_KEY}`
  );
}

async function fetchOneImage(
  pointLat: number,
  pointLng: number,
  buildingLat: number,
  buildingLng: number,
  label: string
): Promise<StreetViewImage> {
  const metaUrl =
    `https://maps.googleapis.com/maps/api/streetview/metadata` +
    `?location=${pointLat},${pointLng}&source=outdoor&key=${GOOGLE_MAPS_API_KEY}`;

  const metaRes = await fetch(metaUrl);
  if (!metaRes.ok) {
    throw new Error(`Metadata request failed for ${label}: HTTP ${metaRes.status}`);
  }

  let meta: { status: string; location?: { lat: number; lng: number } };
  try {
    meta = await metaRes.json();
  } catch {
    throw new Error(`Metadata response was not valid JSON for ${label}`);
  }

  console.log(`Street View metadata for ${label}:`, meta.status, meta.location ?? "(no location)");

  if (meta.status !== "OK") {
    throw new Error(`No Street View panorama near ${label} (status: ${meta.status})`);
  }

  const panoLat = meta.location!.lat;
  const panoLng = meta.location!.lng;

  const heading = calculateHeading(panoLat, panoLng, buildingLat, buildingLng);
  console.log(`Fetching Street View from offset: ${label} at ${panoLat}, ${panoLng} heading: ${heading.toFixed(1)}`);

  const imageUrl = buildStreetViewUrl(panoLat, panoLng, heading);
  const res = await fetch(imageUrl);

  if (!res.ok) {
    throw new Error(`Street View image fetch failed for ${label}: HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    const text = await res.text();
    throw new Error(`Street View returned non-image for ${label}: ${text.slice(0, 100)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return { heading, direction: label, imageUrl, base64 };
}

export async function fetchStreetViewImages(lat: number, lng: number): Promise<StreetViewImage[]> {
  const cosLat = Math.cos(lat * Math.PI / 180);
  const offsets = [
    { latOff:  OFFSET_METERS / 111320,         lngOff: 0,                                  label: "North approach" },
    { latOff:  0,                              lngOff: OFFSET_METERS / (111320 * cosLat),  label: "East approach"  },
    { latOff: -OFFSET_METERS / 111320,         lngOff: 0,                                  label: "South approach" },
    { latOff:  0,                              lngOff: -OFFSET_METERS / (111320 * cosLat), label: "West approach"  },
  ];

  const results = await Promise.allSettled(
    offsets.map(({ latOff, lngOff, label }) =>
      fetchOneImage(lat + latOff, lng + lngOff, lat, lng, label)
    )
  );

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.warn(`Street View offset [${offsets[i].label}] skipped:`, (r.reason as Error).message);
    }
  });

  const images = results
    .filter((r): r is PromiseFulfilledResult<StreetViewImage> => r.status === "fulfilled")
    .map((r) => r.value);

  if (images.length === 0) {
    throw new Error("No Street View imagery available for this location.");
  }

  return images;
}
