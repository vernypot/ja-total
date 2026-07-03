export const PROGRAM_LOGOS = {
  ministerios: {
    src: '/logos/ministerios-juvenile.png',
    alt: { es: 'Ministerios juveniles adventistas', en: 'Adventist youth ministries' },
  },
  pathfinders: {
    src: '/logos/conquistadores.png',
    alt: { es: 'Conquistadores', en: 'Pathfinders' },
  },
  adventurers: {
    src: '/logos/aventureros.png',
    alt: { es: 'Aventureros', en: 'Adventurers' },
  },
  masterguide: {
    src: '/logos/guias-mayores.png',
    alt: { es: 'Guías Mayores', en: 'Master Guide' },
  },
};

const LEGACY_ICON_ALIASES = {
  conquistadores: 'pathfinders',
  aventureros: 'adventurers',
  'guias-mayores': 'masterguide',
  guias_mayores: 'masterguide',
  all: 'ministerios',
  youth: 'ministerios',
};

function resolveLogoKey(type) {
  const key = LEGACY_ICON_ALIASES[type] || type;
  return PROGRAM_LOGOS[key] ? key : 'ministerios';
}

export function ProgramLogo({ type = 'ministerios', className = '', language = 'es' }) {
  const key = resolveLogoKey(type);
  const logo = PROGRAM_LOGOS[key];
  const alt = logo.alt[language] || logo.alt.es;

  return (
    <img
      src={logo.src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}

/** @deprecated Use ProgramLogo — kept for CMS references that still import ProgramIcon */
export function ProgramIcon(props) {
  return <ProgramLogo {...props} />;
}

export function PathfinderShield({ className = '' }) {
  return <ProgramLogo type="pathfinders" className={className} />;
}
