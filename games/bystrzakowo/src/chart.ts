import { Container, Graphics, Text } from 'pixi.js';
import type { Point } from './sim/skills.ts';
import { lang } from './sim/lang.ts';
import { COLORS, FONT } from './ui.ts';
import { num, PT } from './parent-theme.ts';

export interface ChartOptions {
  width: number;
  height: number;
  points: readonly Point[];
  /** '%': values 0..1; 's': seconds. */
  unit: '%' | 's';
  color: number;
  resolution: number;
  /** X-axis label for a point (e.g. "7.12"). */
  label: (p: Point) => string;
  /** Small chart in a list row: no axes, labels or markers. */
  mini?: boolean;
}

const SOFT = PT.faint;

/** Top of the seconds axis: rounded up, with headroom. */
const secondsTop = (points: readonly Point[]): number => {
  const max = Math.max(1, ...points.map((p) => p.value ?? 0));
  return Math.ceil(max * 1.25);
};

/**
 * Progress line chart: a line through the points with data (periods without data are skipped, the line jumps over them),
 * dots, grid and labels. A triangle above a point: the activity moved up a level.
 */
export function lineChart(o: ChartOptions): Container {
  const c = new Container();
  const text = (value: string, size: number, color = SOFT) =>
    new Text({ text: value, resolution: o.resolution, style: { fontFamily: FONT, fontSize: size, fontWeight: '700', fill: color } });
  const left = o.mini ? 4 : 64;
  const right = o.mini ? 4 : 16;
  const top = o.mini ? 4 : 30;
  const bottom = o.mini ? 4 : 40;
  const w = o.width - left - right;
  const h = o.height - top - bottom;
  const maxV = o.unit === '%' ? 1 : secondsTop(o.points);
  const n = o.points.length;
  const xOf = (i: number) => left + (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const yOf = (v: number) => top + h - (Math.max(0, Math.min(maxV, v)) / maxV) * h;

  const grid = new Graphics();
  c.addChild(grid);
  if (!o.mini) {
    const steps = o.unit === '%' ? [0, 0.5, 1] : [0, maxV / 2, maxV];
    for (const v of steps) {
      grid.moveTo(left, yOf(v)).lineTo(left + w, yOf(v)).stroke({ color: num(PT.line), width: 2 });
      const t = text(o.unit === '%' ? `${Math.round(v * 100)}%` : `${(Math.round(v * 10) / 10).toLocaleString(lang())} s`, 20);
      t.anchor.set(1, 0.5);
      t.position.set(left - 10, yOf(v));
      c.addChild(t);
    }
    // X-axis labels: every few periods, so they don't run together.
    const every = Math.max(1, Math.ceil(n / 6));
    o.points.forEach((p, i) => {
      if ((n - 1 - i) % every) return;
      const t = text(o.label(p), 19);
      t.anchor.set(0.5, 0);
      t.position.set(xOf(i), top + h + 10);
      c.addChild(t);
    });
  } else grid.moveTo(left, top + h).lineTo(left + w, top + h).stroke({ color: num(PT.line), width: 2 });

  const pts = o.points.map((p, i) => (p.value === null ? null : { x: xOf(i), y: yOf(p.value), p }));
  const line = new Graphics();
  let started = false;
  for (const q of pts) {
    if (!q) continue;
    if (!started) line.moveTo(q.x, q.y);
    else line.lineTo(q.x, q.y);
    started = true;
  }
  if (started) line.stroke({ color: o.color, width: o.mini ? 4 : 6, cap: 'round', join: 'round' });
  c.addChild(line);
  const dots = new Graphics();
  for (const q of pts) if (q) dots.circle(q.x, q.y, o.mini ? 3.5 : 7).fill({ color: num(PT.surface) }).stroke({ color: o.color, width: o.mini ? 2.5 : 4 });
  c.addChild(dots);
  if (!o.mini) {
    const marks = new Graphics();
    o.points.forEach((p, i) => {
      if (!p.levelUp) return;
      const x = xOf(i);
      marks.moveTo(x, top + 2).lineTo(x, top + h).stroke({ color: COLORS.sun, width: 3, alpha: 0.7 });
      marks.poly([x - 10, top + 2, x + 10, top + 2, x, top - 14]).fill({ color: COLORS.sun }).stroke({ color: num(PT.ink), width: 2.5, join: 'round' });
    });
    c.addChild(marks);
  }
  return c;
}
