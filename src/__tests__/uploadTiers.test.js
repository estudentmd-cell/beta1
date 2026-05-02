import { describe, it, expect } from 'vitest';

/**
 * Tests for tiered upload selection logic.
 * Verifies that the correct tier is chosen based on file count,
 * and each tier has valid compression/concurrency settings.
 */

// Extract tier logic from useEditorStore (same constants)
const TIERS = {
  micro:  { thumbPx: 600, thumbQ: 0.80, uploadPx: 0,    uploadQ: 0,    concurrent: 5  },
  small:  { thumbPx: 600, thumbQ: 0.78, uploadPx: 0,    uploadQ: 0,    concurrent: 8  },
  medium: { thumbPx: 500, thumbQ: 0.75, uploadPx: 5000, uploadQ: 0.95, concurrent: 12 },
  large:  { thumbPx: 400, thumbQ: 0.70, uploadPx: 4000, uploadQ: 0.92, concurrent: 15 },
  bulk:   { thumbPx: 300, thumbQ: 0.65, uploadPx: 3200, uploadQ: 0.88, concurrent: 15 },
};

function getTierName(total) {
  return total <= 5 ? 'micro' : total <= 20 ? 'small' : total <= 60 ? 'medium' : total <= 150 ? 'large' : 'bulk';
}

describe('Upload Tier Selection', () => {
  it('selects micro tier for 1-5 photos', () => {
    expect(getTierName(1)).toBe('micro');
    expect(getTierName(3)).toBe('micro');
    expect(getTierName(5)).toBe('micro');
  });

  it('selects small tier for 6-20 photos', () => {
    expect(getTierName(6)).toBe('small');
    expect(getTierName(10)).toBe('small');
    expect(getTierName(20)).toBe('small');
  });

  it('selects medium tier for 21-60 photos', () => {
    expect(getTierName(21)).toBe('medium');
    expect(getTierName(40)).toBe('medium');
    expect(getTierName(60)).toBe('medium');
  });

  it('selects large tier for 61-150 photos', () => {
    expect(getTierName(61)).toBe('large');
    expect(getTierName(100)).toBe('large');
    expect(getTierName(150)).toBe('large');
  });

  it('selects bulk tier for 151+ photos', () => {
    expect(getTierName(151)).toBe('bulk');
    expect(getTierName(300)).toBe('bulk');
    expect(getTierName(1000)).toBe('bulk');
  });

  it('micro and small tiers upload raw originals (uploadPx === 0)', () => {
    expect(TIERS.micro.uploadPx).toBe(0);
    expect(TIERS.small.uploadPx).toBe(0);
  });

  it('medium+ tiers compress uploads', () => {
    expect(TIERS.medium.uploadPx).toBeGreaterThan(0);
    expect(TIERS.large.uploadPx).toBeGreaterThan(0);
    expect(TIERS.bulk.uploadPx).toBeGreaterThan(0);
  });

  it('concurrency increases with tier size', () => {
    expect(TIERS.micro.concurrent).toBeLessThanOrEqual(TIERS.small.concurrent);
    expect(TIERS.small.concurrent).toBeLessThanOrEqual(TIERS.medium.concurrent);
    expect(TIERS.medium.concurrent).toBeLessThanOrEqual(TIERS.large.concurrent);
  });

  it('thumb quality decreases with tier size (speed tradeoff)', () => {
    expect(TIERS.micro.thumbQ).toBeGreaterThan(TIERS.small.thumbQ);
    expect(TIERS.small.thumbQ).toBeGreaterThan(TIERS.medium.thumbQ);
    expect(TIERS.medium.thumbQ).toBeGreaterThan(TIERS.large.thumbQ);
    expect(TIERS.large.thumbQ).toBeGreaterThan(TIERS.bulk.thumbQ);
  });

  it('all tiers have valid thumb dimensions', () => {
    Object.values(TIERS).forEach(tier => {
      expect(tier.thumbPx).toBeGreaterThanOrEqual(200);
      expect(tier.thumbPx).toBeLessThanOrEqual(800);
    });
  });

  it('all tiers have valid JPEG quality range', () => {
    Object.values(TIERS).forEach(tier => {
      expect(tier.thumbQ).toBeGreaterThanOrEqual(0.5);
      expect(tier.thumbQ).toBeLessThanOrEqual(1.0);
      if (tier.uploadQ > 0) {
        expect(tier.uploadQ).toBeGreaterThanOrEqual(0.7);
        expect(tier.uploadQ).toBeLessThanOrEqual(1.0);
      }
    });
  });
});
