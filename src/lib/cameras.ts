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

// spatial:  3×2 with forward cams on top, rear on bottom — flattened panorama.
// cockpit:  Tesla silhouette in the middle, cams anchored at physical positions.
// pano360:  WebGL cylinder; drag to look around the vehicle.
// grid_*:   classic flat grids.
// focus:    one big + thumbs for the rest.
// single:   one camera fullscreen.
export const LAYOUT_KINDS = [
  "spatial",
  "cockpit",
  "pano360",
  "grid_6",
  "grid_4",
  "focus",
  "single",
] as const;

export type LayoutKind = (typeof LAYOUT_KINDS)[number];

export const LAYOUT_LABELS: Record<LayoutKind, string> = {
  spatial: "Spatial",
  cockpit: "Cockpit",
  pano360: "360°",
  grid_6: "Grid (6)",
  grid_4: "Grid (4)",
  focus: "Focus",
  single: "Single",
};

// Spatial 3×2 mapping: forward cams on top, rear cams on bottom; ports on left.
export const SPATIAL_GRID: CameraAngle[][] = [
  ["left_pillar", "front", "right_pillar"],
  ["left_repeater", "back", "right_repeater"],
];

// Yaw angle (degrees, 0 = forward, clockwise) for each camera on the cylinder.
export const CAMERA_YAW_DEG: Record<CameraAngle, number> = {
  front: 0,
  right_pillar: 60,
  right_repeater: 120,
  back: 180,
  left_repeater: 240,
  left_pillar: 300,
};
