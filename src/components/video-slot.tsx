"use client";

import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CAMERA_LABELS, type CameraAngle } from "@/lib/cameras";
import type { Clip } from "@/lib/store";

export type SetVideoRef = (
  id: string,
) => (el: HTMLVideoElement | null) => void;

interface Props {
  clip: Clip | undefined;
  angle: CameraAngle;
  setVideoRef: SetVideoRef;
  onFocus?: (angle: CameraAngle) => void;
  className?: string;
  fit?: "cover" | "contain";
  feather?: boolean;
  showLabel?: boolean;
  labelClassName?: string;
}

export function VideoSlot({
  clip,
  angle,
  setVideoRef,
  onFocus,
  className,
  fit = "cover",
  feather = false,
  showLabel = true,
  labelClassName,
}: Props) {
  return (
    <div
      className={cn(
        "group relative bg-zinc-900",
        onFocus && clip && "cursor-pointer",
        className,
      )}
      onClick={() => clip && onFocus?.(angle)}
    >
      {clip ? (
        <video
          ref={setVideoRef(clip.id)}
          src={clip.url}
          playsInline
          preload="auto"
          muted
          className={cn(
            "h-full w-full",
            fit === "cover" ? "object-cover" : "object-contain",
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
          No clip
        </div>
      )}

      {feather && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)",
          }}
        />
      )}

      {showLabel && (
        <div
          className={cn(
            "pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium tracking-wide text-white",
            labelClassName,
          )}
        >
          {CAMERA_LABELS[angle]}
        </div>
      )}

      {onFocus && clip && (
        <div className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
