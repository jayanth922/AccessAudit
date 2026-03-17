import { StreetViewImage } from "./types";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

const DIRECTIONS = [
  { heading: 0,   direction: "North" },
  { heading: 90,  direction: "East"  },
  { heading: 180, direction: "South" },
  { heading: 270, direction: "West"  },
];

function buildStreetViewUrl(lat: number, lng: number, heading: number): string {
  return (
    `https://maps.googleapis.com/maps/api/streetview` +
    `?size=640x480&location=${lat},${lng}&heading=${heading}&pitch=0&fov=90&source=outdoor&key=${GOOGLE_MAPS_API_KEY}`
  );
}

async function checkStreetViewAvailable(lat: number, lng: number): Promise<boolean> {
  const metaUrl =
    `https://maps.googleapis.com/maps/api/streetview/metadata` +
    `?location=${lat},${lng}&source=outdoor&key=${GOOGLE_MAPS_API_KEY}`;

  const res = await fetch(metaUrl);
  if (!res.ok) return false;
  const data = await res.json();
  return data.status === "OK";
}

async function fetchOneImage(lat: number, lng: number, heading: number, direction: string): Promise<StreetViewImage> {
  const imageUrl = buildStreetViewUrl(lat, lng, heading);
  const res = await fetch(imageUrl);

  if (!res.ok) {
    throw new Error(`Street View fetch failed for ${direction} (heading ${heading}): ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return { heading, direction, imageUrl, base64 };
}

export async function fetchStreetViewImages(lat: number, lng: number): Promise<StreetViewImage[]> {
  const available = await checkStreetViewAvailable(lat, lng);
  if (!available) {
    throw new Error("No Street View imagery available for this location.");
  }

  return Promise.all(
    DIRECTIONS.map(({ heading, direction }) => fetchOneImage(lat, lng, heading, direction))
  );
}
