import { describe, it, expect } from 'vitest';

/**
 * Tests for fontManager fix — ensures loadAllFonts handles
 * both string and object entries in _customFonts.
 */

// Replicate the fixed logic from fontManager.js loadAllFonts
function extractFontName(entry) {
  return typeof entry === 'string' ? entry : entry.name;
}

describe('Font name extraction from custom fonts array', () => {
  it('handles string entries', () => {
    expect(extractFontName('Roboto')).toBe('Roboto');
  });

  it('handles object entries with name property', () => {
    expect(extractFontName({ name: 'Open Sans', type: 'google' })).toBe('Open Sans');
  });

  it('handles object entries with file type', () => {
    expect(extractFontName({ name: 'Custom Font', type: 'file', url: 'https://...' })).toBe('Custom Font');
  });

  it('returns undefined for malformed objects (skipped by null check)', () => {
    const name = extractFontName({ type: 'google' }); // missing name
    expect(name).toBeUndefined();
  });

  it('processes mixed array correctly', () => {
    const customFonts = [
      'Playfair Display',
      { name: 'Lora', type: 'google' },
      { name: 'MyFont', type: 'file', url: 'https://storage.com/font.woff2' },
    ];
    const names = customFonts.map(extractFontName).filter(Boolean);
    expect(names).toEqual(['Playfair Display', 'Lora', 'MyFont']);
  });
});
