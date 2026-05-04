"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FilmIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewerStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "hero" | "inline";
}

export function UploadZone({ variant = "hero" }: Props) {
  const addClips = useViewerStore((s) => s.addClips);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) =>
        f.type.startsWith("video/") || f.name.toLowerCase().endsWith(".mp4"),
      );
      if (files.length === 0) {
        toast.error("No video files detected. Tesla clips are .mp4 files.");
        return;
      }
      addClips(files);
      toast.success(
        `Added ${files.length} clip${files.length === 1 ? "" : "s"}`,
      );
    },
    [addClips],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  if (variant === "inline") {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mp4"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Add clips
        </Button>
      </>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-colors",
        "bg-card/50 backdrop-blur",
        dragOver
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mp4"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <FilmIcon className="h-8 w-8" />
      </div>

      <h2 className="text-xl sm:text-2xl font-semibold">
        Upload your dashcam clips
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        Pick the front, rear, and side clips you saved from the Tesla app.
        We&apos;ll sync them and play all angles together.
      </p>

      <Button
        size="lg"
        className="mt-6"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        Choose video files
      </Button>

      <p className="mt-4 text-xs text-muted-foreground">
        or drop them here · all processing stays on your device
      </p>
    </div>
  );
}
