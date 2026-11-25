const designs = {
  brand: <><circle cx="12" cy="5" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="m10.5 7.6-4 7.8m7-7.8 4 7.8M8 18h8"/></>,
  profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  capacity: <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>,
  idea: <path d="M9 18h6m-5 4h4m-6-7a6 6 0 1 1 8 0c-1 .8-1 1.5-1 3H9c0-1.5 0-2.2-1-3Z"/>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5 3 3 5-5"/></>,
  organization: <><circle cx="9" cy="8" r="3"/><path d="M2 20v-2a7 7 0 0 1 14 0v2M17 5a3 3 0 0 1 0 6m1 3a6 6 0 0 1 4 6"/></>,
  library: <path d="M12 5v16M3 4h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z"/>,
  discovery: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
  open: <path d="M7 17 17 7M7 7h10v10"/>,
  next: <path d="m9 6 6 6-6 6"/>,
  forward: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  back: <path d="M19 12H5m6-6-6 6 6 6"/>,
  spark: <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>,
  tracking: <><rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1" fill="currentColor"/><path d="m8 13 3 3 5-6"/></>,
  defined: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  tentative: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  pending: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3h.01"/></>,
  excluded: <><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></>,
  resources: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M21 10h-6v5h6m-3-2.5h.01"/></>,
  evidence: <path d="M3 6h7l2 3h9l-2 11H3Z"/>,
};

export type WorkspaceIconName = keyof typeof designs;

/** Ícones lineares da referência visual DigItap 01. O texto adjacente fornece o nome acessível. */
export function DigItapWorkspaceIcon({ name, className }: { name: WorkspaceIconName; className?: string }) {
  return <svg className={className} aria-hidden="true" focusable="false" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{designs[name]}</svg>;
}
