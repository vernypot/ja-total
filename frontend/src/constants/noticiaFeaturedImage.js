export const NOTICIA_FEATURED_VARIANTS = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
};

export function noticiaFeaturedImageColumn(variant) {
  return variant === NOTICIA_FEATURED_VARIANTS.MOBILE
    ? 'imagen_destacada_mobile_url'
    : 'imagen_destacada_url';
}

export function noticiaFeaturedStorageStem(variant) {
  return variant === NOTICIA_FEATURED_VARIANTS.MOBILE ? 'featured-mobile' : 'featured-desktop';
}
