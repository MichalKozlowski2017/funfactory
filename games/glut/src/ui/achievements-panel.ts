import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { hexToNumber, palettes } from '@funfactory/art';
import { Button, type View } from '@funfactory/kit2d';
import { ACHIEVEMENTS, formatTime, LOWER_IS_BETTER, type Progress } from '../sim/achievements.ts';
import { ITEMS } from '../sim/shop.ts';
import { trophy } from './achievement-toast.ts';
import { achDesc, achName, itemName, t } from '../i18n.ts';

const pal = palettes.candy;
const FONT = 'system-ui, -apple-system, sans-serif';
const ROW_H = 128;

/** Lista osiągnięć z postępem; przewijana palcem. Zdobyte na górze listy zostają w kolejności definicji. */
export class AchievementsPanel extends Container {
  private readonly dim = new Graphics();
  private readonly panel = new Graphics();
  private readonly body = new Container();
  private readonly list = new Container();
  private readonly clip = new Graphics();
  private readonly title: Text;
  private readonly count: Text;
  private readonly close: Button;
  private viewH = 600;
  private scroll = 0;
  private velocity = 0;
  private drag: { y: number; scroll: number; t: number } | null = null;

  constructor(o: { pixelRatio: number; progress: Progress; earned: readonly string[]; onClose: () => void }) {
    super();
    const text = (size: number, fill: string, weight: '700' | '800' = '800') =>
      new Text({
        text: '',
        style: { fontFamily: FONT, fontSize: size, fontWeight: weight, fill, stroke: { color: pal.ink, width: Math.max(3, size * 0.1), join: 'round' } },
        resolution: o.pixelRatio,
      });
    this.dim.eventMode = 'static';
    this.title = text(52, pal.surface);
    this.title.text = t('achievements');
    this.title.anchor.set(0.5);
    this.count = text(30, '#ffd166');
    this.count.anchor.set(0.5);
    const done = ACHIEVEMENTS.filter((d) => o.earned.includes(d.id)).length;
    this.count.text = `${done} / ${ACHIEVEMENTS.length}`;
    this.close = new Button({ label: t('done'), color: pal.accent, width: 320, height: 100, fontSize: 40, resolution: o.pixelRatio, onTap: o.onClose });

    ACHIEVEMENTS.forEach((d, i) => {
      const got = o.earned.includes(d.id);
      const raw = o.progress[d.metric];
      const timed = LOWER_IS_BETTER.has(d.metric);
      const value = timed ? raw : Math.min(d.goal, raw);
      const row = new Container();
      row.y = i * ROW_H;
      const bg = new Graphics().roundRect(-300, 0, 600, ROW_H - 14, 22).fill({ color: got ? 0x3d5a4a : 0x3a2c55 });
      const cup = trophy(60, got ? 0xffd166 : 0x6e6488);
      cup.position.set(-252, (ROW_H - 14) / 2);
      const name = text(32, got ? '#ffffff' : '#d8cdea');
      name.text = achName(d);
      name.position.set(-206, 12);
      const desc = text(24, got ? '#cfeedd' : '#a99cc0', '700');
      const item = d.item ? ITEMS.find((x) => x.id === d.item) : null;
      desc.text = `${achDesc(d)}${item ? ` · ${itemName(item.id)}` : ''}`;
      desc.position.set(-206, 54);
      const reward = text(28, got ? '#8ee3a1' : '#ffd166');
      reward.text = got ? '✓' : `+${d.reward}`;
      reward.anchor.set(1, 0);
      reward.position.set(282, 14);
      row.addChild(bg, cup, name, desc, reward);
      if (!got && d.goal > 1) {
        // Pasek postępu (na czas: im bliżej celu, tym pełniej; bez wyniku pusto).
        const k = timed ? (value > 0 ? Math.min(1, d.goal / value) : 0) : value / d.goal;
        const bar = new Graphics().roundRect(-206, 90, 400, 12, 6).fill({ color: 0x241a36 });
        if (k > 0) bar.roundRect(-206, 90, Math.max(12, 400 * k), 12, 6).fill({ color: 0xff9ebb });
        const num = text(22, '#a99cc0', '700');
        const isTime = timed || d.metric === 'longest';
        const fmt = (v: number) => (isTime ? formatTime(v) : `${v}`);
        num.text = timed ? `${value > 0 ? fmt(value) : '–'} / ${fmt(d.goal)}` : `${fmt(Math.floor(value))} / ${fmt(d.goal)}`;
        num.anchor.set(1, 0.5);
        num.position.set(282, 96);
        row.addChild(bar, num);
      }
      for (const t of [name, desc]) {
        const room = 470;
        if (t.width > room) t.scale.set(room / t.width);
      }
      this.list.addChild(row);
    });
    this.list.mask = this.clip;
    this.body.addChild(this.list, this.clip, this.title, this.count, this.close);
    this.addChild(this.dim, this.panel, this.body);

    // Przewijanie palcem z bezwładnością.
    this.dim.on('pointerdown', (e) => {
      const p = this.body.toLocal(e.global);
      this.drag = { y: p.y, scroll: this.scroll, t: performance.now() };
      this.velocity = 0;
    });
    this.dim.on('globalpointermove', (e) => {
      if (!this.drag) return;
      const p = this.body.toLocal(e.global);
      const next = this.drag.scroll - (p.y - this.drag.y);
      const now = performance.now();
      const dt = Math.max(1, now - this.drag.t) / 1000;
      this.velocity = (next - this.scroll) / dt;
      this.drag.t = now;
      this.setScroll(next);
    });
    const end = () => (this.drag = null);
    this.dim.on('pointerup', end);
    this.dim.on('pointerupoutside', end);
  }

  private get maxScroll(): number {
    return Math.max(0, ACHIEVEMENTS.length * ROW_H - this.viewH);
  }

  private setScroll(v: number): void {
    this.scroll = Math.max(0, Math.min(this.maxScroll, v));
    this.list.y = this.listTop - this.scroll;
  }

  private listTop = 0;

  layout(view: View, bottom = 0): void {
    this.dim.clear().rect(0, 0, view.width, view.height).fill({ color: 0x140c22, alpha: 0.75 });
    this.dim.hitArea = new Rectangle(0, 0, view.width, view.height);
    const top = view.safe.top + 20;
    const h = view.height - bottom - top - 10;
    this.panel.clear().roundRect(20, top, view.width - 40, h, 40).fill({ color: 0x2b1e3f }).stroke({ color: hexToNumber(pal.ink), width: 6 });
    this.body.position.set(view.width / 2, top);
    this.title.position.set(0, 60);
    this.count.position.set(0, 112);
    this.listTop = 150;
    this.viewH = h - 150 - 150;
    this.clip.clear().rect(-320, this.listTop, 640, this.viewH).fill({ color: 0xffffff });
    this.close.position.set(0, h - 80);
    this.setScroll(this.scroll);
  }

  tick(dt: number): void {
    this.close.tick(dt);
    if (!this.drag && Math.abs(this.velocity) > 5) {
      this.setScroll(this.scroll + this.velocity * dt);
      this.velocity *= Math.exp(-4 * dt);
    }
  }
}
