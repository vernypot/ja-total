import NoticiaFeaturedImageField from './NoticiaFeaturedImageField';

export default function NoticiaFeaturedImagesField({
  desktopUrl,
  mobileUrl,
  pendingDesktopFile,
  pendingMobileFile,
  uploadingVariant,
  onUpload,
  onRemove,
  t,
}) {
  return (
    <fieldset className="noticia-fieldset noticia-featured-images-field">
      <legend>{t('noticiasFieldFeaturedImage')}</legend>
      <p className="noticia-fieldset-hint">{t('noticiasFieldFeaturedImagesHint')}</p>
      <div className="noticia-featured-images-grid">
        <NoticiaFeaturedImageField
          label={t('noticiasFieldFeaturedImageDesktop')}
          hint={t('noticiasFieldFeaturedImageDesktopHint')}
          imageUrl={desktopUrl}
          pendingFile={pendingDesktopFile}
          uploading={uploadingVariant === 'desktop'}
          onUpload={file => onUpload('desktop', file)}
          onRemove={() => onRemove('desktop')}
          uploadLabel={t('uploadLogo')}
          changeLabel={t('changePhoto')}
          removeLabel={t('removePhoto')}
          emptyLabel={t('noticiasFieldFeaturedImageEmpty')}
          previewClassName="noticia-featured-image-field__preview--desktop"
        />
        <NoticiaFeaturedImageField
          label={t('noticiasFieldFeaturedImageMobile')}
          hint={t('noticiasFieldFeaturedImageMobileHint')}
          imageUrl={mobileUrl}
          pendingFile={pendingMobileFile}
          uploading={uploadingVariant === 'mobile'}
          onUpload={file => onUpload('mobile', file)}
          onRemove={() => onRemove('mobile')}
          uploadLabel={t('uploadLogo')}
          changeLabel={t('changePhoto')}
          removeLabel={t('removePhoto')}
          emptyLabel={t('noticiasFieldFeaturedImageEmpty')}
          previewClassName="noticia-featured-image-field__preview--mobile"
        />
      </div>
    </fieldset>
  );
}
