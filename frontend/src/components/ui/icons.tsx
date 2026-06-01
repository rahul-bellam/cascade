// Inline SVG icons (skill rule #4: SVG icons, never emoji). 24x24, currentColor.
import React from 'react';
type P = React.SVGProps<SVGSVGElement>;
const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const IconAlert = (p: P) => (<svg {...base} {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>);
export const IconShield = (p: P) => (<svg {...base} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>);
export const IconCheck = (p: P) => (<svg {...base} {...p}><path d="M20 6 9 17l-5-5"/></svg>);
export const IconSkull = (p: P) => (<svg {...base} {...p}><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><path d="M12 2a8 8 0 0 0-8 8c0 3 2 5 2 7v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1c0-2 2-4 2-7a8 8 0 0 0-8-8z"/></svg>);
export const IconBolt = (p: P) => (<svg {...base} {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>);
export const IconLightbulb = (p: P) => (<svg {...base} {...p}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/></svg>);
export const IconArrowRight = (p: P) => (<svg {...base} {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>);
export const IconArrowDown = (p: P) => (<svg {...base} {...p}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>);
export const IconRefresh = (p: P) => (<svg {...base} {...p}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>);
export const IconToolbox = (p: P) => (<svg {...base} {...p}><path d="M20 7h-3V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M9 7V4h6v3"/></svg>);
export const IconSpinner = (p: P) => (<svg {...base} {...p} className={`animate-spin ${p.className||''}`}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>);
export const IconChevron = (p: P) => (<svg {...base} {...p}><path d="m9 18 6-6-6-6"/></svg>);
