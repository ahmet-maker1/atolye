import React, { useMemo, createContext, useContext, useState, useEffect } from 'react';
import { Truck, UserCircle2, Store, Shield, Wallet, Wrench } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

// ─── Color tokens ────────────────────────────────────────────────
// Two themes — initial = light. ThemeProvider mutates `C` at runtime.
const lightColors = {
  paper:      '#F3EEE3',
  paperDeep:  '#EAE3D3',
  paperLite:  '#FBF8F0',
  ink:        '#1A1816',
  inkSoft:    '#3D3833',
  muted:      '#8A7F70',
  line:       '#D9D0BD',
  accent:     '#C8421C',
  accentDeep: '#8F2D12',
  ok:         '#3B7A3E',
  warn:       '#B5791F',
  bad:        '#A62F22',
  // for UI chrome (sidebar, modals)
  surface:    '#FBF8F0',
  surfaceDeep:'#EAE3D3',
  // pill backgrounds (need to vary per theme to stay legible)
  pillOk:     '#E6EDE4',
  pillWarn:   '#F3E9D2',
  pillBad:    '#F0DAD4',
  pillNeutral:'#E8E4DC',
  pillMuted:  '#EFEADD',
  // chart colors
  chartA:     '#1A1816',
  chartB:     '#C8421C',
  chartC:     '#3B7A3E',
  chartD:     '#B5791F',
  chartE:     '#A62F22',
  chartGrid:  '#D9D0BD',
};

const darkColors = {
  paper:      '#16140F',     // deep warm dark
  paperDeep:  '#0E0C09',
  paperLite:  '#1F1B16',     // card surface
  ink:        '#F0EAD8',     // primary text — warm cream
  inkSoft:    '#C9C0AB',
  muted:      '#7A7163',
  line:       '#403A30',     // ▲ artırıldı (eski #332E26 çok mat, border'lar görünmüyordu)
  accent:     '#E6622E',     // brighter vermilion for dark bg
  accentDeep: '#C8421C',
  ok:         '#7DB876',
  warn:       '#D9A455',
  bad:        '#D9665A',
  surface:    '#1F1B16',
  surfaceDeep:'#0E0C09',
  pillOk:     '#243524',
  pillWarn:   '#3A2D17',
  pillBad:    '#3A1F1B',
  pillNeutral:'#2A2620',
  pillMuted:  '#252119',
  chartA:     '#F0EAD8',
  chartB:     '#E6622E',
  chartC:     '#7DB876',
  chartD:     '#D9A455',
  chartE:     '#D9665A',
  chartGrid:  '#403A30',
};

// `C` is a mutable singleton. Components import it directly and read its
// keys inline. ThemeProvider mutates it via Object.assign on theme change
// AND triggers a re-render via state, so React reads the new values.
export const C = { ...lightColors };

