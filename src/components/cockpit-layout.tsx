"use client";

import { clipByAngle, type Clip } from "@/lib/store";
import { type CameraAngle } from "@/lib/cameras";
import { VideoSlot, type SetVideoRef } from "./video-slot";

// Top-down silhouette of a Model 3/Y-ish Tesla. Stylized; not to scale.
function TeslaSilhouette() {
  return (
    <svg
      viewBox="0 0 100 180"
      className="h-full w-full"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      {/* Body outline */}
      <path
        d="M 30 14
           Q 50 4   70 14
           L 78 30
           L 86 60
           L 86 130
           L 78 156
           Q 50 174  22 156
           L 14 130
           L 14 60
           L 22 30 Z"
        fill="currentColor"
        fillOpacity="0.05"
      />
      {/* Front windshield */}
      <path
        d="M 32 36 Q 50 24 68 36 L 70 56 L 30 56 Z"
        fill="currentColor"
        fillOpacity="0.08"
      />
      {/* Rear windshield */}
      <path
        d="M 32 138 Q 50 152 68 138 L 70 118 L 30 118 Z"
        fill="currentColor"
        fillOpacity="0.08"
      />
      {/* Roof / center line */}
      <line x1="50" y1="60" x2="50" y2="118" strokeOpacity="0.3" />
      {/* Wheels */}
      <rect x="6"  y="42"  width="10" height="20" rx="2" fill="currentColor" fillOpacity="0.4" stroke="none" />
      <rect x="84" y="42"  width="10" height="20" rx="2" fill="currentColor" fillOpacity="0.4" stroke="none" />
      <rect x="6"  y="120" width="10" height="20" rx="2" fill="currentColor" fillOpacity="0.4" stroke="none" />
      <rect x="84" y="120" width="10" height="20" rx="2" fill="currentColor" fillOpacity="0.4" stroke="none" />
      {/* Tesla T mark */}
      <g transform="translate(50,90)" fill="currentColor" fillOpacity="0.5" stroke="none">
        <path d="M -7 -6 L 7 -6 L 4 -3 L 4 8 L -4 8 L -4 -3 Z" />
        <circle cx="0" cy="11" r="1.2" fillOpacity="0.4" />
      </g>
      {/* Direction arrow */}
      <path d="M 50 6 L 47 12 L 53 12 Z" fill="currentColor" fillOpacity="0.6" stroke="none" />
    </svg>
  );
}

interface Props {
  clips: Clip[];
  setVideoRef: SetVideoRef;
  onFocus: (angle: CameraAngle) => void;
}

export function CockpitLayout({ clips, setVideoRef, onFocus }: Props) {
  const slot = (
    angle: CameraAngle,
    style: React.CSSProperties,
  ) => (
    <div
      className="absolute overflow-hidden rounded-md ring-1 ring-white/10 shadow-lg"
      style={style}
    >
      <VideoSlot
        clip={clipByAngle(clips, angle)}
        angle={angle}
        setVideoRef={setVideoRef}
        onFocus={onFocus}
        fit="cover"
        labelClassName="text-[9px] sm:text-[10px] px-1 py-0.5 left-1 top-1"
      />
    </div>
  );

  return (
    <div className="relative w-full bg-black aspect-[4/5] sm:aspect-[5/4] mx-auto">
      {/* Centered Tesla silhouette */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[55%] aspect-[100/180] text-zinc-400">
        <TeslaSilhouette />
      </div>

      {/* FRONT — top center, wide */}
      {slot("front", {
        left: "20%",
        top: "1%",
        width: "60%",
        height: "18%",
      })}

      {/* LEFT B-PILLAR — upper-left */}
      {slot("left_pillar", {
        left: "0%",
        top: "26%",
        width: "22%",
        height: "18%",
      })}

      {/* RIGHT B-PILLAR — upper-right */}
      {slot("right_pillar", {
        right: "0%",
        top: "26%",
        width: "22%",
        height: "18%",
      })}

      {/* LEFT REPEATER — lower-left */}
      {slot("left_repeater", {
        left: "0%",
        top: "56%",
        width: "22%",
        height: "18%",
      })}

      {/* RIGHT REPEATER — lower-right */}
      {slot("right_repeater", {
        right: "0%",
        top: "56%",
        width: "22%",
        height: "18%",
      })}

      {/* REAR — bottom center, wide */}
      {slot("back", {
        left: "20%",
        bottom: "1%",
        width: "60%",
        height: "18%",
      })}
    </div>
  );
}
