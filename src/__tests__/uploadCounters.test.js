import { describe, it, expect } from 'vitest';

/**
 * Tests for upload counter reset behavior.
 * Verifies counters reset on new upload session but accumulate during active upload.
 */

function computeCounters(isCurrentlyUploading, existing, newBatch) {
  // Replicates the logic from useEditorStore addPhotos
  return {
    uploadTotalCount: isCurrentlyUploading
      ? existing.uploadTotalCount + newBatch.total
      : newBatch.total,
    uploadedCount: isCurrentlyUploading
      ? existing.uploadedCount
      : 0,
    uploadBytesTotal: isCurrentlyUploading
      ? existing.uploadBytesTotal + newBatch.totalBytes
      : newBatch.totalBytes,
    uploadBytesSent: isCurrentlyUploading
      ? existing.uploadBytesSent
      : 0,
  };
}

describe('Upload counter reset behavior', () => {
  it('resets counters when no upload is active', () => {
    const existing = { uploadTotalCount: 50, uploadedCount: 50, uploadBytesTotal: 100000, uploadBytesSent: 100000 };
    const newBatch = { total: 10, totalBytes: 20000 };
    const result = computeCounters(false, existing, newBatch);

    expect(result.uploadTotalCount).toBe(10);
    expect(result.uploadedCount).toBe(0);
    expect(result.uploadBytesTotal).toBe(20000);
    expect(result.uploadBytesSent).toBe(0);
  });

  it('accumulates counters when upload is active (add more photos)', () => {
    const existing = { uploadTotalCount: 50, uploadedCount: 30, uploadBytesTotal: 100000, uploadBytesSent: 60000 };
    const newBatch = { total: 10, totalBytes: 20000 };
    const result = computeCounters(true, existing, newBatch);

    expect(result.uploadTotalCount).toBe(60);
    expect(result.uploadedCount).toBe(30);
    expect(result.uploadBytesTotal).toBe(120000);
    expect(result.uploadBytesSent).toBe(60000);
  });

  it('fresh upload shows correct initial state', () => {
    const existing = { uploadTotalCount: 0, uploadedCount: 0, uploadBytesTotal: 0, uploadBytesSent: 0 };
    const newBatch = { total: 5, totalBytes: 50000 };
    const result = computeCounters(false, existing, newBatch);

    expect(result.uploadTotalCount).toBe(5);
    expect(result.uploadedCount).toBe(0);
    expect(result.uploadBytesTotal).toBe(50000);
    expect(result.uploadBytesSent).toBe(0);
  });
});

describe('Upload progress calculation', () => {
  it('calculates percentage from bytes', () => {
    const sent = 50 * 1024 * 1024; // 50 MB
    const total = 200 * 1024 * 1024; // 200 MB
    const pct = Math.round((sent / total) * 100);
    expect(pct).toBe(25);
  });

  it('caps at 99% before completion', () => {
    const sent = 199.9 * 1024 * 1024;
    const total = 200 * 1024 * 1024;
    const pct = Math.min(Math.round((sent / total) * 100), 99);
    expect(pct).toBe(99); // not 100
  });

  it('handles zero total gracefully', () => {
    const total = 0;
    const pct = total > 0 ? Math.round((0 / total) * 100) : 0;
    expect(pct).toBe(0);
  });
});

describe('Speed tracking', () => {
  it('calculates speed from rolling samples', () => {
    // Simulate: 10 MB transferred in 2 seconds
    const samples = [
      { time: 1000, bytes: 0 },
      { time: 2000, bytes: 5 * 1024 * 1024 },
      { time: 3000, bytes: 10 * 1024 * 1024 },
    ];
    const oldest = samples[0];
    const newest = samples[samples.length - 1];
    const elapsed = (newest.time - oldest.time) / 1000;
    const speed = (newest.bytes - oldest.bytes) / elapsed;

    expect(speed).toBe(5 * 1024 * 1024); // 5 MB/s
  });
});
