import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import {
  PHOTO_CROP_VIEWPORT,
  computeCoverBaseScale,
  cropImageFromViewport,
} from '../utils/cropImage';
import '../styles/photoCrop.css';

export default function PhotoCropModal({
  imageUrl,
  fileName = 'photo.jpg',
  mimeType = 'image/jpeg',
  onConfirm,
  onCancel,
}) {
  const { t } = useLanguage();
  const viewportSize = PHOTO_CROP_VIEWPORT;
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dragState = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setImgSize({ w, h });
      setBaseScale(computeCoverBaseScale(w, h, viewportSize));
      setScale(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageUrl;
  }, [imageUrl, viewportSize]);

  const displayScale = baseScale * scale;
  const drawnW = imgSize.w * displayScale;
  const drawnH = imgSize.h * displayScale;
  const imageLeft = (viewportSize - drawnW) / 2 + offset.x;
  const imageTop = (viewportSize - drawnH) / 2 + offset.y;

  const onPointerDown = useCallback(e => {
    e.preventDefault();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [offset.x, offset.y]);

  const onPointerMove = useCallback(e => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset({
      x: dragState.current.originX + dx,
      y: dragState.current.originY + dy,
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  async function handleConfirm() {
    setSaving(true);
    setError('');
    try {
      const outputType = mimeType.includes('png') ? 'image/png' : 'image/jpeg';
      const file = await cropImageFromViewport(imageUrl, {
        viewportSize,
        baseScale,
        scale,
        offsetX: offset.x,
        offsetY: offset.y,
        mimeType: outputType,
        fileName,
      });
      onConfirm(file);
    } catch (err) {
      setError(err.message || t('photoCropError'));
      setSaving(false);
    }
  }

  return (
    <div className="photo-crop-overlay" role="dialog" aria-modal="true" aria-labelledby="photo-crop-title">
      <div className="photo-crop-dialog">
        <h3 id="photo-crop-title">{t('photoCropTitle')}</h3>
        <p className="photo-crop-hint">{t('photoCropHint')}</p>

        <div
          className="photo-crop-viewport"
          style={{ width: viewportSize, height: viewportSize }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {imgSize.w > 0 && (
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              className="photo-crop-image"
              style={{
                width: drawnW,
                height: drawnH,
                transform: `translate(${imageLeft}px, ${imageTop}px)`,
              }}
            />
          )}
          <div className="photo-crop-frame" aria-hidden="true" />
        </div>

        <label className="photo-crop-zoom-label">
          {t('photoCropZoom')}
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={scale}
            onChange={e => setScale(Number(e.target.value))}
          />
        </label>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="photo-crop-actions">
          <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={saving || !imgSize.w}>
            {saving ? t('saving') : t('photoCropSave')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
