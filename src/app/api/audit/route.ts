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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    const { address } = body as { address?: string };

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
    console.log("Step 1: Geocoding...");
    let location;
    try {
      location = await geocode(address.trim());
    } catch (err) {
      console.error("Geocode error:", err);
      return NextResponse.json({ error: `Geocoding failed: ${(err as Error).message}` }, { status: 500 });
    }
    if (!location) {
      return NextResponse.json({ error: "Location not found. Try a more specific address." }, { status: 404 });
    }
    console.log("Step 1 done: location =", location.displayName, location.lat, location.lng);

    // Step 2: Fetch Street View images
    console.log("Step 2: Fetching Street View images...");
    let images;
    try {
      images = await fetchStreetViewImages(location.lat, location.lng);
    } catch (err) {
      console.error("Street View error:", err);
      return NextResponse.json({ error: (err as Error).message }, { status: 404 });
    }
    if (images.length === 0) {
      return NextResponse.json({ error: "No Street View imagery available for this location." }, { status: 404 });
    }
    console.log(`Step 2 done: ${images.length} images fetched:`, images.map((i) => i.direction));

    // Step 3: Analyze each image with Nemotron VL (parallel, non-throwing)
    console.log("Step 3: Running Nemotron VL analysis...");
    const analysisResults = await Promise.all(
      images.map((img) => analyzeAccessibility(img.base64, img.direction))
    );
    console.log("Step 3 done: findings per image:", analysisResults.map((r) => r.findings.length));

    // Step 4: Combine findings
    const allFindings: AccessibilityFinding[] = analysisResults.flatMap((result, i) =>
      result.findings.map((f) => ({ ...f, direction: images[i].direction }))
    );
    console.log(`Step 4: ${allFindings.length} total findings combined`);

    // Brief pause to avoid rate-limiting between VL and Super calls
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 5: Synthesize report
    console.log("Step 5: Synthesizing report with Nemotron Super...");
    let report;
    try {
      report = await synthesizeReport(location.displayName, allFindings);
    } catch (err) {
      console.error("Synthesis error:", err);
      report = { findings: [] as AccessibilityFinding[], overallScore: 0, grade: "F", summary: "", recommendations: [] };
    }
    console.log("Step 5 done: score =", report.overallScore, "findings =", report.findings.length);

    // Fallback report if synthesis returned nothing
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

    console.log("=== AUDIT COMPLETE ===");
    return NextResponse.json({
      location,
      overallScore: report.overallScore,
      grade: getGrade(report.overallScore),
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
    console.error("Unhandled audit route error:", err);
    return NextResponse.json(
      { error: `Unexpected error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
