import { useState } from 'react';
import { reglamentoNivelLabel } from '../utils/reglamento';

const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  puntos_penalizacion: '0',
  orden: '0',
};

function ReglamentoEditorRow({
  node,
  depth,
  canAddChild,
  onEdit,
  onDelete,
  onAddChild,
  t,
}) {
  const penalty = Number(node.puntos_penalizacion) > 0 ? node.puntos_penalizacion : null;

  return (
    <div className={`reglamento-editor-row reglamento-editor-row--depth-${depth}`}>
      <div className="reglamento-editor-row__main">
        <div className="reglamento-editor-row__meta">
          <span className="reglamento-editor-row__level">{reglamentoNivelLabel(node.nivel, t)}</span>
          {penalty != null && (
            <span className="reglamento-editor-row__penalty">
              −{penalty} {t('reglamentoPenaltyPointsAbbrev')}
            </span>
          )}
        </div>
        <strong>{node.titulo}</strong>
        {node.descripcion && <div className="reglamento-editor-row__desc">{node.descripcion}</div>}
      </div>
      <div className="reglamento-editor-row__actions">
        {canAddChild && (
          <button type="button" className="home-link-btn" onClick={() => onAddChild(node)}>
            + {t('reglamentoAddChild')}
          </button>
        )}
        <button type="button" className="home-link-btn" onClick={() => onEdit(node)}>
          {t('edit')}
        </button>
        <button type="button" className="home-link-btn" onClick={() => onDelete(node)}>
          {t('delete')}
        </button>
      </div>
    </div>
  );
}

function flattenTree(nodes, depth = 0) {
  const rows = [];
  for (const node of nodes || []) {
    rows.push({ node, depth });
    rows.push(...flattenTree(node.children, depth + 1));
  }
  return rows;
}

export default function ReglamentoEditor({
  tree,
  saving,
  onSave,
  onDelete,
  t,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [parentId, setParentId] = useState(null);
  const [parentNivel, setParentNivel] = useState(0);
  const [showForm, setShowForm] = useState(false);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId('');
    setParentId(null);
    setParentNivel(0);
    setShowForm(false);
  }

  function startCreateSection() {
    resetForm();
    setShowForm(true);
  }

  function startAddChild(parent) {
    setEditingId('');
    setParentId(parent.id);
    setParentNivel(parent.nivel || 1);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(node) {
    setEditingId(node.id);
    setParentId(node.parent_id || null);
    setParentNivel(node.nivel > 1 ? node.nivel - 1 : 0);
    setForm({
      titulo: node.titulo || '',
      descripcion: node.descripcion || '',
      puntos_penalizacion: String(node.puntos_penalizacion ?? 0),
      orden: String(node.orden ?? 0),
    });
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.titulo.trim()) return;
    onSave({
      nodoId: editingId || null,
      parentId,
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      puntosPenalizacion: Number(form.puntos_penalizacion) || 0,
      orden: Number(form.orden) || 0,
    });
    resetForm();
  }

  const rows = flattenTree(tree);
  const nextNivel = parentId ? parentNivel + 1 : 1;
  const canSetPenalty = nextNivel >= 2;

  return (
    <div className="reglamento-editor">
      <div className="reglamento-editor__header">
        <h2 className="reglamento-editor__title">{t('reglamentoEditTitle')}</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={startCreateSection}>
          + {t('reglamentoAddSection')}
        </button>
      </div>
      <p className="reglamento-editor__hint">{t('reglamentoEditHint')}</p>

      {showForm && (
        <div className="card reglamento-editor-form">
          <h3 style={{ marginTop: 0 }}>
            {editingId
              ? t('reglamentoEditNode')
              : parentId
                ? t('reglamentoAddChild')
                : t('reglamentoAddSection')}
          </h3>
          <div className="reglamento-editor-form__grid">
            <label className="unidades-field">
              <span className="unidades-field__label">{t('reglamentoNodeTitle')}</span>
              <input
                className="form-input"
                value={form.titulo}
                onChange={e => setForm(prev => ({ ...prev, titulo: e.target.value }))}
              />
            </label>
            <label className="unidades-field">
              <span className="unidades-field__label">{t('reglamentoNodeOrder')}</span>
              <input
                type="number"
                min="0"
                className="form-input"
                value={form.orden}
                onChange={e => setForm(prev => ({ ...prev, orden: e.target.value }))}
              />
            </label>
            {canSetPenalty && (
              <label className="unidades-field">
                <span className="unidades-field__label">{t('reglamentoPenaltyPoints')}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={form.puntos_penalizacion}
                  onChange={e => setForm(prev => ({ ...prev, puntos_penalizacion: e.target.value }))}
                />
              </label>
            )}
            <label className="unidades-field unidades-field--full">
              <span className="unidades-field__label">{t('reglamentoNodeDescription')}</span>
              <textarea
                className="form-input"
                rows={3}
                value={form.descripcion}
                onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
              />
            </label>
          </div>
          <div className="reglamento-editor-form__actions">
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || !form.titulo.trim()}
              onClick={handleSubmit}
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="reglamento-empty">{t('reglamentoEmptyAdmin')}</p>
      ) : (
        <div className="reglamento-editor-list">
          {rows.map(({ node, depth }) => (
            <ReglamentoEditorRow
              key={node.id}
              node={node}
              depth={depth}
              canAddChild={(node.nivel || 1) < 3}
              onEdit={startEdit}
              onDelete={onDelete}
              onAddChild={startAddChild}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
