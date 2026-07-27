import { getAssetDisplayUrl } from '../utils/assets';

export default function NoticiaFeaturedImage({
  desktopUrl,
  mobileUrl,
  url,
  alt = '',
  className = '',
}) {
  const desktop = getAssetDisplayUrl(desktopUrl || url);
  const mobile = getAssetDisplayUrl(mobileUrl);
  const fallback = desktop || mobile;

  if (!fallback) return null;

  const rootClass = `noticia-featured-image${className ? ` ${className}` : ''}`;

  if (desktop && mobile) {
    return (
      <picture className={rootClass}>
        <source media="(max-width: 767px)" srcSet={mobile} />
        <img src={desktop} alt={alt} loading="lazy" />
      </picture>
    );
  }

  return (
    <div className={rootClass}>
      <img src={fallback} alt={alt} loading="lazy" />
    </div>
  );
}
