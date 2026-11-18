import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { circle, defs, radialGradient, svg, text } from '@funfactory/art';
import { svgTexture } from '@funfactory/kit2d';
import { POWER, type Run, type TimedPower } from '../sim/run.ts';
import type { PowerKind } from '../sim/shaft.ts';

export const POWER_INFO: Record<PowerKind, { name: string; color: number; css: string; glyph: string }> = {
  shell: { name: 'Gumowa skorupka', color: 0xff9ebb, css: '#ff9ebb', glyph: 'S' },
  breath: { name: 'Drugi oddech', color: 0xffffff, css: '#ffffff', glyph: 'O' },
  magnet: { name: 'Magnes', color: 0xff6f8f, css: '#ff6f8f', glyph: 'M' },
  frost: { name: 'Lodowy oddech', color: 0x8fdcff, css: '#8fdcff', glyph: 'L' },
  rocket: { name: 'Pieprzowa rakieta', color: 0xff6a3d, css: '#ff6a3d', glyph: 'R' },
  glue: { name: 'Lepkie łapki', color: 0x8ee3a1, css: '#8ee3a1', glyph: 'Ł' },
};

export const POWER_KINDS = Object.keys(POWER_INFO) as PowerKind[];

/** Zapasowa ikona z kodu (zanim pojawi się grafika z Flux). */
export function fallbackIcon(kind: PowerKind, pixelRatio: number): Promise<Texture> {
  const info = POWER_INFO[kind];
  return svgTexture(
    svg(96, 96, [
      defs([radialGradient('g', [[0, '#ffffff'], [0.6, info.css], [1, info.css]])]),
      circle(48, 48, 40, { fill: 'url(#g)', stroke: '#1e1530', strokeWidth: 5 }),
      text(48, 62, info.glyph, { fill: '#1e1530', fontSize: 40, fontWeight: 900, fontFamily: 'system-ui, sans-serif', textAnchor: 'middle' }),
    ]),
    pixelRatio * 1.5,
  );
}

/** Bańka z power-upem w studni: poświata, ikona, kołysanie. */
export class PowerBubble extends Container {
  private readonly glow = new Graphics();
  private readonly icon: Sprite;
  private readonly phase: number;

  constructor(kind: PowerKind, texture: Texture, phase: number) {
    super();
    const color = POWER_INFO[kind].color;
    this.glow.circle(0, 0, 46).fill({ color, alpha: 0.22 }).circle(0, 0, 40).stroke({ color: 0xffffff, width: 4, alpha: 0.75 });
    this.glow.ellipse(-14, -20, 10, 6).fill({ color: 0xffffff, alpha: 0.7 });
    this.icon = new Sprite({ texture, anchor: 0.5 });
    this.icon.scale.set(62 / Math.max(texture.width, texture.height));
    this.addChild(this.glow, this.icon);
    this.phase = phase;
  }

  tick(time: number): void {
    const t = time * 2.4 + this.phase;
    this.glow.scale.set(1 + Math.sin(t * 1.7) * 0.06);
    this.icon.rotation = Math.sin(t) * 0.15;
    this.pivot.y = Math.sin(t * 1.2) * 6;
  }
}

/** Pasek aktywnych power-upów: ikona i kurczący się pasek czasu. */
export class PowerHud extends Container {
  private readonly slots = new Map<PowerKind, { view: Container; bar: Graphics }>();
  private readonly icons: Map<PowerKind, Texture>;

  constructor(icons: Map<PowerKind, Texture>) {
    super();
    this.icons = icons;
  }

  setIcon(kind: PowerKind, texture: Texture): void {
    this.icons.set(kind, texture);
    const slot = this.slots.get(kind);
    if (slot) {
      slot.view.destroy({ children: true });
      this.slots.delete(kind);
    }
  }

  update(run: Run): void {
    const active: { kind: PowerKind; left: number }[] = [];
    for (const kind of Object.keys(run.timers) as TimedPower[]) {
      if (run.timers[kind] > 0) active.push({ kind, left: run.timers[kind] / POWER[kind] });
    }
    if (run.air > 0) active.push({ kind: 'breath', left: 1 });
    const keep = new Set(active.map((a) => a.kind));
    for (const [kind, slot] of this.slots) {
      if (!keep.has(kind)) {
        slot.view.destroy({ children: true });
        this.slots.delete(kind);
      }
    }
    active.forEach((a, i) => {
      let slot = this.slots.get(a.kind);
      if (!slot) {
        const view = new Container();
        const tex = this.icons.get(a.kind);
        const bg = new Graphics().circle(0, 0, 34).fill({ color: 0x1e1530, alpha: 0.7 }).stroke({ color: POWER_INFO[a.kind].color, width: 3 });
        view.addChild(bg);
        if (tex) {
          const s = new Sprite({ texture: tex, anchor: 0.5 });
          s.scale.set(48 / Math.max(tex.width, tex.height));
          view.addChild(s);
        }
        const bar = new Graphics();
        view.addChild(bar);
        this.addChild(view);
        slot = { view, bar };
        this.slots.set(a.kind, slot);
      }
      slot.view.position.set(0, i * 84);
      slot.bar.clear().arc(0, 0, 38, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * a.left).stroke({ color: POWER_INFO[a.kind].color, width: 5 });
    });
  }
}
