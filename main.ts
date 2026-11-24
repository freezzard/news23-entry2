// news23-entry2 courier: carries the kept broadsheet to the output dir.
//
// The page was painted once, in the session that built this entry, by a
// Pillow script that runs outside this repository; the finished picture is
// kept beside this program as entry.png. This courier inspects the kept
// picture end to end -- its magic bytes, every chunk seal, its header
// fields, the pinned sha256 digest, and one full inflation of the pixel
// stream -- and then carries the exact bytes to the output path. The same
// kept bytes always leave as the same output bytes, so repeated runs are
// byte-identical.
//
// Usage:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program writes entry.png (1024x1024, 249458 bytes) to /output by
// default, or to MAKEFUN_OUTPUT_DIR when that is set. It needs nothing but
// the Node standard library and no network.

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { inflateSync } from "node:zlib";

const PINNED_DIGEST =
  "9b5b1884e5a593a5aa889170aeb4b01a6bd8c5c22a920c0acc689bb637e989c3";
const PINNED_LENGTH = 249458;
const MAX_BYTES = 1024 * 1024;
const EXPECTED_WIDTH = 1024;
const EXPECTED_HEIGHT = 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ENTRY_NAME = "entry.png";

type ChunkNote = {
  kind: string;
  payloadLength: number;
  crcOk: boolean;
};

type PictureReport = {
  width: number;
  height: number;
  bitDepth: number;
  colourKind: number;
  chunkCount: number;
  idatBytes: number;
  inflatedBytes: number;
  expectedInflated: number;
};

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let remainder = n;
    for (let k = 0; k < 8; k += 1) {
      const lowBit = remainder & 1;
      const shifted = remainder >>> 1;
      let stepped = shifted;
      if (lowBit !== 0) {
        stepped = shifted ^ 0xedb88320;
      }
      remainder = stepped;
    }
    table[n] = remainder >>> 0;
  }
  return table;
}

const CRC_TABLE = buildCrcTable();

function crc32Of(octetRun: Buffer): number {
  let running = 0xffffffff;
  for (let i = 0; i < octetRun.length; i += 1) {
    const slot = (running ^ octetRun[i]) & 0xff;
    running = (running >>> 8) ^ CRC_TABLE[slot];
  }
  const sealed = (running ^ 0xffffffff) >>> 0;
  return sealed;
}

function readBigEndian32(octetRun: Buffer, startAt: number): number {
  const value =
    octetRun[startAt] * 0x1000000 +
    octetRun[startAt + 1] * 0x10000 +
    octetRun[startAt + 2] * 0x100 +
    octetRun[startAt + 3];
  return value;
}

function sha256Hex(octetRun: Buffer): string {
  const hasher = createHash("sha256");
  hasher.update(octetRun);
  const digest = hasher.digest("hex");
  return digest;
}

function checkMagic(octetRun: Buffer): void {
  if (octetRun.length < PNG_MAGIC.length) {
    throw new Error("picture is shorter than the PNG magic");
  }
  for (let i = 0; i < PNG_MAGIC.length; i += 1) {
    if (octetRun[i] !== PNG_MAGIC[i]) {
      throw new Error("picture does not start with the PNG magic");
    }
  }
}

function resolveOutputDir(): string {
  const named = process.env.MAKEFUN_OUTPUT_DIR;
  let chosen = "/output";
  if (named !== undefined) {
    if (named !== "") {
      chosen = named;
    }
  }
  return chosen;
}

function scriptDir(): string {
  const launched = process.argv[1];
  let found = process.cwd();
  if (launched !== undefined) {
    if (launched !== "") {
      found = dirname(launched);
    }
  }
  return found;
}

function locatePicture(): string {
  const besideScript = join(scriptDir(), ENTRY_NAME);
  let located = besideScript;
  if (existsSync(besideScript) === false) {
    located = join(process.cwd(), ENTRY_NAME);
  }
  return located;
}

