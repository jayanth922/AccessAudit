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
  const meta = await metaRes.json();

  let panoLat = pointLat;
  let panoLng = pointLng;

  if (meta.status === "OK" && meta.location) {
    panoLat = meta.location.lat;
    panoLng = meta.location.lng;
  } else if (meta.status !== "OK") {
    throw new Error(`No Street View panorama near ${label} offset (status: ${meta.status})`);
  }

  const heading = calculateHeading(panoLat, panoLng, buildingLat, buildingLng);
  const imageUrl = buildStreetViewUrl(panoLat, panoLng, heading);

  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Street View fetch failed for ${label}: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return { heading, direction: label, imageUrl, base64 };
}

export async function fetchStreetViewImages(lat: number, lng: number): Promise<StreetViewImage[]> {
  const cosLat = Math.cos(lat * Math.PI / 180);
  const offsets = [
    { latOff:  OFFSET_METERS / 111320,              lngOff: 0,                                       label: "North approach" },
    { latOff:  0,                                   lngOff: OFFSET_METERS / (111320 * cosLat),       label: "East approach"  },
    { latOff: -OFFSET_METERS / 111320,              lngOff: 0,                                       label: "South approach" },
    { latOff:  0,                                   lngOff: -OFFSET_METERS / (111320 * cosLat),      label: "West approach"  },
  ];

  const results = await Promise.allSettled(
    offsets.map(({ latOff, lngOff, label }) =>
      fetchOneImage(lat + latOff, lng + lngOff, lat, lng, label)
    )
  );

  results.forEach((r) => {
    if (r.status === "rejected") console.warn("Street View offset failed:", r.reason);
  });

  const images = results
    .filter((r): r is PromiseFulfilledResult<StreetViewImage> => r.status === "fulfilled")
    .map((r) => r.value);

  if (images.length === 0) {
    throw new Error("No Street View imagery available for this location.");
  }

  return images;
}
