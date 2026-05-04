// Tesla Dashcam SEI telemetry parser.
//
// Adapted from teslamotors/dashcam (dashcam-mp4.js + dashcam.proto, MIT).
// Telemetry availability requires Tesla firmware 2025.44.25+ on HW3+,
// or any clip downloaded via the Tesla mobile app v4.55.6+.
//
// The clip's H.264 mdat contains user-data SEI NAL units carrying a
// protobuf-encoded SeiMetadata message. We walk the MP4 box tree to find
// frame timing (stts/mdhd), then walk mdat for SEI NALs and decode them.

export type Gear = "P" | "D" | "R" | "N";
export type AutopilotState = "off" | "fsd" | "autosteer" | "tacc";

export interface TelemetrySample {
  t: number; // Time offset within the clip (seconds)
  speed?: number; // m/s
  steering?: number; // degrees, positive = right
  fsd?: AutopilotState;
  gear?: Gear;
  turnSignal?: "off" | "left" | "right";
  brake?: boolean;
  accelerator?: number; // 0..1
  lat?: number;
  lon?: number;
  heading?: number;
}

export interface TelemetryTrack {
  samples: TelemetrySample[];
}

const GEAR_MAP: Record<number, Gear> = { 0: "P", 1: "D", 2: "R", 3: "N" };
const AP_MAP: Record<number, AutopilotState> = {
  0: "off",
  1: "fsd",
  2: "autosteer",
  3: "tacc",
};

export async function parseTeslaTelemetry(
  file: File,
): Promise<TelemetryTrack | null> {
  try {
    // Tesla clips are typically 5-15 MB per 60-second segment; full read is fine.
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const mp4 = new DashcamMP4(buffer, view);
    const config = mp4.getConfig();
    const samples = mp4.parseSamples(config.durations);
    if (samples.length === 0) return null;
    return { samples };
  } catch {
    return null;
  }
}

