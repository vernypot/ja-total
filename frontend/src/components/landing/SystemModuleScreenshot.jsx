import { MockAppChrome } from './LandingHeroScreenshot';

const MOCK = {
  es: {
    home: {
      activeIndex: 0,
      title: 'Inicio',
      pill: '3 clubes',
      stats: [
        { label: 'Miembros', value: '48' },
        { label: 'Eventos', value: '12' },
        { label: 'Cumpleaños', value: '4' },
        { label: 'Noticias', value: '2' },
      ],
    },
    clubs: {
      activeIndex: 2,
      title: 'Clubes',
      rows: [
        { name: 'Conquistadores', meta: '32 miembros · activo' },
        { name: 'Aventureros', meta: '16 miembros · activo' },
      ],
    },
    calendar: {
      activeIndex: 3,
      title: 'Calendario del club',
      month: 'Junio 2026',
      days: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
      highlights: [5, 12, 14, 21],
    },
    events: {
      activeIndex: 4,
      title: 'Eventos',
      rows: [
        { date: '14 Jun', name: 'Investidura', place: 'Salón principal' },
        { date: '21 Jun', name: 'Especialidad orientación', place: 'Cerro local' },
      ],
    },
    planning: {
      activeIndex: 4,
      title: 'Planificación del periodo',
      rows: [
        { name: 'Camporee regional', done: true },
        { name: 'Clase Explorador', done: true },
        { name: 'Día de servicio', done: false },
      ],
    },
    specialties: {
      activeIndex: 6,
      title: 'Especialidades',
      badges: ['Orientación', 'Primeros auxilios', 'Campamento', 'Natación', 'Artesanía'],
    },
    cargos: {
      activeIndex: 5,
      title: 'Cargos del club',
      rows: [
        { role: 'Director', name: 'Ana García' },
        { role: 'Secretario', name: 'Carlos Méndez' },
        { role: 'Consejero', name: 'Sofía López' },
      ],
    },
    news: {
      activeIndex: 1,
      title: 'Noticias',
      rows: [
        { category: 'Eventos', title: 'Camporee regional' },
        { category: 'Capacitación', title: 'Taller de especialidades' },
      ],
    },
    churches: {
      activeIndex: 2,
      title: 'Iglesias',
      rows: [
        { name: 'Central Alajuela', meta: '2 clubes · 48 miembros' },
        { name: 'San Rafael', meta: '1 club · 22 miembros' },
      ],
    },
  },
  en: {
    home: {
      activeIndex: 0,
      title: 'Home',
      pill: '3 clubs',
      stats: [
        { label: 'Members', value: '48' },
        { label: 'Events', value: '12' },
        { label: 'Birthdays', value: '4' },
        { label: 'News', value: '2' },
      ],
    },
    clubs: {
      activeIndex: 2,
      title: 'Clubs',
      rows: [
        { name: 'Pathfinders', meta: '32 members · active' },
        { name: 'Adventurers', meta: '16 members · active' },
      ],
    },
    calendar: {
      activeIndex: 3,
      title: 'Club calendar',
      month: 'June 2026',
      days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      highlights: [5, 12, 14, 21],
    },
    events: {
      activeIndex: 4,
      title: 'Events',
      rows: [
        { date: 'Jun 14', name: 'Investiture', place: 'Main hall' },
        { date: 'Jun 21', name: 'Orienteering honor', place: 'Local hill' },
      ],
    },
    planning: {
      activeIndex: 4,
      title: 'Period planning',
      rows: [
        { name: 'Regional camporee', done: true },
        { name: 'Explorer class', done: true },
        { name: 'Service day', done: false },
      ],
    },
    specialties: {
      activeIndex: 6,
      title: 'Specialties',
      badges: ['Orienteering', 'First aid', 'Campcraft', 'Swimming', 'Crafts'],
    },
    cargos: {
      activeIndex: 5,
      title: 'Club positions',
      rows: [
        { role: 'Director', name: 'Ana García' },
        { role: 'Secretary', name: 'Carlos Méndez' },
        { role: 'Counselor', name: 'Sofía López' },
      ],
    },
    news: {
      activeIndex: 1,
      title: 'News',
      rows: [
        { category: 'Events', title: 'Regional camporee' },
        { category: 'Training', title: 'Honors workshop' },
      ],
    },
    churches: {
      activeIndex: 2,
      title: 'Churches',
      rows: [
        { name: 'Central Alajuela', meta: '2 clubs · 48 members' },
        { name: 'San Rafael', meta: '1 club · 22 members' },
      ],
    },
  },
};

