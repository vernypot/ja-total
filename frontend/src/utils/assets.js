const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

export function validateImageFile(file) {
  if (!file) return 'No file selected';
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return 'Invalid image type. Use JPEG, PNG, WebP, GIF, or SVG.';
  }
  if (file.size > MAX_IMAGE_BYTES) return 'Image must be 5 MB or smaller.';
  return null;
}

export function getAssetDisplayUrl(url) {
  if (!url) return null;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

export function extensionForImageFile(file) {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName === 'jpeg') return 'jpg';
  if (fromName && ['jpg', 'png', 'webp', 'gif', 'svg'].includes(fromName)) return fromName;
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  if (file.type === 'image/svg+xml') return 'svg';
  return 'png';
}

export function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}
