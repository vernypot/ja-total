export const PHOTO_CROP_VIEWPORT = 280;
export const PHOTO_CROP_OUTPUT = 800;

export function computeCoverBaseScale(imageWidth, imageHeight, viewportSize) {
  if (!imageWidth || !imageHeight) return 1;
  return Math.max(viewportSize / imageWidth, viewportSize / imageHeight);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Could not load image'));
    if (typeof source === 'string') {
      if (!source.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.src = source;
      return;
    }
    const objectUrl = URL.createObjectURL(source);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.src = objectUrl;
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export async function cropImageFromViewport(source, {
  viewportSize = PHOTO_CROP_VIEWPORT,
  baseScale,
  scale,
  offsetX,
  offsetY,
  outputSize = PHOTO_CROP_OUTPUT,
  mimeType = 'image/jpeg',
  quality = 0.92,
  fileName = 'photo.jpg',
}) {
  const img = await loadImage(source);
  const displayScale = baseScale * scale;
  const drawnW = img.naturalWidth * displayScale;
  const drawnH = img.naturalHeight * displayScale;
  const left = (viewportSize - drawnW) / 2 + offsetX;
  const top = (viewportSize - drawnH) / 2 + offsetY;

  const srcX = clamp(-left / displayScale, 0, img.naturalWidth);
  const srcY = clamp(-top / displayScale, 0, img.naturalHeight);
  const srcW = clamp(viewportSize / displayScale, 1, img.naturalWidth - srcX);
  const srcH = clamp(viewportSize / displayScale, 1, img.naturalHeight - srcY);

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outputSize, outputSize);
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputSize, outputSize);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      result => (result ? resolve(result) : reject(new Error('Could not export image'))),
      mimeType,
      quality
    );
  });

  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const safeName = fileName.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${safeName}-cropped.${ext}`, { type: mimeType });
}
