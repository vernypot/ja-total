const COPY = {
  es: {
    url: 'teofila.app/dashboard',
    sidebar: ['Inicio', 'Miembros', 'Eventos', 'Calendario', 'Carnets'],
    members: {
      title: 'Miembros',
      search: 'Buscar miembro…',
      active: 'Activo',
      rows: [
        { name: 'Ana García M.', club: 'Conquistadores', role: 'Guía' },
        { name: 'Carlos Méndez R.', club: 'Aventureros', role: 'Miembro' },
        { name: 'Sofía López V.', club: 'Conquistadores', role: 'Miembro' },
      ],
    },
    progress: {
      title: 'Clases progresivas',
      member: 'Carlos Méndez R.',
      classes: [
        { name: 'Amigo', done: true },
        { name: 'Compañero', done: true },
        { name: 'Explorador', done: false, pct: 68 },
      ],
      specs: ['Orientación', 'Primeros auxilios', 'Campamento'],
    },
    carnets: {
      title: 'Carnets del club',
      subtitle: 'Impresión en malla 3×3 · carta',
      print: 'Imprimir lote',
      cards: ['Ana G.', 'Carlos M.', 'Sofía L.'],
    },
  },
  en: {
    url: 'teofila.app/dashboard',
    sidebar: ['Home', 'Members', 'Events', 'Calendar', 'ID cards'],
    members: {
      title: 'Members',
      search: 'Search member…',
      active: 'Active',
      rows: [
        { name: 'Ana García M.', club: 'Pathfinders', role: 'Guide' },
        { name: 'Carlos Méndez R.', club: 'Adventurers', role: 'Member' },
        { name: 'Sofía López V.', club: 'Pathfinders', role: 'Member' },
      ],
    },
    progress: {
      title: 'Progressive classes',
      member: 'Carlos Méndez R.',
      classes: [
        { name: 'Friend', done: true },
        { name: 'Companion', done: true },
        { name: 'Explorer', done: false, pct: 68 },
      ],
      specs: ['Orienteering', 'First aid', 'Campcraft'],
    },
    carnets: {
      title: 'Club ID cards',
      subtitle: '3×3 letter-size print layout',
      print: 'Print batch',
      cards: ['Ana G.', 'Carlos M.', 'Sofía L.'],
    },
  },
};

function pick(language) {
  return COPY[language] || COPY.es;
}

export function MockAppChrome({ language, activeIndex = 1, children }) {
  const c = pick(language);
  return (
    <div className="landing-mock-app">
      <div className="landing-mock-titlebar">
        <span className="landing-mock-dot landing-mock-dot-red" />
        <span className="landing-mock-dot landing-mock-dot-yellow" />
        <span className="landing-mock-dot landing-mock-dot-green" />
        <span className="landing-mock-url">{c.url}</span>
      </div>
      <div className="landing-mock-layout">
        <aside className="landing-mock-sidebar">
          <div className="landing-mock-brand">Teófila</div>
          <ul>
            {c.sidebar.map((item, i) => (
              <li key={item} className={i === activeIndex ? 'is-active' : ''}>{item}</li>
            ))}
          </ul>
        </aside>
        <div className="landing-mock-main">{children}</div>
      </div>
    </div>
  );
}

function AppChrome({ language, children }) {
  return (
    <MockAppChrome language={language} activeIndex={1}>
      {children}
    </MockAppChrome>
  );
}

function MembersPreview({ language }) {
  const c = pick(language).members;
  return (
    <AppChrome language={language}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <h3>{c.title}</h3>
          <span className="landing-mock-pill">{c.active}</span>
        </div>
        <div className="landing-mock-search">{c.search}</div>
        <ul className="landing-mock-member-list">
          {c.rows.map(row => (
            <li key={row.name}>
              <span className="landing-mock-avatar" aria-hidden="true">{row.name.charAt(0)}</span>
              <div>
                <strong>{row.name}</strong>
                <span>{row.club} · {row.role}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppChrome>
  );
}

function ProgressPreview({ language }) {
  const c = pick(language).progress;
  return (
    <AppChrome language={language}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <h3>{c.title}</h3>
          <span className="landing-mock-sub">{c.member}</span>
        </div>
        <ul className="landing-mock-progress-list">
          {c.classes.map(cls => (
            <li key={cls.name}>
              <span className={`landing-mock-check${cls.done ? ' is-done' : ''}`} aria-hidden="true">
                {cls.done ? '✓' : ''}
              </span>
              <div className="landing-mock-progress-row">
                <strong>{cls.name}</strong>
                {!cls.done && (
                  <div className="landing-mock-bar">
                    <span style={{ width: `${cls.pct}%` }} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="landing-mock-tags">
          {c.specs.map(tag => (
            <span key={tag} className="landing-mock-tag">{tag}</span>
          ))}
        </div>
      </div>
    </AppChrome>
  );
}

function CarnetsPreview({ language }) {
  const c = pick(language).carnets;
  return (
    <AppChrome language={language}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <div>
            <h3>{c.title}</h3>
            <span className="landing-mock-sub">{c.subtitle}</span>
          </div>
          <button type="button" className="landing-mock-btn">{c.print}</button>
        </div>
        <div className="landing-mock-carnet-grid">
          {c.cards.map(name => (
            <div key={name} className="landing-mock-carnet">
              <div className="landing-mock-carnet-photo" aria-hidden="true">{name.charAt(0)}</div>
              <strong>{name}</strong>
              <span>Conquistadores</span>
            </div>
          ))}
        </div>
      </div>
    </AppChrome>
  );
}

const VARIANTS = {
  members: MembersPreview,
  progress: ProgressPreview,
  carnets: CarnetsPreview,
};

export function resolveHeroScreenshot(slide) {
  return slide?.screenshot || slide?.style_json?.screenshot || 'members';
}

export default function LandingHeroScreenshot({ variant = 'members', language = 'es', label = '' }) {
  const Preview = VARIANTS[variant] || VARIANTS.members;
  return (
    <div className="landing-hero-screenshot" aria-label={label}>
      <Preview language={language} />
    </div>
  );
}
