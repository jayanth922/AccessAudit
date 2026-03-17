/**
 * Derives an A–F grade from a 0–100 accessibility score.
 * Single source of truth — used by both the API route and the frontend.
 *
 * 90-100 = A (Excellent)
 * 75-89  = B (Good)
 * 60-74  = C (Fair)
 * 40-59  = D (Poor)
 * 0-39   = F (Critical)
 */
export function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}
