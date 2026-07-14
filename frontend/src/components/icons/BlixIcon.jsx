const ICONS = {
  home: (
    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" fill="currentColor" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" fill="currentColor" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="currentColor" />
    </>
  ),
  blog: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  events: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  clubs: (
    <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
  ),
  members: (
    <>
      <circle cx="9" cy="9" r="3" fill="currentColor" />
      <circle cx="16" cy="10" r="2.5" fill="currentColor" />
      <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" fill="currentColor" />
      <path d="M14 19c0-2 1.5-3.5 4-3.5" fill="currentColor" />
    </>
  ),
  plan: (
    <>
      <rect x="5" y="4" width="14" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h11a2 2 0 0 1 2 2v14l-7-4-7 4V6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  star: (
    <path d="M12 3l2.4 5.6L20 9.5l-4.5 3.9L16.8 20 12 16.8 7.2 20l1.3-6.6L4 9.5l5.6-.9L12 3z" fill="currentColor" />
  ),
  badge: (
    <>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  church: (
    <>
      <path d="M12 3l7 5v13H5V8l7-5z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v8" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  tag: (
    <>
      <path d="M4 12V4h8l8 8-8 8-8-8z" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
    </>
  ),
  idcard: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="12" r="2" fill="currentColor" />
      <path d="M14 10h5M14 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h18M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9z" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M11 12h9l-2 2 2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  edit: (
    <>
      <path d="M4 18h4l10-10-4-4L4 14v4z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M13 6l4 4" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  web: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  close: (
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  contact: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4 8l8 5 8-5" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
};

export default function BlixIcon({ name, className = '', size = 20 }) {
  const content = ICONS[name];
  if (!content) return null;

  return (
    <svg
      className={`blix-icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {content}
    </svg>
  );
}

export { ICONS };
