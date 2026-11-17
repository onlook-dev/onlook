export const MAX_ARTIFACT_RASTER_PIXELS = 16_000_000;

export function boundedRaster(bytes: Buffer): boolean {
  let width = 0;
  let height = 0;
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString('ascii', 12, 16) === 'IHDR') {
    width = bytes.readUInt32BE(16);
    height = bytes.readUInt32BE(20);
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 255) return false;
      const marker = bytes[offset + 1];
      if (marker === undefined || marker === 218 || marker === 217) break;
      if (marker === 255) { offset += 1; continue; }
      const length = bytes.readUInt16BE(offset + 2);
      if (length < 2 || offset + length + 2 > bytes.length) return false;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        if (length < 8) return false;
        height = bytes.readUInt16BE(offset + 5);
        width = bytes.readUInt16BE(offset + 7);
        break;
      }
      offset += length + 2;
    }
  }
  return width > 0 && height > 0 && width <= 8192 && height <= 8192 && width * height <= MAX_ARTIFACT_RASTER_PIXELS;
}

export function boundedFont(bytes: Buffer): boolean {
  if (bytes.length < 48) return false;
  if (!['wOFF', 'wOF2'].includes(bytes.toString('ascii', 0, 4))) return false;
  return bytes.readUInt32BE(8) === bytes.length && bytes.readUInt16BE(12) > 0 && bytes.readUInt16BE(12) <= 128 && bytes.readUInt32BE(16) <= 20 * 1024 * 1024;
}