function inspectPicture(octetRun: Buffer): {
  notes: ChunkNote[];
  header: PictureReport;
} {
  let octetWalker = PNG_MAGIC.length;
  const notes: ChunkNote[] = [];
  const idatParts: Buffer[] = [];
  let headerSeen = false;
  let endSeen = false;
  let widthSeen = 0;
  let heightSeen = 0;
  let depthSeen = 0;
  let colourSeen = 0;
  let idatTotal = 0;
  while (octetWalker + 12 <= octetRun.length) {
    const payloadLength = readBigEndian32(octetRun, octetWalker);
    const kind = octetRun
      .subarray(octetWalker + 4, octetWalker + 8)
      .toString("latin1");
    const dataStart = octetWalker + 8;
    const dataEnd = dataStart + payloadLength;
    const crcStart = dataEnd;
    if (dataEnd + 4 > octetRun.length) {
      throw new Error(`chunk ${kind} runs past the end of the file`);
    }
    const storedCrc = readBigEndian32(octetRun, crcStart);
    const sealedSpan = Buffer.concat([
      octetRun.subarray(octetWalker + 4, octetWalker + 8),
      octetRun.subarray(dataStart, dataEnd),
    ]);
    const computedCrc = crc32Of(sealedSpan);
    const crcOk = storedCrc === computedCrc;
    if (crcOk === false) {
      throw new Error(`chunk ${kind} fails its CRC-32 seal`);
    }
    notes.push({ kind, payloadLength, crcOk });
    if (kind === "IHDR") {
      if (headerSeen) {
        throw new Error("picture carries two IHDR chunks");
      }
      if (notes.length !== 1) {
        throw new Error("IHDR is not the first chunk");
      }
      if (payloadLength !== 13) {
        throw new Error("IHDR payload is not 13 bytes");
      }
      widthSeen = readBigEndian32(octetRun, dataStart);
      heightSeen = readBigEndian32(octetRun, dataStart + 4);
      depthSeen = octetRun[dataStart + 8];
      colourSeen = octetRun[dataStart + 9];
      const compressionKind = octetRun[dataStart + 10];
      const filterKind = octetRun[dataStart + 11];
      const interlaceKind = octetRun[dataStart + 12];
      if (compressionKind !== 0) {
        throw new Error("IHDR names an unknown compression method");
      }
      if (filterKind !== 0) {
        throw new Error("IHDR names an unknown filter method");
      }
      if (interlaceKind !== 0) {
        throw new Error("picture is interlaced; expected a plain scan");
      }
      headerSeen = true;
    }
    if (kind === "IDAT") {
      idatParts.push(octetRun.subarray(dataStart, dataEnd));
      idatTotal += payloadLength;
    }
    if (kind === "IEND") {
      if (payloadLength !== 0) {
        throw new Error("IEND carries a payload");
      }
      endSeen = true;
      octetWalker = crcStart + 4;
      if (octetWalker !== octetRun.length) {
        throw new Error("bytes follow the IEND chunk");
      }
    }
    if (kind !== "IEND") {
      octetWalker = crcStart + 4;
    }
  }
  if (headerSeen === false) {
    throw new Error("picture carries no IHDR chunk");
  }
  if (endSeen === false) {
    throw new Error("picture carries no IEND chunk");
  }
  if (octetWalker !== octetRun.length) {
    throw new Error("chunk walk stopped before the end of the file");
  }
  if (widthSeen !== EXPECTED_WIDTH) {
    throw new Error(`picture width is ${widthSeen}, expected ${EXPECTED_WIDTH}`);
  }
  if (heightSeen !== EXPECTED_HEIGHT) {
    throw new Error(
      `picture height is ${heightSeen}, expected ${EXPECTED_HEIGHT}`,
    );
  }
  if (depthSeen !== 8) {
    throw new Error(`bit depth is ${depthSeen}, expected 8`);
  }
  let bytesPerPixel = 0;
  if (colourSeen === 2) {
    bytesPerPixel = 3;
  }
  if (colourSeen === 6) {
    bytesPerPixel = 4;
  }
  if (bytesPerPixel === 0) {
    throw new Error(`colour type is ${colourSeen}, expected 2 or 6`);
  }
  if (idatParts.length === 0) {
    throw new Error("picture carries no IDAT pixel data");
  }
  const joinedPixels = Buffer.concat(idatParts);
  let inflated: Buffer;
  try { inflated = inflateSync(joinedPixels); } catch (caughtErr) {
    const reason =
      caughtErr instanceof Error ? caughtErr.message : String(caughtErr);
    throw new Error(`pixel stream does not inflate: ${reason}`);
  }
  const expectedInflated =
    EXPECTED_HEIGHT * (1 + EXPECTED_WIDTH * bytesPerPixel);
  if (inflated.length !== expectedInflated) {
    throw new Error(
      `inflated pixel stream is ${inflated.length} bytes, expected ${expectedInflated}`,
    );
  }
  const header: PictureReport = {
    width: widthSeen,
    height: heightSeen,
    bitDepth: depthSeen,
    colourKind: colourSeen,
    chunkCount: notes.length,
    idatBytes: idatTotal,
    inflatedBytes: inflated.length,
    expectedInflated,
  };
  const inspected = { notes, header };
  return inspected;
}

function main(): void {
  const picturePath = locatePicture();
  if (existsSync(picturePath) === false) {
    throw new Error(`kept picture is missing: ${picturePath}`);
  }
  const keptBytes = readFileSync(picturePath);
  if (keptBytes.length !== PINNED_LENGTH) {
    throw new Error(
      `kept picture is ${keptBytes.length} bytes, pinned length is ${PINNED_LENGTH}`,
    );
  }
  if (keptBytes.length >= MAX_BYTES) {
    throw new Error(
      `kept picture is ${keptBytes.length} bytes, over the 1 MiB ceiling`,
    );
  }
  const digest = sha256Hex(keptBytes);
  if (digest !== PINNED_DIGEST) {
    throw new Error("kept picture digest does not match the pinned digest");
  }
  checkMagic(keptBytes);
  const inspected = inspectPicture(keptBytes);
  const report = inspected.header;
  const outDir = resolveOutputDir();
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, ENTRY_NAME);
  writeFileSync(outPath, keptBytes);
  const carried = readFileSync(outPath);
  if (carried.equals(keptBytes) === false) {
    throw new Error("output bytes differ from the kept picture");
  }
  console.log(`courier: ${ENTRY_NAME} ${report.width}x${report.height}`);
  console.log(`courier: bit depth ${report.bitDepth}, colour type ${report.colourKind}`);
  console.log(`courier: ${report.chunkCount} chunks, ${report.idatBytes} IDAT bytes`);
  console.log(
    `courier: pixel stream inflated to ${report.inflatedBytes} bytes, as expected`,
  );
  console.log(`courier: sha256 ${digest}`);
  console.log(`courier: ${keptBytes.length} bytes carried to ${outPath}`);
}

try { main(); } catch (caughtErr) {
  const reason =
    caughtErr instanceof Error ? caughtErr.message : String(caughtErr);
  console.error(`courier failed: ${reason}`);
  process.exit(1);
}
