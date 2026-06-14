export function PathfinderShield({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M32 2L8 14v22c0 16 10.5 30.8 24 34 13.5-3.2 24-18 24-34V14L32 2z" fill="currentColor" opacity="0.15" />
      <path d="M32 6L12 16v19c0 13.2 8.6 25.4 20 28.6 11.4-3.2 20-15.4 20-28.6V16L32 6z" stroke="currentColor" strokeWidth="2" />
      <path d="M32 18v28M22 28h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="22" r="4" fill="currentColor" />
    </svg>
  );
}

export function AdventurerStar({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.12" />
      <path d="M32 8l6.5 19.8H59L41.8 38.4l6.5 19.8L32 47.6 15.7 58.2l6.5-19.8L5 27.8h20.5L32 8z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function MasterGuideCompass({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" />
      <circle cx="32" cy="32" r="4" fill="currentColor" />
      <path d="M32 8v8M32 48v8M8 32h8M48 32h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 16l8 16-8 8-8-8 8-16z" fill="currentColor" opacity="0.35" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const ICONS = {
  pathfinders: PathfinderShield,
  adventurers: AdventurerStar,
  masterguide: MasterGuideCompass,
};

export function ProgramIcon({ type, className }) {
  const Icon = ICONS[type] || PathfinderShield;
  return <Icon className={className} />;
}