// ─── Theme Context ───────────────────────────────────────────────
const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('atolye_theme') || 'light';
  });

  // Apply theme: mutate C + set <html data-theme> + persist
  useEffect(() => {
    const palette = theme === 'dark' ? darkColors : lightColors;
    Object.assign(C, palette);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
      // Also set CSS vars in case anyone uses var(--paper) etc.
      const root = document.documentElement.style;
      for (const [k, v] of Object.entries(palette)) {
        root.setProperty('--' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), v);
      }
    }
    localStorage.setItem('atolye_theme', theme);
  }, [theme]);

  const setTheme = (t) => setThemeState(t);
  const toggle = () => setThemeState(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// ─── Phone body gradient mapping ─────────────────────────────────
export const phoneColor = (name) => {
  const map = {
    'Natural Titanyum':  'linear-gradient(135deg, #A89F90, #6B6357)',
    'Midnight':          'linear-gradient(135deg, #2C2E3B, #14151E)',
    'Starlight':         'linear-gradient(135deg, #F0EAD8, #C9C0A8)',
    'Titanium Black':    'linear-gradient(135deg, #3A3A3A, #1A1A1A)',
    'Jade Green':        'linear-gradient(135deg, #4F7361, #2B4234)',
    'Awesome Navy':      'linear-gradient(135deg, #2E3E5B, #172338)',
    'Obsidian':          'linear-gradient(135deg, #2A2A2A, #101010)',
    'Pacific Blue':      'linear-gradient(135deg, #2B5776, #13334D)',
    'Phantom Black':     'linear-gradient(135deg, #1E1E1E, #0A0A0A)',
  };
  return map[name] || 'linear-gradient(135deg, #6B6357, #3D3833)';
};

// ─── Status Pill ─────────────────────────────────────────────────
const statusColorMap = (s) => {
  switch (s) {
    case 'stokta':        return { bg: C.pillOk,      fg: C.ok,    dot: C.ok };
    case 'satıldı':       return { bg: C.pillNeutral, fg: C.ink,   dot: C.ink };
    case 'serviste':      return { bg: C.pillWarn,    fg: C.warn,  dot: C.warn };
    case 'arızalı':       return { bg: C.pillBad,     fg: C.bad,   dot: C.bad };
    case 'işlemde':       return { bg: C.pillWarn,    fg: C.warn,  dot: C.warn };
    case 'hazır':         return { bg: C.pillOk,      fg: C.ok,    dot: C.ok };
    case 'beklemede':     return { bg: C.pillMuted,   fg: C.muted, dot: C.muted };
    case 'teslim edildi': return { bg: C.pillNeutral, fg: C.ink,   dot: C.ink };
    default:              return { bg: C.pillOk,      fg: C.ok,    dot: C.ok };
  }
};

export const StatusPill = ({ s }) => {
  const st = statusColorMap(s);
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] font-mono"
      style={{ background: st.bg, color: st.fg }}>
      <span className="w-1 h-1 rounded-full" style={{ background: st.dot }} />
      {s}
    </span>
  );
};

// ─── Role Pill ───────────────────────────────────────────────────
const roleColorMap = (r) => {
  switch (r) {
    case 'tedarikçi': return { bg: C.pillOk,      fg: C.ok,    icon: Truck };
    case 'müşteri':   return { bg: C.pillNeutral, fg: C.ink,   icon: UserCircle2 };
    case 'her ikisi': return { bg: C.pillWarn,    fg: C.warn,  icon: Store };
    case 'Admin':     return { bg: C.ink,         fg: C.paper, icon: Shield };
    case 'Kasiyer':   return { bg: C.pillNeutral, fg: C.ink,   icon: Wallet };
    case 'Teknisyen': return { bg: C.pillWarn,    fg: C.warn,  icon: Wrench };
    default:          return { bg: C.pillNeutral, fg: C.ink,   icon: UserCircle2 };
  }
};

export const RolePill = ({ r }) => {
  const st = roleColorMap(r);
  const Icon = st.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] font-mono"
      style={{ background: st.bg, color: st.fg }}>
      <Icon size={10} strokeWidth={2} /> {r}
    </span>
  );
};

// ─── Card with corner brackets ───────────────────────────────────
export const Card = ({ children, className = '', pad = true, corners = true }) => (
  <div className={`relative ${className}`}
    style={{
      background: C.paperLite,
      border: `1px solid ${C.line}`,
      boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
    }}>
    {corners && <>
      <span className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: C.ink, margin: '-1px 0 0 -1px' }} />
      <span className="absolute top-0 right-0 w-2 h-2 border-t border-r" style={{ borderColor: C.ink, margin: '-1px -1px 0 0' }} />
      <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l" style={{ borderColor: C.ink, margin: '0 0 -1px -1px' }} />
      <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: C.ink, margin: '0 -1px -1px 0' }} />
    </>}
    <div className={pad ? 'p-4 sm:p-5' : ''}>{children}</div>
  </div>
);

