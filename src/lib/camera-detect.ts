import { CAMERA_ANGLES, type CameraAngle } from "./cameras";

// Tesla USB filenames look like: 2024-01-01_12-00-00-front.mp4
// Mobile-app downloads vary — sometimes no angle in the name. Be tolerant.
const PATTERNS: Array<[RegExp, CameraAngle]> = [
  [/left[_\- ]?repeater/i, "left_repeater"],
  [/right[_\- ]?repeater/i, "right_repeater"],
  [/left[_\- ]?(?:b[_\- ]?)?pillar/i, "left_pillar"],
  [/right[_\- ]?(?:b[_\- ]?)?pillar/i, "right_pillar"],
  [/(?:^|[_\- ])front(?:[_\- .]|$)/i, "front"],
  [/(?:^|[_\- ])(?:back|rear)(?:[_\- .]|$)/i, "back"],
];

export function detectCameraAngle(filename: string): CameraAngle | null {
  for (const [pattern, angle] of PATTERNS) {
    if (pattern.test(filename)) return angle;
  }
  return null;
}

// Tesla USB clips share a timestamp prefix across the 4-6 angles, e.g.
// 2024-01-01_12-00-00-front.mp4, 2024-01-01_12-00-00-back.mp4 ...
const TIMESTAMP_RE = /(\d{4}-\d{2}-\d{2}[_T]\d{2}-\d{2}-\d{2})/;

export function extractTimestamp(filename: string): string | null {
  const m = filename.match(TIMESTAMP_RE);
  return m ? m[1] : null;
}

// When users upload a batch, fill in unlabeled ones by trying each unused angle.
export function suggestUnusedAngle(used: Set<CameraAngle>): CameraAngle | null {
  for (const a of CAMERA_ANGLES) {
    if (!used.has(a)) return a;
  }
  return null;
}
