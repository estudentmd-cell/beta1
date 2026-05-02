# SPEC: Momentive Platform — Live Editor Upload Speed Overhaul
**Date:** 2026-03-31
**Status:** Phase 1+2 COMPLETE, Phase 3 planned

## Implementation Status
- [x] Phase 1: Resumable uploads, tiered compression, optimistic UI
- [x] Phase 2: Pipelined compression+upload, staggered ramp-up, parallel compression, upload widget
- [ ] Phase 3: Cloudinary hybrid, Firebase region tuning

## Performance Results
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Per-file speed | 0.38 MB/s | 2.2 MB/s | 5.8x |
| Cold start | 10s | 1.1s | 9x faster |
| Sidebar thumb quality | 300px/60% | 400-600px/70-80% | 4x pixels |
| localStorage per photo | ~40KB | ~200 bytes | 200x smaller |

## Architecture
- Resumable uploads (uploadBytesResumable) for files ≥5MB
- 5-tier adaptive compression system
- Pipelined: compression + upload run simultaneously
- Staggered ramp-up: 3 connections → +2 every 400ms
- Parallel compression: 3 files simultaneously
- Batched state updates: max 10/sec
- Upload widget with real-time speed/ETA
- LazyImage component (IntersectionObserver, 200px margin)