export function sampleAt(
  track: TelemetryTrack | null,
  t: number,
): TelemetrySample | null {
  if (!track || track.samples.length === 0) return null;
  let lo = 0;
  let hi = track.samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (track.samples[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return track.samples[lo];
}

// --- MP4 + SEI parser ---------------------------------------------------------

interface BoxRange {
  start: number;
  end: number;
  size: number;
}

interface Mp4Config {
  width: number;
  height: number;
  timescale: number;
  durations: number[]; // ms per frame
}

class DashcamMP4 {
  private buffer: ArrayBuffer;
  private view: DataView;

  constructor(buffer: ArrayBuffer, view: DataView) {
    this.buffer = buffer;
    this.view = view;
  }

  private findBox(start: number, end: number, name: string): BoxRange {
    for (let pos = start; pos + 8 <= end; ) {
      let size = this.view.getUint32(pos);
      const type = this.readAscii(pos + 4, 4);
      const headerSize = size === 1 ? 16 : 8;
      if (size === 1) {
        const high = this.view.getUint32(pos + 8);
        const low = this.view.getUint32(pos + 12);
        size = Number((BigInt(high) << 32n) | BigInt(low));
      } else if (size === 0) {
        size = end - pos;
      }
      if (type === name) {
        return { start: pos + headerSize, end: pos + size, size: size - headerSize };
      }
      pos += size;
    }
    throw new Error(`Box "${name}" not found`);
  }

  private findMdat(): { offset: number; size: number } {
    const mdat = this.findBox(0, this.view.byteLength, "mdat");
    return { offset: mdat.start, size: mdat.size };
  }

  getConfig(): Mp4Config {
    const moov = this.findBox(0, this.view.byteLength, "moov");
    const trak = this.findBox(moov.start, moov.end, "trak");
    const mdia = this.findBox(trak.start, trak.end, "mdia");
    const minf = this.findBox(mdia.start, mdia.end, "minf");
    const stbl = this.findBox(minf.start, minf.end, "stbl");
    const stsd = this.findBox(stbl.start, stbl.end, "stsd");
    const avc1 = this.findBox(stsd.start + 8, stsd.end, "avc1");

    const width = this.view.getUint16(avc1.start + 24);
    const height = this.view.getUint16(avc1.start + 26);

    const mdhd = this.findBox(mdia.start, mdia.end, "mdhd");
    const mdhdVersion = this.view.getUint8(mdhd.start);
    const timescale =
      mdhdVersion === 1
        ? this.view.getUint32(mdhd.start + 20)
        : this.view.getUint32(mdhd.start + 12);

    const stts = this.findBox(stbl.start, stbl.end, "stts");
    const entryCount = this.view.getUint32(stts.start + 4);
    const durations: number[] = [];
    let pos = stts.start + 8;
    for (let i = 0; i < entryCount; i++) {
      const count = this.view.getUint32(pos);
      const delta = this.view.getUint32(pos + 4);
      const ms = (delta / timescale) * 1000;
      for (let j = 0; j < count; j++) durations.push(ms);
      pos += 8;
    }

    return { width, height, timescale, durations };
  }

  // Walk mdat as length-prefixed NAL units. Tesla emits one SEI NAL per frame
  // carrying the latest telemetry. Map each SEI to its frame's start time.
  parseSamples(durations: number[]): TelemetrySample[] {
    const mdat = this.findMdat();
    const samples: TelemetrySample[] = [];
    let cursor = mdat.offset;
    const end = mdat.offset + mdat.size;

    let pendingSei: Omit<TelemetrySample, "t"> | null = null;
    let frameIndex = 0;
    let elapsedMs = 0;

    while (cursor + 4 <= end) {
      const nalSize = this.view.getUint32(cursor);
      cursor += 4;
      if (nalSize < 1 || cursor + nalSize > this.view.byteLength) break;

      const firstByte = this.view.getUint8(cursor);
      const nalType = firstByte & 0x1f;

      if (nalType === 6) {
        // SEI: payload type byte, then padded length bytes (0x42 markers + 0x69 terminator)
        const sei = this.decodeSei(
          new Uint8Array(this.buffer, cursor, nalSize),
        );
        if (sei) pendingSei = sei;
      } else if (nalType === 5 || nalType === 1) {
        // IDR or non-IDR slice — counts as a video frame
        if (pendingSei) {
          samples.push({ t: elapsedMs / 1000, ...pendingSei });
          pendingSei = null;
        }
        const dur = durations[frameIndex] ?? durations[durations.length - 1] ?? 0;
        elapsedMs += dur;
        frameIndex++;
      }
      cursor += nalSize;
    }
    return samples;
  }

  // Tesla's SEI envelope: payload type (1 byte) + N×0x42 length bytes
  // + 0x69 terminator, then protobuf-encoded SeiMetadata, then 0x80 rbsp tail.
  private decodeSei(nal: Uint8Array): Omit<TelemetrySample, "t"> | null {
    if (nal.length < 4) return null;
    if (nal[1] !== 5) return null; // payload type 5 = user data unregistered

    let i = 3;
    while (i < nal.length && nal[i] === 0x42) i++;
    if (i <= 3 || i + 1 >= nal.length || nal[i] !== 0x69) return null;

    const stripped = stripEmulationBytes(nal.subarray(i + 1, nal.length - 1));
    try {
      return decodeSeiProto(stripped);
    } catch {
      return null;
    }
  }

  private readAscii(start: number, len: number): string {
    let s = "";
    for (let i = 0; i < len; i++) s += String.fromCharCode(this.view.getUint8(start + i));
    return s;
  }
}

// H.264 emulation prevention bytes: 0x000003 → 0x0000.
function stripEmulationBytes(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let zeros = 0;
  for (const byte of data) {
    if (zeros >= 2 && byte === 0x03) {
      zeros = 0;
      continue;
    }
    out.push(byte);
    zeros = byte === 0 ? zeros + 1 : 0;
  }
  return Uint8Array.from(out);
}

// --- Protobuf decoder for SeiMetadata ----------------------------------------

function decodeSeiProto(buf: Uint8Array): Omit<TelemetrySample, "t"> {
  const out: Omit<TelemetrySample, "t"> = {};
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let p = 0;
  let leftBlinker = false;
  let rightBlinker = false;

  while (p < buf.length) {
    const [tag, np] = readVarint(buf, p);
    p = np;
    const fieldNum = Number(tag >> 3n);
    const wireType = Number(tag & 0x7n);

    if (wireType === 0) {
      const [val, n2] = readVarint(buf, p);
      p = n2;
      switch (fieldNum) {
        case 2:
          out.gear = GEAR_MAP[Number(val)];
          break;
        case 7:
          leftBlinker = val !== 0n;
          break;
        case 8:
          rightBlinker = val !== 0n;
          break;
        case 9:
          out.brake = val !== 0n;
          break;
        case 10:
          out.fsd = AP_MAP[Number(val)];
          break;
      }
    } else if (wireType === 5) {
      // 32-bit float
      const v = view.getFloat32(p, true);
      p += 4;
      switch (fieldNum) {
        case 4:
          out.speed = v;
          break;
        case 5:
          out.accelerator = v;
          break;
        case 6:
          out.steering = v;
          break;
      }
    } else if (wireType === 1) {
      // 64-bit double
      const v = view.getFloat64(p, true);
      p += 8;
      switch (fieldNum) {
        case 11:
          out.lat = v;
          break;
        case 12:
          out.lon = v;
          break;
        case 13:
          out.heading = v;
          break;
      }
    } else if (wireType === 2) {
      const [len, n2] = readVarint(buf, p);
      p = n2 + Number(len);
    } else {
      // Unknown wire type — bail to avoid misalignment
      break;
    }
  }

  out.turnSignal = leftBlinker
    ? "left"
    : rightBlinker
      ? "right"
      : "off";

  return out;
}

function readVarint(buf: Uint8Array, p: number): [bigint, number] {
  let result = 0n;
  let shift = 0n;
  while (p < buf.length) {
    const byte = buf[p++];
    result |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return [result, p];
    shift += 7n;
    if (shift > 63n) throw new Error("varint too long");
  }
  throw new Error("unexpected EOF in varint");
}
