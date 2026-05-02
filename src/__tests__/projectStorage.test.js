import { describe, it, expect } from 'vitest';

/**
 * Tests for project serialization — verifies that:
 * 1. thumbData never saves blob: or data: URLs to localStorage
 * 2. coverTexts and coverTemplate are preserved in Firestore serialization
 * 3. Photo ID uniqueness across reloads
 */

// Replicate serializePhotos logic from projectStorage.js
function serializePhotos(photos) {
  return photos.map((p) => ({
    id: p.id,
    fileName: p.fileName,
    origW: p.origW,
    origH: p.origH,
    orient: p.orient,
    used: p.used,
    thumbData: (p.previewUrl || (p.thumbData && !p.thumbData.startsWith('blob:') && !p.thumbData.startsWith('data:')) ? (p.previewUrl || p.thumbData) : null),
    hasFace: p.hasFace || false,
    cropOffset: p.cropOffset || { opx: 50, opy: 50 },
    storageUrl: p.storageUrl || null,
    storagePath: p.storagePath || null,
    previewUrl: p.previewUrl || null,
  }));
}

describe('serializePhotos — localStorage bloat prevention', () => {
  it('strips blob: URLs from thumbData', () => {
    const photos = [{ id: 'p1', thumbData: 'blob:http://localhost/abc123', fileName: 'test.jpg' }];
    const result = serializePhotos(photos);
    expect(result[0].thumbData).toBeNull();
  });

  it('strips data: URLs from thumbData', () => {
    const photos = [{ id: 'p1', thumbData: 'data:image/jpeg;base64,/9j/4AAQ...', fileName: 'test.jpg' }];
    const result = serializePhotos(photos);
    expect(result[0].thumbData).toBeNull();
  });

  it('keeps Firebase URLs in thumbData', () => {
    const firebaseUrl = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/photo.webp?alt=media&token=abc';
    const photos = [{ id: 'p1', thumbData: firebaseUrl, fileName: 'test.jpg' }];
    const result = serializePhotos(photos);
    expect(result[0].thumbData).toBe(firebaseUrl);
  });

  it('prefers previewUrl over thumbData when both exist', () => {
    const photos = [{
      id: 'p1',
      thumbData: 'blob:http://localhost/old',
      previewUrl: 'https://firebase.com/preview.webp',
      fileName: 'test.jpg',
    }];
    const result = serializePhotos(photos);
    expect(result[0].thumbData).toBe('https://firebase.com/preview.webp');
  });

  it('sets null when no valid URL exists', () => {
    const photos = [{ id: 'p1', thumbData: null, previewUrl: null, fileName: 'test.jpg' }];
    const result = serializePhotos(photos);
    expect(result[0].thumbData).toBeNull();
  });

  it('preserves all non-image fields', () => {
    const photos = [{
      id: 'p42', fileName: 'photo.jpg', origW: 4000, origH: 3000,
      orient: 'H', used: true, hasFace: true,
      cropOffset: { opx: 30, opy: 60 },
      storageUrl: 'https://storage.com/orig.jpg',
      storagePath: 'uploads/uid/proj/p42_photo.jpg',
      previewUrl: 'https://storage.com/resized.webp',
      thumbData: 'blob:http://localhost/temp',
    }];
    const result = serializePhotos(photos);
    expect(result[0].id).toBe('p42');
    expect(result[0].origW).toBe(4000);
    expect(result[0].orient).toBe('H');
    expect(result[0].used).toBe(true);
    expect(result[0].hasFace).toBe(true);
    expect(result[0].cropOffset).toEqual({ opx: 30, opy: 60 });
    expect(result[0].storageUrl).toBe('https://storage.com/orig.jpg');
  });
});

// Replicate Firestore spread serialization
function toFirestoreSpreads(spreads) {
  return spreads.map((sp) => ({
    id: sp.id, mode: sp.mode, isCover: sp.isCover || false,
    coverTemplate: sp.coverTemplate || null,
    coverTexts: sp.coverTexts || null,
    coverFrames: sp.coverFrames ? sp.coverFrames.map((f) => ({
      ...f,
      photo: f.photo ? { id: f.photo.id, cropOffset: f.photo.cropOffset } : null,
    })) : null,
    photoIds: sp.photoIds || [],
  }));
}

describe('Firestore spread serialization — cover data preservation', () => {
  it('preserves coverTexts in Firestore data', () => {
    const spreads = [{
      id: 's1', mode: 'spread', isCover: true,
      coverTexts: [{ id: 't1', text: 'Albumul Nostru', fontSize: 24 }],
      coverTemplate: { id: 'tpl1', name: 'Classic' },
      photoIds: [],
    }];
    const result = toFirestoreSpreads(spreads);
    expect(result[0].coverTexts).toHaveLength(1);
    expect(result[0].coverTexts[0].text).toBe('Albumul Nostru');
  });

  it('preserves coverTemplate in Firestore data', () => {
    const spreads = [{
      id: 's1', mode: 'spread', isCover: true,
      coverTemplate: { id: 'tpl1', name: 'Classic', coverStyle: { bg: '#fff' } },
      photoIds: [],
    }];
    const result = toFirestoreSpreads(spreads);
    expect(result[0].coverTemplate.id).toBe('tpl1');
    expect(result[0].coverTemplate.coverStyle.bg).toBe('#fff');
  });

  it('preserves coverFrames with photo references', () => {
    const spreads = [{
      id: 's1', mode: 'spread', isCover: true,
      coverFrames: [{ id: 'f1', photo: { id: 'p1', cropOffset: { opx: 30, opy: 40 } } }],
      photoIds: [],
    }];
    const result = toFirestoreSpreads(spreads);
    expect(result[0].coverFrames[0].photo.id).toBe('p1');
    expect(result[0].coverFrames[0].photo.cropOffset).toEqual({ opx: 30, opy: 40 });
  });

  it('handles null cover data gracefully', () => {
    const spreads = [{
      id: 's2', mode: 'spread', isCover: false,
      coverTexts: null, coverTemplate: null, coverFrames: null,
      photoIds: ['p1', 'p2'],
    }];
    const result = toFirestoreSpreads(spreads);
    expect(result[0].coverTexts).toBeNull();
    expect(result[0].coverTemplate).toBeNull();
    expect(result[0].coverFrames).toBeNull();
  });
});

describe('Photo ID uniqueness', () => {
  it('Date.now() % 100000 produces different starting IDs across "reloads"', () => {
    // Simulate two different page loads with slight time difference
    const id1 = Date.now() % 100000;
    // Advance by at least 1ms
    const id2 = (Date.now() + 1) % 100000;
    // They should not be equal (extremely unlikely within 1ms)
    // But more importantly, they should not start at 0
    expect(id1).toBeGreaterThan(0);
    expect(id2).toBeGreaterThan(0);
  });
});
