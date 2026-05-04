"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useViewerStore, clipByAngle, maxDuration, type Clip } from "@/lib/store";
import { CAMERA_ANGLES, CAMERA_LABELS, type CameraAngle } from "@/lib/cameras";
import { cn } from "@/lib/utils";
import { PlaybackControls } from "./playback-controls";
import { TelemetryOverlay } from "./telemetry-overlay";
import {
  parseTeslaTelemetry,
  sampleAt,
  type TelemetryTrack,
  type TelemetrySample,
} from "@/lib/sei";
import { Maximize2 } from "lucide-react";

const SYNC_THRESHOLD = 0.15;

export function MultiCamViewer() {
  const clips = useViewerStore((s) => s.clips);
  const layout = useViewerStore((s) => s.layout);
  const focusAngle = useViewerStore((s) => s.focusAngle);
  const showTelemetry = useViewerStore((s) => s.showTelemetry);
  const setFocusAngle = useViewerStore((s) => s.setFocusAngle);

  const labeledClips = useMemo(
    () => clips.filter((c) => c.angle !== null),
    [clips],
  );

  // Master clip = front, else longest, else first.
  const master = useMemo(() => {
    const front = clipByAngle(labeledClips, "front");
    if (front) return front;
    if (labeledClips.length === 0) return null;
    return [...labeledClips].sort(
      (a, b) => (b.duration ?? 0) - (a.duration ?? 0),
    )[0];
  }, [labeledClips]);

  const totalDuration = useMemo(() => maxDuration(labeledClips), [labeledClips]);

  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const setVideoRef = useCallback(
    (id: string) => (el: HTMLVideoElement | null) => {
      if (el) videoRefs.current.set(id, el);
      else videoRefs.current.delete(id);
    },
    [],
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(true);
  const [telemetry, setTelemetry] = useState<TelemetrySample | null>(null);

  const playAll = useCallback(async () => {
    const promises: Promise<void>[] = [];
    videoRefs.current.forEach((v) => {
      v.muted = muted || v !== videoRefs.current.get(master?.id ?? "");
      promises.push(v.play().catch(() => undefined) as Promise<void>);
    });
    await Promise.all(promises);
    setIsPlaying(true);
  }, [muted, master?.id]);

  const pauseAll = useCallback(() => {
    videoRefs.current.forEach((v) => v.pause());
    setIsPlaying(false);
  }, []);

  const seekAll = useCallback((t: number) => {
    videoRefs.current.forEach((v) => {
      try {
        v.currentTime = Math.max(0, Math.min(t, v.duration || t));
      } catch {}
    });
    setCurrentTime(t);
  }, []);

  // Drive sync from master's timeupdate; correct drift on slaves.
  useEffect(() => {
    if (!master) return;
    const masterEl = videoRefs.current.get(master.id);
    if (!masterEl) return;
    const onTime = () => {
      const t = masterEl.currentTime;
      setCurrentTime(t);
      videoRefs.current.forEach((v, id) => {
        if (id === master.id) return;
        if (Math.abs(v.currentTime - t) > SYNC_THRESHOLD) {
          try {
            v.currentTime = Math.min(t, v.duration || t);
          } catch {}
        }
      });
    };
    const onEnded = () => setIsPlaying(false);
    masterEl.addEventListener("timeupdate", onTime);
    masterEl.addEventListener("ended", onEnded);
    return () => {
      masterEl.removeEventListener("timeupdate", onTime);
      masterEl.removeEventListener("ended", onEnded);
    };
  }, [master]);

  // Apply mute changes to non-master videos.
  useEffect(() => {
    videoRefs.current.forEach((v, id) => {
      v.muted = id === master?.id ? muted : true;
    });
  }, [muted, master?.id]);

  // Resolve which angles to render based on layout.
  const slots = useMemo<CameraAngle[]>(() => {
    switch (layout) {
      case "grid_6":
        return ["front", "back", "left_repeater", "right_repeater", "left_pillar", "right_pillar"];
      case "grid_4":
        return ["front", "back", "left_repeater", "right_repeater"];
      case "focus":
        return CAMERA_ANGLES.filter((a) => a !== (focusAngle ?? "front"));
      case "single":
        return [];
    }
  }, [layout, focusAngle]);

  if (!master) return null;

  const focused = focusAngle ?? "front";
  const focusedClip = clipByAngle(labeledClips, focused);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl border bg-black">
        {layout === "single" && (
          <SingleLayout
            clip={focusedClip}
            angle={focused}
            setVideoRef={setVideoRef}
          />
        )}
        {layout === "focus" && (
          <FocusLayout
            mainAngle={focused}
            mainClip={focusedClip}
            thumbAngles={slots}
            clips={labeledClips}
            setVideoRef={setVideoRef}
            onFocus={(a) => setFocusAngle(a)}
          />
        )}
        {(layout === "grid_4" || layout === "grid_6") && (
          <GridLayout
            angles={slots}
            clips={labeledClips}
            setVideoRef={setVideoRef}
            onFocus={(a) => {
              useViewerStore.getState().setLayout("focus");
              setFocusAngle(a);
            }}
            cols={layout === "grid_6" ? 2 : 2}
            rows={layout === "grid_6" ? 3 : 2}
          />
        )}

        {showTelemetry && telemetry && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4">
            <TelemetryOverlay sample={telemetry} />
          </div>
        )}
      </div>

      <PlaybackControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={totalDuration}
        muted={muted}
        onPlay={playAll}
        onPause={pauseAll}
        onSeek={seekAll}
        onToggleMute={() => setMuted((m) => !m)}
      />

      {/* Hidden master clip mounted off-screen if not in current layout, so it still drives sync. */}
      {master &&
        !slots.includes(master.angle as CameraAngle) &&
        layout !== "single" &&
        layout !== "focus" && (
          <video
            ref={setVideoRef(master.id)}
            src={master.url}
            muted={muted}
            playsInline
            preload="auto"
            className="hidden"
          />
        )}

      {/* Telemetry sampler (parses SEI from master's File). */}
      <TelemetrySampler clip={master} time={currentTime} onSample={setTelemetry} />
    </div>
  );
}

