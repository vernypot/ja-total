import { useEffect, useRef, useState } from 'react';
import FormModal from './FormModal';
import MensajeHtmlEditor from './MensajeHtmlEditor';
import MensajePrivacyNotice from './MensajePrivacyNotice';
import { memberDisplayName } from '../utils/memberDisplayName';
import * as MensajesModel from '../mvc/models/mensajes.model';
import '../styles/mensajes.css';

const EMPTY = {
  destinatarioMiembroId: '',
  tipo: 'general',
  asunto: '',
  cuerpo: '',
};

function newAttachment(file) {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
  };
}

export default function MensajeComposeModal({
  open,
  onClose,
  clubId,
  clubs = [],
  sessionToken = null,
  preset = null,
  t,
  language = 'es',
  onSent,
}) {
  const [form, setForm] = useState(EMPTY);
  const [activeClubId, setActiveClubId] = useState(clubId || '');
  const [directory, setDirectory] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [inlineFiles, setInlineFiles] = useState([]);
  const [editorKey, setEditorKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inlineFilesRef = useRef([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    inlineFilesRef.current = inlineFiles;
  }, [inlineFiles]);

  useEffect(() => {
    if (!open) {
      inlineFilesRef.current.forEach(item => {
        try { URL.revokeObjectURL(item.url); } catch { /* ignore */ }
      });
      inlineFilesRef.current = [];
      return;
    }

    setError('');
    setAttachments([]);
    setInlineFiles([]);
    setEditorKey(key => key + 1);
    setActiveClubId(preset?.clubId || clubId || '');
    setForm({
      destinatarioMiembroId: preset?.miembroId || '',
      tipo: preset?.tipo || 'general',
      asunto: preset?.asunto || '',
      cuerpo: preset?.cuerpo || '',
    });
  }, [open, clubId, preset]);

  useEffect(() => {
    if (!open || !activeClubId) {
      setDirectory([]);
      return undefined;
    }

    let cancelled = false;
    MensajesModel.fetchMessageDirectory(activeClubId, { sessionToken }).then(({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) {
        setDirectory([]);
        return;
      }
      setDirectory(data || []);
    });

    return () => {
      cancelled = true;
    };
  }, [open, activeClubId, sessionToken]);

  function addFile(file) {
    const validation = MensajesModel.validateMensajeFile(file);
    if (validation) {
      setError(t(validation));
      return false;
    }
    return true;
  }

  function handlePickImage(file, insert) {
    if (!addFile(file)) return;
    const url = URL.createObjectURL(file);
    setInlineFiles(prev => [...prev, { url, file }]);
    insert(url);
  }

  function handleAttachFiles(fileList) {
    const next = [];
    for (const file of fileList || []) {
      if (!addFile(file)) continue;
      next.push(newAttachment(file));
    }
    if (next.length) {
      setError('');
      setAttachments(prev => [...prev, ...next]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const canSend = Boolean(
    activeClubId
    && form.destinatarioMiembroId
    && (MensajesModel.mensajeHasBody(form.cuerpo) || attachments.length > 0)
  );

  async function handleSubmit(event) {
    event?.preventDefault();
    if (!canSend) return;

    setSaving(true);
    setError('');

    const inline = await MensajesModel.collectInlineFiles(form.cuerpo, inlineFiles);
    const staged = [
      ...inline,
      ...attachments.map(item => ({ src: null, file: item.file })),
    ];

    const initialBody = MensajesModel.sanitizeMensajeHtml(form.cuerpo)
      || (staged.length ? '<p></p>' : '');

    const { data, error: sendError } = await MensajesModel.sendMensaje({
      clubId: activeClubId,
      destinatarioMiembroId: form.destinatarioMiembroId,
      tipo: form.tipo,
      asunto: form.asunto,
      cuerpo: initialBody,
      sessionToken,
    });

    if (sendError) {
      setSaving(false);
      setError(sendError.message || t('mensajeSendError'));
      return;
    }

    const replacements = [];
    let attachFailed = false;
    for (const item of staged) {
      const { data: uploaded, error: uploadError } = await MensajesModel.uploadMensajeAdjunto(
        data.id,
        item.file,
        { sessionToken },
      );
      if (uploadError) {
        attachFailed = true;
        continue;
      }
      if (item.src && uploaded?.url) replacements.push([item.src, uploaded.url]);
    }

    const finalBody = MensajesModel.sanitizeMensajeHtml(
      MensajesModel.replaceHtmlSources(form.cuerpo, replacements),
    ) || initialBody;

    if (finalBody) {
      await MensajesModel.updateMensajeCuerpo(data.id, finalBody, { sessionToken });
    }

    setSaving(false);
    onSent?.({
      notice: attachFailed ? t('mensajeAttachError') : t('mensajeSent'),
      isError: attachFailed,
    });
    onClose?.();
  }

  return (
    <FormModal
      open={open}
      onClose={saving ? undefined : onClose}
      title={t('mensajeComposeTitle')}
      maxWidth="720px"
      disableClose={saving}
    >
      <form className="mensaje-compose" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}

        {clubs.length > 1 && (
          <label className="mensaje-compose-field">
            <span>{t('clubs')}</span>
            <select
              className="form-input"
              value={activeClubId}
              onChange={e => {
                setActiveClubId(e.target.value);
                setForm(prev => ({ ...prev, destinatarioMiembroId: '' }));
              }}
            >
              <option value="">{t('selectClub')}</option>
              {clubs.map(club => (
                <option key={club.id} value={club.id}>{club.nombre}</option>
              ))}
            </select>
          </label>
        )}

        <label className="mensaje-compose-field">
          <span>{t('mensajeTo')}</span>
          <select
            className="form-input"
            value={form.destinatarioMiembroId}
            onChange={e => setForm(prev => ({ ...prev, destinatarioMiembroId: e.target.value }))}
            required
          >
            <option value="">{t('mensajeSelectMember')}</option>
            {directory.map(member => (
              <option key={member.id} value={member.id}>{memberDisplayName(member)}</option>
            ))}
          </select>
        </label>

        <label className="mensaje-compose-field">
          <span>{t('mensajeType')}</span>
          <select
            className="form-input"
            value={form.tipo}
            onChange={e => setForm(prev => ({ ...prev, tipo: e.target.value }))}
          >
            <option value="general">{t('mensajeType_general')}</option>
            <option value="solicitud">{t('mensajeType_solicitud')}</option>
            <option value="cumpleanos">{t('mensajeType_cumpleanos')}</option>
          </select>
        </label>

        <label className="mensaje-compose-field">
          <span>{t('mensajeSubject')}</span>
          <input
            className="form-input"
            value={form.asunto}
            onChange={e => setForm(prev => ({ ...prev, asunto: e.target.value }))}
            maxLength={200}
          />
        </label>

        <div className="mensaje-compose-field">
          <MensajeHtmlEditor
            label={t('mensajeBody')}
            hint={t('mensajeEditorHint')}
            value={form.cuerpo}
            onChange={cuerpo => setForm(prev => ({ ...prev, cuerpo }))}
            onPickImage={handlePickImage}
            editorKey={editorKey}
          />
        </div>

        <div className="mensaje-compose-field">
          <span>{t('mensajeAttach')}</span>
          <span className="mensaje-attach-hint">{t('mensajeAttachHint')}</span>
          <input
            ref={fileInputRef}
            className="form-input"
            type="file"
            multiple
            onChange={e => handleAttachFiles(e.target.files)}
          />
          {attachments.length > 0 && (
            <ul className="mensaje-attach-list">
              {attachments.map(item => (
                <li key={item.id}>
                  <span>
                    {item.file.name}
                    <em> · {MensajesModel.formatMensajeFileSize(item.file.size, language)}</em>
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setAttachments(prev => prev.filter(row => row.id !== item.id))}
                  >
                    {t('remove')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <MensajePrivacyNotice t={t} />

        <div className="mensaje-compose-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            {t('cancel')}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !canSend}
          >
            {saving ? t('saving') : t('mensajeSend')}
          </button>
        </div>
      </form>
    </FormModal>
  );
}
