export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface StreetViewImage {
  heading: number;      // 0, 90, 180, 270
  direction: string;    // "North", "East", "South", "West"
  imageUrl: string;     // Google Street View URL (with key)
  base64: string;       // base64 encoded JPEG (no data: prefix)
}

export interface AccessibilityFinding {
  issue: string;        // Short title
  severity: "critical" | "major" | "minor" | "positive";
  description: string;  // Detailed description
  direction: string;    // "North" | "East" | "South" | "West"
  category: string;     // entrance | pathway | signage | parking | surface | curb | other
}

export interface AuditReport {
  location: GeocodingResult;
  overallScore: number;   // 0-100
  grade: string;          // A, B, C, D, F
  summary: string;        // 2-3 sentence summary
  findings: AccessibilityFinding[];
  recommendations: string[];
  streetViewImages: StreetViewImage[];
}

export interface AuditRequest {
  address: string;
}
