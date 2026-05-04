"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatTime } from "@/lib/format";

interface Props {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  muted: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (t: number) => void;
  onToggleMute: () => void;
}

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  muted,
  onPlay,
  onPause,
  onSeek,
  onToggleMute,
}: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <Button
        size="icon"
        onClick={isPlaying ? onPause : onPlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 translate-x-px" />
        )}
      </Button>

      <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0 w-10">
        {formatTime(currentTime)}
      </span>

      <Slider
        value={[currentTime]}
        max={Math.max(duration, 0.1)}
        step={0.05}
        onValueChange={(v) => {
          const t = Array.isArray(v) ? v[0] : v;
          if (typeof t === "number") onSeek(t);
        }}
        className="flex-1"
      />

      <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0 w-10 text-right">
        {formatTime(duration)}
      </span>

      <Button
        size="icon"
        variant="ghost"
        onClick={onToggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="shrink-0"
      >
        {muted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
