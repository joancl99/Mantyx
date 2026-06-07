import { detectImageType } from './image-signature';

describe('detectImageType', () => {
  const pad = (head: number[]) =>
    Buffer.concat([Buffer.from(head), Buffer.alloc(12)]);

  it('detects JPEG', () => {
    expect(detectImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
  });

  it('detects PNG', () => {
    expect(
      detectImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe('png');
  });

  it('detects WebP (RIFF....WEBP)', () => {
    const buf = Buffer.from('RIFF\x00\x00\x00\x00WEBPxxxx', 'ascii');
    expect(detectImageType(buf)).toBe('webp');
  });

  it('rejects a script/text payload renamed as an image', () => {
    expect(
      detectImageType(Buffer.from('<script>alert(1)</script>')),
    ).toBeNull();
  });

  it('rejects buffers too short to identify', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
