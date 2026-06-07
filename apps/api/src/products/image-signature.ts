export type ImageType = 'jpg' | 'png' | 'webp';

/**
 * Detects the real image type from a file's magic bytes, ignoring the
 * (user-controlled) extension and declared MIME type. Returns null when the
 * content is not one of the allowed image formats — so a script renamed to
 * `.png` is rejected instead of being stored and served.
 */
export function detectImageType(buf: Buffer): ImageType | null {
  if (!buf || buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: "RIFF" <4 bytes size> "WEBP"
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}
