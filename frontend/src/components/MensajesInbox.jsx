import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { useDashboardAuth } from '../hooks/useDashboardAuth';
import { PageHelpLink } from './PageHelp';
import BackLink from './BackLink';
import MensajeComposeModal from './MensajeComposeModal';
import MensajePrivacyNotice from './MensajePrivacyNotice';
import NoticiaHtml from './NoticiaHtml';
import * as MensajesModel from '../mvc/models/mensajes.model';
import { memberDisplayName } from '../utils/memberDisplayName';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import '../styles/form.css';
import '../styles/mensajes.css';
import '../styles/noticia-html.css';

function formatWhen(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(language === 'en' ? 'en-US' : 'es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function MensajesInbox({ clubs = [], defaultClubId = '' }) {
  const { t, language } = useLanguage();
  const { isMemberView, session } = useDashboardAuth();
  const sessionToken = isMemberView ? session?.sessionToken : null;

  const [folder, setFolder] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composePreset, setComposePreset] = useState(null);
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });

  async function load() {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await MensajesModel.fetchMensajes({ sessionToken });
    if (loadError) {
      setError(loadError.message || t('mensajeLoadError'));
      setMessages([]);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [sessionToken]);

  const visible = useMemo(
    () => messages.filter(row => (row.folder || 'inbox') === folder),
    [messages, folder],
  );

  const selected = visible.find(row => row.id === selectedId) || null;

  async function openMessage(row) {
    setSelectedId(row.id);
    if (row.unread) {
      await MensajesModel.markMensajeLeido(row.id, { sessionToken });
      setMessages(prev => prev.map(item => (
        item.id === row.id ? { ...item, unread: false, leido_at: item.leido_at || new Date().toISOString() } : item
      )));
      window.dispatchEvent(new Event('inbox-unread-refresh'));
    }
  }

  function startCompose(preset = null) {
    setComposePreset(preset);
    setComposeOpen(true);
  }

  function replyTo(row) {
    const other = row.folder === 'sent' ? row.destinatario : row.remitente;
    const quoted = MensajesModel.quotedMensajeHtml(row.cuerpo);
    const asunto = MensajesModel.withMensajeSubjectPrefix(row.asunto, t('mensajeReplyPrefix'));
    const tipo = row.tipo === 'solicitud' ? 'solicitud' : 'general';

    if (other?.tipo === 'usuario' && other.id) {
      startCompose({
        clubId: row.club_id,
        usuarioId: other.id,
        recipientLabel: MensajesModel.partyDisplayName(other) || t('mensajeUnknownParty'),
        tipo,
        asunto,
        cuerpo: quoted,
      });
      return;
    }

    if (other?.tipo !== 'miembro' || !other.id) {
      startCompose({ clubId: row.club_id, tipo, asunto, cuerpo: quoted });
      return;
    }

    startCompose({
      clubId: row.club_id,
      miembroId: other.id,
      tipo,
      asunto,
      cuerpo: quoted,
    });
  }

  function forwardTo(row) {
    startCompose({
      clubId: row.club_id,
      tipo: row.tipo === 'solicitud' ? 'solicitud' : 'general',
      asunto: MensajesModel.withMensajeSubjectPrefix(row.asunto, t('mensajeForwardPrefix')),
      cuerpo: MensajesModel.forwardedMensajeHtml(row.cuerpo, row.adjuntos),
    });
  }

  function deleteMessage(row) {
    askConfirm({
      title: t('mensajeDeleteTitle'),
      message: t('mensajeDeleteConfirm'),
      highlight: row.asunto || t('mensajeNoSubject'),
      confirmLabel: t('mensajeDelete'),
      onConfirm: async () => {
        const { error: deleteError } = await MensajesModel.deleteMensaje(row.id, { sessionToken });
        if (deleteError) {
          setError(deleteError.message || t('mensajeDeleteError'));
          return;
        }
        setError('');
        setNotice(t('mensajeDeleted'));
        setSelectedId(current => (current === row.id ? '' : current));
        await load();
        window.dispatchEvent(new Event('inbox-unread-refresh'));
      },
    });
  }

  return (
    <div className="container">
      <BackLink />
      <div className="page-header mensaje-page-header">
        <div>
          <h1>✉️ {t('mensajesTitle')} <PageHelpLink pageId="mensajes" /></h1>
          <p className="text-muted" style={{ margin: '4px 0 0' }}>{t('mensajesHint')}</p>
          <MensajePrivacyNotice t={t} />
        </div>
        <button type="button" className="btn btn-primary mensaje-compose-btn" onClick={() => startCompose({ clubId: defaultClubId })}>
          {t('mensajeComposeTitle')}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="mensaje-folder-tabs" role="tablist">
        {['inbox', 'sent'].map(id => (
          <button
            key={id}
            type="button"
            role="tab"
            className={`mensaje-folder-tab${folder === id ? ' is-active' : ''}`}
            aria-selected={folder === id}
            onClick={() => {
              setFolder(id);
              setSelectedId('');
            }}
          >
            {t(id === 'inbox' ? 'mensajeFolderInbox' : 'mensajeFolderSent')}
          </button>
        ))}
      </div>

      {loading ? (
        <p>{t('loading')}</p>
      ) : (
        <div className="mensaje-layout">
          <ul className="mensaje-list">
            {visible.length === 0 ? (
              <li className="mensaje-list-empty">{t('mensajeEmptyFolder')}</li>
            ) : visible.map(row => {
              const other = row.folder === 'sent' ? row.destinatario : row.remitente;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`mensaje-list-item${selectedId === row.id ? ' is-selected' : ''}${row.unread ? ' is-unread' : ''}`}
                    onClick={() => openMessage(row)}
                  >
                    <strong>{MensajesModel.partyDisplayName(other) || memberDisplayName(other) || t('mensajeUnknownParty')}</strong>
                    <span className="mensaje-list-subject">{row.asunto || t('mensajeNoSubject')}</span>
                    <span className="mensaje-list-meta">
                      {t(`mensajeType_${row.tipo}`)} · {formatWhen(row.created_at, language)}
                      {row.adjuntos?.length > 0 ? ' · 📎' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mensaje-detail card">
            {!selected ? (
              <p className="mensaje-detail-empty">{t('mensajeSelectPrompt')}</p>
            ) : (
              <>
                <div className="mensaje-detail-head">
                  <h2>{selected.asunto || t('mensajeNoSubject')}</h2>
                  <span className="mensaje-type-chip">{t(`mensajeType_${selected.tipo}`)}</span>
                </div>
                <p className="mensaje-detail-meta">
                  {t('mensajeFrom')}: {MensajesModel.partyDisplayName(selected.remitente) || '—'}
                  <br />
                  {t('mensajeTo')}: {MensajesModel.partyDisplayName(selected.destinatario) || '—'}
                  <br />
                  {selected.club_nombre} · {formatWhen(selected.created_at, language)}
                </p>
                <NoticiaHtml html={selected.cuerpo} className="mensaje-detail-body" />
                {selected.adjuntos?.length > 0 && (
                  <div className="mensaje-detail-attachments">
                    <strong>{t('mensajeAttachments')}</strong>
                    <ul>
                      {selected.adjuntos.map(file => (
                        <li key={file.id}>
                          <a href={file.url} target="_blank" rel="noreferrer">
                            {file.nombre || t('mensajeAttachment')}
                          </a>
                          {file.tamano ? (
                            <em> · {MensajesModel.formatMensajeFileSize(file.tamano, language)}</em>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <MensajePrivacyNotice t={t} />
                <div className="mensaje-detail-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => replyTo(selected)}>
                    {t('mensajeReply')}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => forwardTo(selected)}>
                    {t('mensajeForward')}
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => deleteMessage(selected)}>
                    {t('mensajeDelete')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <MensajeComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        clubId={composePreset?.clubId || defaultClubId}
        clubs={clubs}
        sessionToken={sessionToken}
        preset={composePreset}
        t={t}
        language={language}
        onSent={({ notice, isError } = {}) => {
          if (isError) {
            setError(notice || t('mensajeAttachError'));
            setNotice('');
          } else {
            setNotice(notice || t('mensajeSent'));
          }
          load();
          window.dispatchEvent(new Event('inbox-unread-refresh'));
        }}
      />
      {confirmDialog}
    </div>
  );
}
