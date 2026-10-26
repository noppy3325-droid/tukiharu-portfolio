// A small synthetic EXIF block for actual parser tests; no personal photographs or GPS.
export function photoExifFixture(littleEndian = true, model = "Z 50II", iso = 400): Uint8Array {
  const bytes = new Uint8Array(512);
  const view = new DataView(bytes.buffer);
  bytes.set(littleEndian ? [73, 73] : [77, 77]);
  const u16 = (offset: number, value: number) => view.setUint16(offset, value, littleEndian);
  const u32 = (offset: number, value: number) => view.setUint32(offset, value, littleEndian);
  u16(2, 42); u32(4, 8);
  let data = 240;
  const ascii = (entry: number, tag: number, value: string) => {
    const encoded = new TextEncoder().encode(`${value}\0`);
    u16(entry, tag); u16(entry + 2, 2); u32(entry + 4, encoded.length);
    if (encoded.length <= 4) bytes.set(encoded, entry + 8);
    else { u32(entry + 8, data); bytes.set(encoded, data); data += encoded.length; }
  };
  const rational = (entry: number, tag: number, numerator: number, denominator: number) => {
    u16(entry, tag); u16(entry + 2, 5); u32(entry + 4, 1); u32(entry + 8, data);
    u32(data, numerator); u32(data + 4, denominator); data += 8;
  };
  u16(8, 3);
  ascii(10, 0x010f, "Nikon"); ascii(22, 0x0110, model);
  u16(34, 0x8769); u16(36, 4); u32(38, 1); u32(42, 60);
  u16(60, 6);
  rational(62, 0x829a, 1, 250);
  rational(74, 0x829d, 28, 10);
  u16(86, 0x8827); u16(88, 3); u32(90, 1); u16(94, iso);
  ascii(98, 0x9003, "2026:10:13 14:15:16");
  rational(110, 0x920a, 40, 1);
  ascii(122, 0xa434, "NIKKOR Z 40mm f/2");
  return bytes.slice(0, data);
}

export function jpegExifFixture(tiff = photoExifFixture()): Uint8Array {
  const payload = new Uint8Array(tiff.length + 6);
  payload.set([69, 120, 105, 102, 0, 0]); payload.set(tiff, 6);
  const length = payload.length + 2;
  return new Uint8Array([255, 216, 255, 225, length >> 8, length & 255, ...Array.from(payload), 255, 217]);
}

export function webpExifFixture(): Uint8Array {
  const tiff = photoExifFixture();
  const length = tiff.length + (tiff.length % 2);
  const bytes = new Uint8Array(20 + length);
  bytes.set(new TextEncoder().encode("RIFF"));
  new DataView(bytes.buffer).setUint32(4, bytes.length - 8, true);
  bytes.set(new TextEncoder().encode("WEBPEXIF"), 8);
  new DataView(bytes.buffer).setUint32(16, tiff.length, true);
  bytes.set(tiff, 20);
  return bytes;
}
