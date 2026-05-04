"use client";

import { create } from "zustand";
import type { CameraAngle, LayoutKind } from "./cameras";

export interface Clip {
  id: string;
  file: File;
  url: string;
  filename: string;
  angle: CameraAngle | null;
  duration: number | null;
}

interface ViewerState {
  clips: Clip[];
  layout: LayoutKind;
  focusAngle: CameraAngle | null;
  showTelemetry: boolean;

  addClips: (files: File[]) => void;
  removeClip: (id: string) => void;
  setAngle: (id: string, angle: CameraAngle | null) => void;
  setDuration: (id: string, duration: number) => void;
  setLayout: (layout: LayoutKind) => void;
  setFocusAngle: (angle: CameraAngle | null) => void;
  setShowTelemetry: (show: boolean) => void;
  clearAll: () => void;
}

import { detectCameraAngle, suggestUnusedAngle } from "./camera-detect";

export const useViewerStore = create<ViewerState>((set, get) => ({
  clips: [],
  layout: "grid_4",
  focusAngle: null,
  showTelemetry: true,

  addClips: (files) =>
    set((s) => {
      const usedAngles = new Set<CameraAngle>(
        s.clips.map((c) => c.angle).filter((a): a is CameraAngle => a !== null),
      );
      const newClips: Clip[] = files.map((file) => {
        let angle = detectCameraAngle(file.name);
        if (angle && usedAngles.has(angle)) angle = null;
        if (!angle) angle = suggestUnusedAngle(usedAngles);
        if (angle) usedAngles.add(angle);
        return {
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
          filename: file.name,
          angle,
          duration: null,
        };
      });
      return { clips: [...s.clips, ...newClips] };
    }),

  removeClip: (id) =>
    set((s) => {
      const clip = s.clips.find((c) => c.id === id);
      if (clip) URL.revokeObjectURL(clip.url);
      return { clips: s.clips.filter((c) => c.id !== id) };
    }),

  setAngle: (id, angle) =>
    set((s) => ({
      clips: s.clips.map((c) => {
        if (c.id !== id) {
          // If another clip already had this angle, clear it (one clip per angle).
          if (angle && c.angle === angle) return { ...c, angle: null };
          return c;
        }
        return { ...c, angle };
      }),
    })),

  setDuration: (id, duration) =>
    set((s) => ({
      clips: s.clips.map((c) => (c.id === id ? { ...c, duration } : c)),
    })),

  setLayout: (layout) => set({ layout }),
  setFocusAngle: (focusAngle) => set({ focusAngle }),
  setShowTelemetry: (showTelemetry) => set({ showTelemetry }),

  clearAll: () =>
    set((s) => {
      s.clips.forEach((c) => URL.revokeObjectURL(c.url));
      return { clips: [], focusAngle: null };
    }),
}));

// Convenience selectors
export function clipByAngle(clips: Clip[], angle: CameraAngle): Clip | undefined {
  return clips.find((c) => c.angle === angle);
}

export function maxDuration(clips: Clip[]): number {
  return clips.reduce((max, c) => Math.max(max, c.duration ?? 0), 0);
}
