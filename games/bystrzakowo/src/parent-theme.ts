/**
 * Colors of the parent zone (panel, adult check, charts). The child-facing parts keep the game palette (ui.ts COLORS):
 * the gear on the world map and the weekly postcard image.
 * Playtests: `?ptheme=<name>` (dev only) switches the theme for screenshots.
 */
export interface ParentTheme {
  /** Overlay behind the panel and behind the picture viewer. */
  dim: string;
  /** Panel background and its outline. */
  sheet: string;
  sheetStroke: string;
  /** Content area and cards. */
  surface: string;
  /** Borders, dividers, chart grid. */
  line: string;
  /** Progress bar track, empty stars. */
  track: string;
  ink: string;
  soft: string;
  faint: string;
  /** Active tab, main action (buy), selected option. */
  primary: string;
  /** Inactive tabs, back, restore. */
  neutral: string;
  accent1: string;
  accent2: string;
  accent3: string;
  /** Low-key buttons (privacy policy). */
  quiet: string;
  danger: string;
  good: string;
  goodText: string;
  warnText: string;
  /** Card tints: trial / notices, purchase done / good news. */
  warmBg: string;
  goodBg: string;
  /** Item states in the skills view. */
  practicing: string;
  trouble: string;
  /** Chart lines. */
  chart1: string;
  chart2: string;
}

export const THEMES: Record<string, ParentTheme> = {
  // The original look (cream, brown, orange, purple).
  classic: {
    dim: '#2a1a40', sheet: '#fffaf2', sheetStroke: '#5a3c28', surface: '#ffffff', line: '#eadfce', track: '#f1e8da',
    ink: '#5a3c28', soft: '#6b5a4a', faint: '#9a8b7c',
    primary: '#ff9f5a', neutral: '#c9b8a6', accent1: '#9b7be0', accent2: '#5cb3ff', accent3: '#8fb8ff', quiet: '#8a9bb0',
    danger: '#e8835a', good: '#5cc36a', goodText: '#3f8a4a', warnText: '#b5563a', warmBg: '#fff3dd', goodBg: '#eef8e8',
    practicing: '#ffc94a', trouble: '#f08a6a', chart1: '#5cb3ff', chart2: '#9b7be0',
  },
  // White with the characters' colors: fox orange and badger blue on graphite text.
  white: {
    dim: '#1c2030', sheet: '#ffffff', sheetStroke: '#2b2f3e', surface: '#f5f6fa', line: '#e3e6ee', track: '#e9ebf1',
    ink: '#2b2f3e', soft: '#565c70', faint: '#8d92a3',
    primary: '#f2711c', neutral: '#a7adbb', accent1: '#1f7ae0', accent2: '#0f9aa8', accent3: '#4f9d3a', quiet: '#8d92a3',
    danger: '#e0463c', good: '#2e9e4f', goodText: '#23813f', warnText: '#c2410c', warmBg: '#fff4e8', goodBg: '#eaf6ee',
    practicing: '#f5b731', trouble: '#ef6a52', chart1: '#1f7ae0', chart2: '#f2711c',
  },
  // Navy and mint: calm, like apps made for parents.
  mint: {
    dim: '#0e1a2b', sheet: '#f6f8fb', sheetStroke: '#1d2b44', surface: '#ffffff', line: '#dfe5ee', track: '#e8edf4',
    ink: '#1d2b44', soft: '#4d5d78', faint: '#8593a8',
    primary: '#12a594', neutral: '#9aa7ba', accent1: '#2f5d9e', accent2: '#2c8be8', accent3: '#5aa9c9', quiet: '#8593a8',
    danger: '#de4b52', good: '#12a594', goodText: '#0d7f72', warnText: '#c2410c', warmBg: '#fff6e5', goodBg: '#e6f6f3',
    practicing: '#f2b84b', trouble: '#e86b5f', chart1: '#2c8be8', chart2: '#12a594',
  },
  // Night navy: a dark parent zone clearly apart from the colorful game.
  night: {
    dim: '#05070f', sheet: '#1b2340', sheetStroke: '#0c1124', surface: '#232c4d', line: '#36416b', track: '#323c63',
    ink: '#f1f3ff', soft: '#bcc3e3', faint: '#8a93bb',
    primary: '#f5a524', neutral: '#4d5a85', accent1: '#6f7dff', accent2: '#2fa8e0', accent3: '#3fb68b', quiet: '#5c6894',
    danger: '#e5534b', good: '#36b37e', goodText: '#5fd4a0', warnText: '#ffb199', warmBg: '#2d3658', goodBg: '#1f3b3d',
    practicing: '#f5c451', trouble: '#f07a6a', chart1: '#4cc3ff', chart2: '#f5a524',
  },
};

const pick = (): ParentTheme => {
  const q = import.meta.env.DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('ptheme') : null;
  return THEMES[q ?? ''] ?? THEMES.classic!;
};

/** The parent zone theme in use. */
export const PT: ParentTheme = pick();

/** Hex string → number for Pixi Graphics. */
export const num = (hex: string): number => parseInt(hex.slice(1), 16);
