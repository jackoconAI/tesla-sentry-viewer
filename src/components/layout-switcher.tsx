"use client";

import {
  Car,
  Grid2x2,
  Grid3x3,
  LayoutPanelTop,
  Maximize,
  Orbit,
  PictureInPicture2,
} from "lucide-react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LAYOUT_KINDS,
  LAYOUT_LABELS,
  CAMERA_ANGLES,
  CAMERA_LABELS,
  type LayoutKind,
} from "@/lib/cameras";
import { useViewerStore } from "@/lib/store";

const ICONS: Record<LayoutKind, React.ReactNode> = {
  spatial: <LayoutPanelTop className="h-4 w-4" />,
  cockpit: <Car className="h-4 w-4" />,
  pano360: <Orbit className="h-4 w-4" />,
  grid_6: <Grid3x3 className="h-4 w-4" />,
  grid_4: <Grid2x2 className="h-4 w-4" />,
  focus: <PictureInPicture2 className="h-4 w-4" />,
  single: <Maximize className="h-4 w-4" />,
};

export function LayoutSwitcher() {
  const layout = useViewerStore((s) => s.layout);
  const setLayout = useViewerStore((s) => s.setLayout);
  const focusAngle = useViewerStore((s) => s.focusAngle);
  const setFocusAngle = useViewerStore((s) => s.setFocusAngle);
  const clips = useViewerStore((s) => s.clips);

  const labeledAngles = clips
    .map((c) => c.angle)
    .filter((a): a is (typeof CAMERA_ANGLES)[number] => a !== null);

  const showFocusPicker = layout === "focus" || layout === "single";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="-mx-1 max-w-full overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ToggleGroup
          value={[layout]}
          onValueChange={(v) => {
            const next = v[0] as LayoutKind | undefined;
            if (next) setLayout(next);
          }}
          variant="outline"
          size="sm"
        >
          {LAYOUT_KINDS.map((k) => (
            <ToggleGroupItem key={k} value={k} aria-label={LAYOUT_LABELS[k]}>
              {ICONS[k]}
              <span className="ml-1.5 hidden md:inline">
                {LAYOUT_LABELS[k]}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {showFocusPicker && (
        <Select
          value={focusAngle ?? "front"}
          onValueChange={(v) => setFocusAngle(v as never)}
        >
          <SelectTrigger size="sm" className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {labeledAngles.map((a) => (
              <SelectItem key={a} value={a}>
                {CAMERA_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
