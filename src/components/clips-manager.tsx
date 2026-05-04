"use client";

import { useMemo } from "react";
import { useViewerStore } from "@/lib/store";
import { ClipCard } from "./clip-card";
import { UploadZone } from "./upload-zone";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function ClipsManager() {
  const clips = useViewerStore((s) => s.clips);
  const clearAll = useViewerStore((s) => s.clearAll);

  const conflictIds = useMemo(() => {
    const seen = new Map<string, string[]>();
    for (const c of clips) {
      if (!c.angle) continue;
      const list = seen.get(c.angle) ?? [];
      list.push(c.id);
      seen.set(c.angle, list);
    }
    const ids = new Set<string>();
    for (const list of seen.values()) {
      if (list.length > 1) list.forEach((id) => ids.add(id));
    }
    return ids;
  }, [clips]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Clips ({clips.length})
        </h2>
        {clips.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={clearAll}
            className="text-muted-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </Button>
        )}
      </div>

      {clips.length === 0 ? (
        <UploadZone />
      ) : (
        <div className="flex flex-col gap-2">
          {clips.map((c) => (
            <ClipCard key={c.id} clip={c} conflict={conflictIds.has(c.id)} />
          ))}
          <div className="pt-1">
            <UploadZone variant="inline" />
          </div>
        </div>
      )}
    </div>
  );
}
