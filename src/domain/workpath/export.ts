import { compileToIdeateBundle, IDEATE_FILES } from "../ideate/compiler.js";
import { type SopGraph } from "../sop/index.js";
import {
  buildGeneratedPacketFiles,
  buildWorkpathManifest,
  WORKPATH_PROGRAM_FILE
} from "./packet.js";
import { compileToWorkflowProgram } from "./program.js";

export interface WorkpathExportOptions {
  compilerVersion?: string;
  createdAt?: string;
}

export function buildWorkpathExportFiles(
  source: SopGraph,
  options: WorkpathExportOptions = {}
): Record<string, string> {
  const compilerVersion = options.compilerVersion ?? "workpath-compiler@0.1.0";
  const bundle = compileToIdeateBundle(source, {
    compilerVersion,
    createdAt: options.createdAt,
    exportMode: "specification"
  });
  const files: Record<string, string> = {};
  for (const fileName of IDEATE_FILES) {
    files[fileName] = recordsToJsonl(bundle[fileName]);
  }
  const program = compileToWorkflowProgram(source);
  return {
    ...files,
    [WORKPATH_PROGRAM_FILE]: `${JSON.stringify(program, null, 2)}\n`,
    ...buildGeneratedPacketFiles(program),
    "sop.json": `${JSON.stringify(source, null, 2)}\n`,
    "canvas.json": `${JSON.stringify(source.canvas, null, 2)}\n`,
    "workpath.json": `${JSON.stringify(buildWorkpathManifest(source, compilerVersion), null, 2)}\n`
  };
}

function recordsToJsonl(records: unknown[]): string {
  if (!records.length) {
    return "";
  }
  return records.map((record) => JSON.stringify(record)).join("\n") + "\n";
}

export function buildZip(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const [fileName, contents] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    const name = encoder.encode(fileName);
    const data = encoder.encode(contents);
    const crc = crc32(data);
    const localHeader = zipLocalHeader(name, data, crc);
    localParts.push(localHeader, data);
    centralParts.push(zipCentralDirectoryHeader(name, data, crc, offset));
    offset += localHeader.byteLength + data.byteLength;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
  const end = zipEndOfCentralDirectory(centralParts.length, centralSize, centralOffset);
  return concatUint8Arrays([...localParts, ...centralParts, end]);
}

function zipLocalHeader(name: Uint8Array, data: Uint8Array, crc: number): Uint8Array {
  const header = new Uint8Array(30 + name.byteLength);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, data.byteLength, true);
  view.setUint32(22, data.byteLength, true);
  view.setUint16(26, name.byteLength, true);
  header.set(name, 30);
  return header;
}

function zipCentralDirectoryHeader(
  name: Uint8Array,
  data: Uint8Array,
  crc: number,
  localHeaderOffset: number
): Uint8Array {
  const header = new Uint8Array(46 + name.byteLength);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, data.byteLength, true);
  view.setUint32(24, data.byteLength, true);
  view.setUint16(28, name.byteLength, true);
  view.setUint32(42, localHeaderOffset, true);
  header.set(name, 46);
  return header;
}

function zipEndOfCentralDirectory(entryCount: number, centralSize: number, centralOffset: number): Uint8Array {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return header;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = new Uint32Array(
  Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  })
);

function concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}
