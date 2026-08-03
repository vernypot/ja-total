import { formatPenaltyPoints } from '../utils/reglamento';

function ReglamentoNode({ node, depth, t }) {
  const HeadingTag = depth === 0 ? 'h2' : depth === 1 ? 'h3' : 'h4';
  const penalty = formatPenaltyPoints(node.puntos_penalizacion);

  return (
    <div className={`reglamento-node reglamento-node--depth-${depth}`}>
      <HeadingTag className="reglamento-node__title">
        {node.titulo}
        {penalty && (
          <span className="reglamento-node__penalty">
            −{penalty} {t('reglamentoPenaltyPointsAbbrev')}
          </span>
        )}
      </HeadingTag>
      {node.descripcion && (
        <p className="reglamento-node__description">{node.descripcion}</p>
      )}
      {node.children?.length > 0 && (
        <div className="reglamento-node__children">
          {node.children.map(child => (
            <ReglamentoNode key={child.id} node={child} depth={depth + 1} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReglamentoTree({ tree, t, emptyMessage }) {
  if (!tree?.length) {
    return <p className="reglamento-empty">{emptyMessage || t('reglamentoEmpty')}</p>;
  }

  return (
    <div className="reglamento-tree">
      {tree.map(node => (
        <ReglamentoNode key={node.id} node={node} depth={0} t={t} />
      ))}
    </div>
  );
}