// ---- Layout subcomponents ---------------------------------------------------

function VideoSlot({
  clip,
  angle,
  setVideoRef,
  onFocus,
  className,
  fit = "cover",
}: {
  clip: Clip | undefined;
  angle: CameraAngle;
  setVideoRef: (id: string) => (el: HTMLVideoElement | null) => void;
  onFocus?: (angle: CameraAngle) => void;
  className?: string;
  fit?: "cover" | "contain";
}) {
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
      <div className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium tracking-wide text-white">
        {CAMERA_LABELS[angle]}
      </div>
      {onFocus && clip && (
        <div className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

function SingleLayout({
  clip,
  angle,
  setVideoRef,
}: {
  clip: Clip | undefined;
  angle: CameraAngle;
  setVideoRef: (id: string) => (el: HTMLVideoElement | null) => void;
}) {
  return (
    <div className="aspect-video w-full">
      <VideoSlot
        clip={clip}
        angle={angle}
        setVideoRef={setVideoRef}
        fit="contain"
        className="h-full w-full"
      />
    </div>
  );
}

function FocusLayout({
  mainAngle,
  mainClip,
  thumbAngles,
  clips,
  setVideoRef,
  onFocus,
}: {
  mainAngle: CameraAngle;
  mainClip: Clip | undefined;
  thumbAngles: CameraAngle[];
  clips: Clip[];
  setVideoRef: (id: string) => (el: HTMLVideoElement | null) => void;
  onFocus: (angle: CameraAngle) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="aspect-video w-full">
        <VideoSlot
          clip={mainClip}
          angle={mainAngle}
          setVideoRef={setVideoRef}
          fit="contain"
          className="h-full w-full"
        />
      </div>
      <div
        className="grid gap-px bg-black"
        style={{ gridTemplateColumns: `repeat(${thumbAngles.length}, minmax(0, 1fr))` }}
      >
        {thumbAngles.map((a) => (
          <div key={a} className="aspect-video">
            <VideoSlot
              clip={clipByAngle(clips, a)}
              angle={a}
              setVideoRef={setVideoRef}
              onFocus={onFocus}
              fit="cover"
              className="h-full w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function GridLayout({
  angles,
  clips,
  setVideoRef,
  onFocus,
  cols,
  rows,
}: {
  angles: CameraAngle[];
  clips: Clip[];
  setVideoRef: (id: string) => (el: HTMLVideoElement | null) => void;
  onFocus: (angle: CameraAngle) => void;
  cols: number;
  rows: number;
}) {
  return (
    <div
      className="grid gap-px bg-black"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        aspectRatio: `${cols * 16} / ${rows * 9}`,
      }}
    >
      {angles.map((a) => (
        <VideoSlot
          key={a}
          clip={clipByAngle(clips, a)}
          angle={a}
          setVideoRef={setVideoRef}
          onFocus={onFocus}
          fit="cover"
          className="h-full w-full"
        />
      ))}
    </div>
  );
}

function TelemetrySampler({
  clip,
  time,
  onSample,
}: {
  clip: Clip;
  time: number;
  onSample: (s: TelemetrySample | null) => void;
}) {
  const [track, setTrack] = useState<TelemetryTrack | null>(null);
  const fileRef = useRef<File | null>(null);

  useEffect(() => {
    if (fileRef.current === clip.file) return;
    fileRef.current = clip.file;
    let cancelled = false;
    setTrack(null);
    parseTeslaTelemetry(clip.file).then((t) => {
      if (!cancelled) setTrack(t);
    });
    return () => {
      cancelled = true;
    };
  }, [clip.file]);

  useEffect(() => {
    onSample(sampleAt(track, time));
  }, [track, time, onSample]);

  return null;
}
