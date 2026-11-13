import type { ContentEntry } from "../types";

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

export function parseContentEntries(bytes: Uint8Array): ContentEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries: ContentEntry[] = [];

  for (let offset = 0x40; offset + 0x20 <= 0x400; offset += 0x20) {
    const pad = readU32(view, offset + 12);
    if (pad !== 0xcccccccc) break;

    const nameBytes = bytes.subarray(offset + 16, offset + 32);
    let end = nameBytes.indexOf(0);
    if (end < 0) end = nameBytes.length;
    if (end === 0) break;

    const name = new TextDecoder().decode(nameBytes.subarray(0, end));
    if (
      ![...name].every((ch) => {
        const code = ch.charCodeAt(0);
        return code >= 32 && code < 127;
      })
    ) {
      break;
    }

    const contentOffset = readU32(view, offset);
    const size = readU32(view, offset + 4);
    entries.push({
      name,
      offset: contentOffset,
      size,
      end: contentOffset + size,
    });
  }

  return entries;
}
