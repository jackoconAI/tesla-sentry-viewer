export const CAMERA_ANGLES = [
  "front",
  "back",
  "left_repeater",
  "right_repeater",
  "left_pillar",
  "right_pillar",
] as const;

export type CameraAngle = (typeof CAMERA_ANGLES)[number];

export const CAMERA_LABELS: Record<CameraAngle, string> = {
  front: "Front",
  back: "Rear",
  left_repeater: "Left Repeater",
  right_repeater: "Right Repeater",
  left_pillar: "Left B-Pillar",
  right_pillar: "Right B-Pillar",
};

export const CAMERA_SHORT_LABELS: Record<CameraAngle, string> = {
  front: "F",
  back: "R",
  left_repeater: "LR",
  right_repeater: "RR",
  left_pillar: "LP",
  right_pillar: "RP",
};

// 6-grid: front big across the top, then 5 below.
// 4-grid: classic Tesla 4-cam (front, back, left, right).
// Focus: one big + thumbnails for the rest.
export const LAYOUT_KINDS = [
  "grid_6",
  "grid_4",
  "focus",
  "single",
] as const;

export type LayoutKind = (typeof LAYOUT_KINDS)[number];

export const LAYOUT_LABELS: Record<LayoutKind, string> = {
  grid_6: "Grid (6)",
  grid_4: "Grid (4)",
  focus: "Focus",
  single: "Single",
};
