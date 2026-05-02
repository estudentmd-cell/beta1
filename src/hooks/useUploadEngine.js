import { useState, useCallback } from 'react';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const PREVIEW_MAX = 2400;
const PREVIEW_QUALITY = 0.7;
const THUMB_MAX = 300;
const THUMB_QUALITY = 0.6;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];

// Batch sizes — photos appear in these groups
const BATCH_SIZES = [3, 5, 8, 15, 20, 30]; // escalating batch sizes

function getBatchSize(processedSoFar) {
  // First 3, then 5, then 8, then 15, then 20, then 30 at a time
  for (let i = 0; i < BATCH_SIZES.length; i++) {
    const threshold = BATCH_SIZES.slice(0, i + 1).reduce((a, b) => a + b, 0);
    if (processedSoFar < threshold) return BATCH_SIZES[i];
  }
  return 30; // large batches after initial ramp-up
}

function yieldToMain() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function processImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const previewScale = Math.min(PREVIEW_MAX / img.width, PREVIEW_MAX / img.height, 1);
      const pw = Math.round(img.width * previewScale);
      const ph = Math.round(img.height * previewScale);
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = pw;
      previewCanvas.height = ph;
      previewCanvas.getContext('2d').drawImage(img, 0, 0, pw, ph);
      const previewData = previewCanvas.toDataURL('image/jpeg', PREVIEW_QUALITY);

      const thumbScale = Math.min(THUMB_MAX / img.width, THUMB_MAX / img.height, 1);
      const tw = Math.round(img.width * thumbScale);
      const th = Math.round(img.height * thumbScale);
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = tw;
      thumbCanvas.height = th;
      thumbCanvas.getContext('2d').drawImage(img, 0, 0, tw, th);
      const thumbData = thumbCanvas.toDataURL('image/jpeg', THUMB_QUALITY);

      URL.revokeObjectURL(url);
      previewCanvas.width = 0; previewCanvas.height = 0;
      thumbCanvas.width = 0; thumbCanvas.height = 0;

      resolve({
        previewData, thumbData,
        width: img.width, height: img.height,
        savedKB: Math.round((file.size - previewData.length * 0.75) / 1024),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export default function useUploadEngine() {
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList);
    const valid = files.filter((f) => {
      if (f.size > MAX_FILE_SIZE) return false;
      if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.heic$/i)) return false;
      return true;
    });

    if (valid.length === 0) return;

    setIsUploading(true);
    setProgress(0);
    setProgressLabel(`Se pregatesc ${valid.length} fotografii...`);

    let processed = 0;
    let batchBuffer = [];
    let currentBatchTarget = getBatchSize(0);

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      const pct = Math.round((i / valid.length) * 100);
      setProgress(pct);
      setProgressLabel(`Se optimizeaza ${i + 1} din ${valid.length}...`);

      const result = await processImage(file);
      if (!result) continue;

      const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      batchBuffer.push({
        id,
        file,
        fileName: file.name,
        previewData: result.previewData,
        thumbData: result.thumbData,
        width: result.width,
        height: result.height,
        origSize: file.size,
        status: 'done',
        selected: true,
      });

      processed++;

      // Flush batch when target reached or last photo
      if (batchBuffer.length >= currentBatchTarget || i === valid.length - 1) {
        const batch = [...batchBuffer];
        batchBuffer = [];
        setItems((prev) => [...prev, ...batch]);
        setProgressLabel(`${processed} din ${valid.length} gata`);

        // Yield to let React render the new batch
        await yieldToMain();

        // Next batch size
        currentBatchTarget = getBatchSize(processed);
      }
    }

    setProgressLabel(`${processed} fotografii optimizate!`);
    setIsUploading(false);
    setProgress(100);
  }, []);

  const toggleSelect = useCallback((id) => {
    setItems((prev) =>
      prev.map((it) => it.id === id && it.status === 'done' ? { ...it, selected: !it.selected } : it)
    );
  }, []);

  const selectedCount = items.filter((it) => it.selected && it.status === 'done').length;
  const selectedItems = items.filter((it) => it.selected && it.status === 'done');

  return {
    items,
    selectedCount,
    selectedItems,
    progress,
    progressLabel,
    isUploading,
    handleFiles,
    toggleSelect,
  };
}
