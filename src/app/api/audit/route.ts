import { NextRequest, NextResponse } from "next/server";
import { geocode } from "@/lib/geocode";
import { fetchStreetViewImages } from "@/lib/streetview";
import { analyzeAccessibility } from "@/lib/nemotron-vl";
import { synthesizeReport } from "@/lib/nemotron-super";
import { AccessibilityFinding } from "@/lib/types";
import { getGrade } from "@/lib/grade";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    console.log("=== AUDIT REQUEST ===");
    console.log("Address:", address);

    if (!address || typeof address !== "string" || !address.trim()) {
      return NextResponse.json({ error: "Address is required." }, { status: 400 });
    }

    if (!process.env.NVIDIA_API_KEY) {
      return NextResponse.json({ error: "NVIDIA_API_KEY is not configured." }, { status: 500 });
    }
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY is not configured." }, { status: 500 });
    }

    // Step 1: Geocode
    const location = await geocode(address.trim());
    if (!location) {
      return NextResponse.json({ error: "Location not found. Try a more specific address." }, { status: 404 });
    }

    // Step 2: Fetch Street View images (parallel)
    let images;
    try {
      images = await fetchStreetViewImages(location.lat, location.lng);
    } catch (err) {
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 404 }
      );
    }

    if (images.length === 0) {
      return NextResponse.json({ error: "No Street View imagery available for this location." }, { status: 404 });
    }

    // Step 3: Analyze each image with Nemotron VL (parallel)
    const analysisResults = await Promise.all(
      images.map((img) => analyzeAccessibility(img.base64, img.direction))
    );

    // Step 4: Combine findings, attach direction, synthesize
    const allFindings: AccessibilityFinding[] = analysisResults.flatMap((result, i) =>
      result.findings.map((f) => ({ ...f, direction: images[i].direction }))
    );

    // Brief pause to avoid rate-limiting between VL and Super calls
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let report = await synthesizeReport(location.displayName, allFindings);

    // If synthesis failed but raw VL findings exist, build a fallback report
    // so the demo never shows empty results as long as the vision step worked.
    if (report.findings.length === 0 && allFindings.length > 0) {
      console.warn("Synthesis returned no findings — falling back to raw VL findings");
      const criticalCount = allFindings.filter((f) => f.severity === "critical").length;
      const majorCount    = allFindings.filter((f) => f.severity === "major").length;
      const minorCount    = allFindings.filter((f) => f.severity === "minor").length;
      const positiveCount = allFindings.filter((f) => f.severity === "positive").length;

      const positiveBonus = Math.min(positiveCount * 5, 30);
      const score = Math.max(0, Math.min(100,
        100 - (criticalCount * 25) - (majorCount * 15) - (minorCount * 5) + positiveBonus
      ));

      report = {
        overallScore: score,
        grade: getGrade(score),
        summary: `Accessibility analysis found ${criticalCount} critical, ${majorCount} major, and ${minorCount} minor issues at this location.`,
        findings: allFindings,
        recommendations: [
          ...(criticalCount > 0 ? ["Address critical accessibility barriers immediately"] : []),
          ...(majorCount    > 0 ? ["Fix major accessibility issues to improve access"]   : []),
          "Consult an ADA compliance specialist for a full assessment",
        ],
      };
    }

    // Step 5: Return full report (include base64 for client-side image display)
    return NextResponse.json({
      location,
      overallScore: report.overallScore,
      grade: getGrade(report.overallScore), // derived from score, not trusted from model
      summary: report.summary,
      findings: report.findings,
      recommendations: report.recommendations,
      streetViewImages: images.map((img) => ({
        heading: img.heading,
        direction: img.direction,
        base64: img.base64,
      })),
    });
  } catch (err) {
    console.error("Audit route error:", err);
    return NextResponse.json(
      { error: `Unexpected error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