// ─── Section Label ───────────────────────────────────────────────
export const SectionLabel = ({ num, label, right }) => (
  <div className="flex items-end justify-between mb-3 pb-2 border-b gap-3" style={{ borderColor: C.line }}>
    <div className="flex items-baseline gap-3 min-w-0">
      <span className="text-[10px] tracking-[0.2em] uppercase font-mono whitespace-nowrap" style={{ color: C.muted }}>§ {num}</span>
      <h2 className="text-base sm:text-lg font-serif truncate" style={{ fontWeight: 500, letterSpacing: '-0.01em', color: C.ink }}>
        {label}
      </h2>
    </div>
    {right && <div className="flex-shrink-0">{right}</div>}
  </div>
);

// ─── KPI card ────────────────────────────────────────────────────
export const KPI = ({ label, value, sub, accent }) => (
  <Card>
    <div className="text-[10px] tracking-[0.2em] uppercase font-mono mb-3" style={{ color: C.muted }}>
      {label}
    </div>
    <div className="text-[28px] sm:text-[34px] leading-none font-serif" style={{
      fontWeight: 400, letterSpacing: '-0.02em',
      color: accent ? C.accent : C.ink
    }}>
      {value}
    </div>
    {sub && <div className="mt-2 text-xs" style={{ color: C.muted }}>{sub}</div>}
  </Card>
);

// ─── Phone thumbnail ─────────────────────────────────────────────
export const PhoneThumb = ({ color, size = 48 }) => {
  const w = size * 0.52;
  return (
    <div className="relative flex-shrink-0" style={{ width: w, height: size }}>
      <div className="absolute inset-0" style={{
        background: phoneColor(color),
        borderRadius: size * 0.12,
        border: '1px solid rgba(0,0,0,0.2)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div className="absolute" style={{
          top: size * 0.06, left: '50%', transform: 'translateX(-50%)',
          width: w * 0.35, height: 2, borderRadius: 2,
          background: 'rgba(0,0,0,0.35)',
        }} />
        <div className="absolute" style={{
          inset: size * 0.06, top: size * 0.11,
          borderRadius: size * 0.06,
          background: 'rgba(0,0,0,0.15)',
          border: '1px solid rgba(0,0,0,0.1)',
        }} />
      </div>
    </div>
  );
};

// ─── QR code (real, scannable) ───────────────────────────────────
// Pass the full URL (e.g. https://x.y.z/qr/<token>) so phones scanning it
// open the device page directly. Always renders white/black for print legibility.
export const FakeQR = ({ size = 72, value, seed }) => {
  // Backwards-compat: if `seed` is passed (legacy call sites), build the URL.
  const v = value || (typeof window !== 'undefined' && seed
    ? `${window.location.origin}/qr/${seed}`
    : seed || '');
  return (
    <div style={{ background: '#fff', padding: 4, lineHeight: 0 }}>
      <QRCodeSVG
        value={v}
        size={size - 8}
        level="M"
        bgColor="#FFFFFF"
        fgColor="#1A1816"
      />
    </div>
  );
};

// Backwards-compat alias
export const QR = FakeQR;

// ─── Barcode (real Code128) ──────────────────────────────────────
// IMEI is 15 digits — Code128 handles it cleanly.
export const FakeBarcode = ({ value, height = 40, width = 180 }) => {
  if (!value) return null;
  // react-barcode width is per-bar, not total. We compute it from desired total width.
  // Code128 of a 15-digit IMEI generates ~140 modules. Aim for about that ratio.
  const barWidth = Math.max(1, width / 110);
  return (
    <div style={{ background: '#fff', display: 'inline-block', lineHeight: 0 }}>
      <Barcode
        value={String(value)}
        format="CODE128"
        width={barWidth}
        height={height - 12}
        displayValue={false}
        background="#FFFFFF"
        lineColor="#1A1816"
        margin={4}
      />
    </div>
  );
};

// Backwards-compat alias
export const BarcodeView = FakeBarcode;