function pick(language, key) {
  const lang = MOCK[language] || MOCK.es;
  return lang[key] || MOCK.es[key];
}

function HomePreview({ language }) {
  const c = pick(language, 'home');
  return (
    <MockAppChrome language={language} activeIndex={c.activeIndex}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <h3>{c.title}</h3>
          <span className="landing-mock-pill">{c.pill}</span>
        </div>
        <div className="landing-mock-stat-grid">
          {c.stats.map(stat => (
            <div key={stat.label} className="landing-mock-stat">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </MockAppChrome>
  );
}

function MembersPreview({ language }) {
  const title = language === 'en' ? 'Members' : 'Miembros';
  const search = language === 'en' ? 'Search member…' : 'Buscar miembro…';
  const active = language === 'en' ? 'Active' : 'Activo';
  const memberRows = [
    { name: 'Ana García M.', club: language === 'en' ? 'Pathfinders' : 'Conquistadores', role: language === 'en' ? 'Guide' : 'Guía' },
    { name: 'Carlos Méndez R.', club: language === 'en' ? 'Adventurers' : 'Aventureros', role: language === 'en' ? 'Member' : 'Miembro' },
    { name: 'Sofía López V.', club: language === 'en' ? 'Pathfinders' : 'Conquistadores', role: language === 'en' ? 'Member' : 'Miembro' },
  ];
  return (
    <MockAppChrome language={language} activeIndex={5}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <h3>{title}</h3>
          <span className="landing-mock-pill">{active}</span>
        </div>
        <div className="landing-mock-search">{search}</div>
        <ul className="landing-mock-member-list">
          {memberRows.map(row => (
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
    </MockAppChrome>
  );
}

function ClubsPreview({ language }) {
  const c = pick(language, 'clubs');
  return (
    <MockAppChrome language={language} activeIndex={c.activeIndex}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <h3>{c.title}</h3>
        </div>
        <ul className="landing-mock-simple-list">
          {c.rows.map(row => (
            <li key={row.name}>
              <strong>{row.name}</strong>
              <span>{row.meta}</span>
            </li>
          ))}
        </ul>
      </div>
    </MockAppChrome>
  );
}

function CalendarPreview({ language }) {
  const c = pick(language, 'calendar');
  const cells = Array.from({ length: 28 }, (_, i) => i + 1);
  return (
    <MockAppChrome language={language} activeIndex={c.activeIndex}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <h3>{c.title}</h3>
          <span className="landing-mock-sub">{c.month}</span>
        </div>
        <div className="landing-mock-calendar">
          {c.days.map(day => (
            <span key={day} className="landing-mock-calendar-head">{day}</span>
          ))}
          {cells.map(day => (
            <span
              key={day}
              className={`landing-mock-calendar-day${c.highlights.includes(day) ? ' is-highlight' : ''}`}
            >
              {day}
            </span>
          ))}
        </div>
      </div>
    </MockAppChrome>
  );
}

function EventsPreview({ language }) {
  const c = pick(language, 'events');
  return (
    <MockAppChrome language={language} activeIndex={c.activeIndex}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <h3>{c.title}</h3>
        </div>
        <ul className="landing-mock-event-list">
          {c.rows.map(row => (
            <li key={row.name}>
              <span className="landing-mock-event-date">{row.date}</span>
              <div>
                <strong>{row.name}</strong>
                <span>{row.place}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </MockAppChrome>
  );
}

function PlanningPreview({ language }) {
  const c = pick(language, 'planning');
  return (
    <MockAppChrome language={language} activeIndex={c.activeIndex}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <h3>{c.title}</h3>
        </div>
        <ul className="landing-mock-checklist">
          {c.rows.map(row => (
            <li key={row.name}>
              <span className={`landing-mock-check${row.done ? ' is-done' : ''}`} aria-hidden="true">
                {row.done ? '✓' : ''}
              </span>
              <span>{row.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </MockAppChrome>
  );
}

function ProgressPreview({ language }) {
  const classes = language === 'en'
    ? [
      { name: 'Friend', done: true },
      { name: 'Companion', done: true },
      { name: 'Explorer', done: false, pct: 68 },
    ]
    : [
      { name: 'Amigo', done: true },
      { name: 'Compañero', done: true },
      { name: 'Explorador', done: false, pct: 68 },
    ];
  const title = language === 'en' ? 'Progressive classes' : 'Clases progresivas';
  const member = 'Carlos Méndez R.';
  return (
    <MockAppChrome language={language} activeIndex={6}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <h3>{title}</h3>
          <span className="landing-mock-sub">{member}</span>
        </div>
        <ul className="landing-mock-progress-list">
          {classes.map(cls => (
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
      </div>
    </MockAppChrome>
  );
}

function SpecialtiesPreview({ language }) {
  const c = pick(language, 'specialties');
  return (
    <MockAppChrome language={language} activeIndex={c.activeIndex}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <h3>{c.title}</h3>
        </div>
        <div className="landing-mock-tags landing-mock-tags--padded">
          {c.badges.map(tag => (
            <span key={tag} className="landing-mock-tag">{tag}</span>
          ))}
        </div>
      </div>
    </MockAppChrome>
  );
}

function CargosPreview({ language }) {
  const c = pick(language, 'cargos');
  return (
    <MockAppChrome language={language} activeIndex={c.activeIndex}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <h3>{c.title}</h3>
        </div>
        <ul className="landing-mock-simple-list">
          {c.rows.map(row => (
            <li key={row.role}>
              <strong>{row.role}</strong>
              <span>{row.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </MockAppChrome>
  );
}

function CarnetsPreview({ language }) {
  const title = language === 'en' ? 'Club ID cards' : 'Carnets del club';
  const subtitle = language === 'en' ? '3×3 letter-size print layout' : 'Impresión en malla 3×3 · carta';
  const print = language === 'en' ? 'Print batch' : 'Imprimir lote';
  const cards = ['Ana G.', 'Carlos M.', 'Sofía L.'];
  const club = language === 'en' ? 'Pathfinders' : 'Conquistadores';
  return (
    <MockAppChrome language={language} activeIndex={7}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <div>
            <h3>{title}</h3>
            <span className="landing-mock-sub">{subtitle}</span>
          </div>
          <button type="button" className="landing-mock-btn">{print}</button>
        </div>
        <div className="landing-mock-carnet-grid">
          {cards.map(name => (
            <div key={name} className="landing-mock-carnet">
              <div className="landing-mock-carnet-photo" aria-hidden="true">{name.charAt(0)}</div>
              <strong>{name}</strong>
              <span>{club}</span>
            </div>
          ))}
        </div>
      </div>
    </MockAppChrome>
  );
}

function NewsPreview({ language }) {
  const c = pick(language, 'news');
  return (
    <MockAppChrome language={language} activeIndex={c.activeIndex}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <h3>{c.title}</h3>
        </div>
        <ul className="landing-mock-news-list">
          {c.rows.map(row => (
            <li key={row.title}>
              <span className="landing-mock-tag">{row.category}</span>
              <strong>{row.title}</strong>
            </li>
          ))}
        </ul>
      </div>
    </MockAppChrome>
  );
}

function ChurchesPreview({ language }) {
  const c = pick(language, 'churches');
  return (
    <MockAppChrome language={language} activeIndex={c.activeIndex}>
      <div className="landing-mock-panel">
        <div className="landing-mock-panel-head">
          <h3>{c.title}</h3>
        </div>
        <ul className="landing-mock-simple-list">
          {c.rows.map(row => (
            <li key={row.name}>
              <strong>{row.name}</strong>
              <span>{row.meta}</span>
            </li>
          ))}
        </ul>
      </div>
    </MockAppChrome>
  );
}

const VARIANTS = {
  home: HomePreview,
  members: MembersPreview,
  clubs: ClubsPreview,
  calendar: CalendarPreview,
  events: EventsPreview,
  planning: PlanningPreview,
  progress: ProgressPreview,
  specialties: SpecialtiesPreview,
  cargos: CargosPreview,
  carnets: CarnetsPreview,
  news: NewsPreview,
  churches: ChurchesPreview,
};

export default function SystemModuleScreenshot({ variant = 'home', language = 'es', label = '' }) {
  const Preview = VARIANTS[variant] || VARIANTS.home;
  return (
    <div className="system-module-screenshot" aria-label={label}>
      <Preview language={language} />
    </div>
  );
}
