"use client";

import { ArrowLeft, ArrowRight, Gauge, Hand } from "lucide-react";
import type { AutopilotState, TelemetrySample } from "@/lib/sei";
import { mpsToMph } from "@/lib/format";
import { cn } from "@/lib/utils";

const FSD_LABELS: Record<AutopilotState, string> = {
  off: "off",
  fsd: "FSD",
  autosteer: "Autosteer",
  tacc: "TACC",
};

export function TelemetryOverlay({ sample }: { sample: TelemetrySample }) {
  const mph =
    typeof sample.speed === "number" ? Math.round(mpsToMph(sample.speed)) : null;

  return (
    <div className="flex items-end justify-between gap-3 font-mono text-white">
      <div className="flex flex-col gap-2">
        {mph !== null && (
          <div className="flex items-baseline gap-1.5 rounded-md bg-black/60 px-2.5 py-1 backdrop-blur">
            <span className="text-2xl sm:text-3xl font-semibold tabular-nums leading-none">
              {mph}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/70">
              mph
            </span>
          </div>
        )}
        {sample.gear && (
          <div className="rounded-md bg-black/60 px-2.5 py-1 text-xs backdrop-blur">
            <span className="text-white/70">Gear </span>
            <span className="font-semibold">{sample.gear}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        {sample.fsd && sample.fsd !== "off" && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs backdrop-blur",
              sample.fsd === "fsd"
                ? "bg-blue-500/80 text-white"
                : "bg-black/60 text-white/80",
            )}
          >
            <Hand className="h-3 w-3" />
            <span>{FSD_LABELS[sample.fsd]}</span>
          </div>
        )}
        {sample.turnSignal && sample.turnSignal !== "off" && (
          <div className="flex items-center gap-1 rounded-md bg-amber-400/90 px-2.5 py-1 text-xs text-black backdrop-blur">
            {sample.turnSignal === "left" ? (
              <ArrowLeft className="h-3.5 w-3.5" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" />
            )}
            <span className="font-semibold uppercase">
              {sample.turnSignal}
            </span>
          </div>
        )}
        {typeof sample.steering === "number" && (
          <div className="flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-xs backdrop-blur">
            <Gauge className="h-3 w-3" />
            <span className="tabular-nums">{Math.round(sample.steering)}°</span>
          </div>
        )}
      </div>
    </div>
  );
}
