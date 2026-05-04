"use client";

import { useEffect, useRef, useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CAMERA_ANGLES, CAMERA_LABELS } from "@/lib/cameras";
import { useViewerStore, type Clip } from "@/lib/store";
import { formatBytes, formatTime } from "@/lib/format";

interface Props {
  clip: Clip;
  conflict?: boolean;
}

export function ClipCard({ clip, conflict }: Props) {
  const setAngle = useViewerStore((s) => s.setAngle);
  const setDuration = useViewerStore((s) => s.setDuration);
  const removeClip = useViewerStore((s) => s.removeClip);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      if (!isNaN(v.duration)) setDuration(clip.id, v.duration);
      // Seek to 1s so we get a more interesting frame than the first.
      try {
        v.currentTime = Math.min(1, v.duration / 4);
      } catch {}
    };
    const onSeeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = Math.round((160 * v.videoHeight) / Math.max(1, v.videoWidth));
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        try {
          setThumb(canvas.toDataURL("image/jpeg", 0.6));
        } catch {}
      }
    };
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("seeked", onSeeked);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("seeked", onSeeked);
    };
  }, [clip.id, setDuration]);

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-2 sm:p-3">
      <div className="relative h-16 w-24 sm:h-14 sm:w-24 shrink-0 overflow-hidden rounded bg-muted">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full animate-pulse bg-muted" />
        )}
        <video
          ref={videoRef}
          src={clip.url}
          muted
          preload="metadata"
          playsInline
          className="hidden"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{clip.filename}</p>
          {conflict && (
            <Badge variant="destructive" className="shrink-0">
              <AlertTriangle className="h-3 w-3" />
              Duplicate angle
            </Badge>
          )}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {formatBytes(clip.file.size)}
          {clip.duration ? ` · ${formatTime(clip.duration)}` : ""}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Select
            value={clip.angle ?? "unset"}
            onValueChange={(v) =>
              setAngle(clip.id, v === "unset" ? null : (v as never))
            }
          >
            <SelectTrigger size="sm" className="h-8 w-44">
              <SelectValue placeholder="Pick camera angle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Unassigned</SelectItem>
              {CAMERA_ANGLES.map((a) => (
                <SelectItem key={a} value={a}>
                  {CAMERA_LABELS[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => removeClip(clip.id)}
        aria-label="Remove clip"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
