import { describe, it, expect } from 'vitest';

/**
 * Tests for Firebase Extension resize path construction.
 * Verifies the path pattern matches what the Extension actually outputs.
 */

function buildResizedPath(originalPath, size = '1500x1500') {
  const lastSlash = originalPath.lastIndexOf('/');
  const dir = originalPath.substring(0, lastSlash);
  const filename = originalPath.substring(lastSlash + 1).replace(/\.[^.]+$/, '');
  return `${dir}/resized/${filename}_${size}.webp`;
}

describe('Resize path construction', () => {
  it('builds correct path for standard upload', () => {
    const original = 'uploads/uid123/proj456/p67075_STUD4970.jpg';
    expect(buildResizedPath(original)).toBe(
      'uploads/uid123/proj456/resized/p67075_STUD4970_1500x1500.webp'
    );
  });

  it('builds correct path for 400x400 size', () => {
    const original = 'uploads/uid/proj/p1_photo.jpg';
    expect(buildResizedPath(original, '400x400')).toBe(
      'uploads/uid/proj/resized/p1_photo_400x400.webp'
    );
  });

  it('handles filenames with dots correctly', () => {
    const original = 'uploads/uid/proj/p1_photo.2024.jan.jpg';
    // Only the last extension should be stripped
    expect(buildResizedPath(original)).toBe(
      'uploads/uid/proj/resized/p1_photo.2024.jan_1500x1500.webp'
    );
  });

  it('handles PNG uploads', () => {
    const original = 'uploads/uid/proj/p5_screenshot.png';
    expect(buildResizedPath(original)).toBe(
      'uploads/uid/proj/resized/p5_screenshot_1500x1500.webp'
    );
  });

  it('handles sanitized filenames with underscores', () => {
    const original = 'uploads/uid/proj/p100_my_photo_file.jpg';
    expect(buildResizedPath(original)).toBe(
      'uploads/uid/proj/resized/p100_my_photo_file_1500x1500.webp'
    );
  });

  it('preserves full directory structure', () => {
    const original = 'uploads/Dn14Psl0vhhce5tVaLJdEYWmzdw2/4017/p67075_STUD4970.jpg';
    const result = buildResizedPath(original);
    expect(result).toContain('uploads/Dn14Psl0vhhce5tVaLJdEYWmzdw2/4017/resized/');
    expect(result.endsWith('_1500x1500.webp')).toBe(true);
  });
});

describe('Filename sanitization', () => {
  // This tests the same regex used in uploadPhoto
  function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  it('preserves clean filenames', () => {
    expect(sanitizeFilename('photo.jpg')).toBe('photo.jpg');
    expect(sanitizeFilename('STUD4970.jpg')).toBe('STUD4970.jpg');
  });

  it('replaces spaces with underscores', () => {
    expect(sanitizeFilename('my photo.jpg')).toBe('my_photo.jpg');
  });

  it('replaces special characters', () => {
    expect(sanitizeFilename('photo (1).jpg')).toBe('photo__1_.jpg');
  });

  it('handles unicode characters', () => {
    expect(sanitizeFilename('фото.jpg')).toBe('____.jpg');
  });
});
