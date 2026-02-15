import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScoreBreakdown {
  mentionCount?: number;
  sentiment?: "positive" | "negative" | "neutral" | "mixed";
  citationScore?: number;
}

interface ScoreTooltipProps {
  score: number;
  breakdown?: ScoreBreakdown;
  showMethodology?: boolean;
}

export function ScoreTooltip({ score, breakdown, showMethodology = true }: ScoreTooltipProps) {
  const mentionScore = breakdown?.mentionCount 
    ? Math.min((breakdown.mentionCount) * 20, 60) 
    : null;
  
  const sentimentBonus = breakdown?.sentiment === "positive" 
    ? 20 
    : breakdown?.sentiment === "negative" 
      ? -10 
      : 0;

  const citationBonus = breakdown?.citationScore ?? 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs p-3" side="top">
        <div className="space-y-2">
          <div className="font-medium">Visibility Score: {score}/100</div>
          
          {breakdown && (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Mentions ({breakdown.mentionCount ?? 0}x):</span>
                <span className="font-medium">+{mentionScore ?? 0}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Sentiment ({breakdown.sentiment ?? "neutral"}):</span>
                <span className={`font-medium ${sentimentBonus > 0 ? "text-green-600" : sentimentBonus < 0 ? "text-red-600" : ""}`}>
                  {sentimentBonus >= 0 ? "+" : ""}{sentimentBonus}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Domain cited:</span>
                <span className="font-medium">+{citationBonus}</span>
              </div>
              <div className="border-t pt-1 flex justify-between gap-4 font-medium">
                <span>Total:</span>
                <span>{score}</span>
              </div>
            </div>
          )}

          {showMethodology && (
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
              <div className="font-medium mb-1">Methodology:</div>
              <ul className="space-y-0.5">
                <li>Mentions: 20pts each (max 60)</li>
                <li>Positive sentiment: +20pts</li>
                <li>Negative sentiment: -10pts</li>
                <li>Domain cited: +20pts</li>
              </ul>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function ScoreWithTooltip({ 
  score, 
  breakdown,
  className = "" 
}: { 
  score: number; 
  breakdown?: ScoreBreakdown;
  className?: string;
}) {
  const getScoreColor = (s: number) => {
    if (s >= 70) return "text-green-600 dark:text-green-400";
    if (s >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className={`font-semibold ${getScoreColor(score)}`}>{score}</span>
      <ScoreTooltip score={score} breakdown={breakdown} />
    </div>
  );
}
