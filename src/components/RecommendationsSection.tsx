"use client";

import { ArrowRight, Lightbulb } from "lucide-react";

interface RecommendationsSectionProps {
  recommendations: string[];
}

export default function RecommendationsSection({
  recommendations,
}: RecommendationsSectionProps) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-bold text-slate-200">Recommendations</h2>
      </div>

      <div className="space-y-2.5">
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 bg-blue-950/20 border border-blue-800/30 rounded-xl p-3.5 group hover:bg-blue-950/30 transition-colors duration-200"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
              <ArrowRight className="w-3 h-3 text-blue-400" />
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{rec}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
