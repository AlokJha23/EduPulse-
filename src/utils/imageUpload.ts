/**
 * Reads any image file selected by the user (PNG, JPG, JPEG, WebP, SVG, GIF, BMP, ICO, AVIF, etc.)
 * and returns a clean Data URL suitable for persisting in the school/profile database and displaying
 * in <img> tags and PDF report cards.
 *
 * - Preserves SVG / GIF / small images cleanly without lossy re-encoding.
 * - Downscales oversized raster images gently to fit within maxDim x maxDim so storage stays fast.
 * - Gracefully falls back to the raw FileReader Data URL for any format that HTMLCanvasElement cannot decode.
 */
export async function readImageFileAsDataUrl(file: File, maxDim = 512): Promise<string> {
  const isImageMime = file.type && file.type.startsWith('image/');
  const isImageExt = /\.(png|jpe?g|webp|gif|svg|bmp|ico|avif|tiff?|jfif|heic|heif)$/i.test(file.name);

  if (!isImageMime && !isImageExt) {
    throw new Error('Please choose a valid image file (PNG, JPG, WebP, SVG, GIF, BMP, etc.).');
  }

  const maxBytes = 12 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('Image file is too large (max 12MB). Please select a smaller image.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read the selected image file.'));
    reader.readAsDataURL(file);
  });

  // Preserve SVG, GIF, or compact images (< 350KB) directly without re-encoding
  const isSvgOrGif =
    file.type === 'image/svg+xml' ||
    file.type === 'image/gif' ||
    /\.svg$/i.test(file.name) ||
    /\.gif$/i.test(file.name);

  if (isSvgOrGif || file.size <= 350 * 1024) {
    return rawDataUrl;
  }

  // Gently downscale oversized raster photos/logos while preserving transparency (PNG)
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (!width || !height) {
          resolve(rawDataUrl);
          return;
        }
        if (width <= maxDim && height <= maxDim) {
          resolve(rawDataUrl);
          return;
        }

        const scale = Math.min(maxDim / width, maxDim / height);
        const targetW = Math.max(1, Math.round(width * scale));
        const targetH = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);
        const optimized = canvas.toDataURL('image/png');
        resolve(optimized.length < rawDataUrl.length ? optimized : rawDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}
