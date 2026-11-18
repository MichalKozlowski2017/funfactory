import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { haptics } from '@funfactory/core';
import { Button, gestures, popIn, pulse, Scene, type View } from '@funfactory/kit2d';
import { BOND, CLASSES, ENEMIES, TRAITS, WAVES, type ClassId, type EnemyId } from '../sim/data.ts';
import type { Point } from '../sim/map.ts';
import { bondKey, bondLevel, Run, type Defender, type Events } from '../sim/run.ts';

const FONT = 'system-ui, -apple-system, sans-serif';
/** Wysokość mapy w jednostkach gry (droga kończy się na y=1150). */
const MAP_H = 1190;
const PANEL_MIN = 330;

const C = {
  bg: 0x120e18,
  path: 0x3b2f2a,
  pathEdge: 0x2a211d,
  slot: 0x2a2433,
  slotEdge: 0x5a4d6b,
  blockRing: 0x8a7a5a,
  gate: 0x6b4a2a,
  panel: 0x1b1622,
  text: '#e9e0d2',
  dim: '#9a8f86',
  accent: '#e8a84a',
  bond: [0x5a5266, 0xc9ccd6, 0xf0c050],
  cls: { knight: 0x6f8fb8, archer: 0x6faa6a, mage: 0x9a72c8, priestess: 0xd8b860 } as Record<ClassId, number>,
  enemy: { ghoul: 0x8a8f7a, runner: 0xa0703a, brute: 0x6a4a3a, wraith: 0x5a5a9a, boss: 0x9a2a3a } as Record<EnemyId, number>,
};

interface Token {
  id: number;
  view: Container;
  body: Graphics;
  hp: Graphics;
  label: Text;
  badge: Text;
  marks: Text;
}

/**
 * Ostatnia Brama: szary prototyp. Ustawianie drużyny, fale, więzi, rany, nagrody.
 */
export class PlayScene extends Scene {
  readonly id = 'play';
  private run!: Run;
  private readonly mapLayer = new Container();
  private readonly ground = new Graphics();
  private readonly bondsG = new Graphics();
  private readonly enemyLayer = new Container();
  private readonly fxLayer = new Container();
  private readonly panel = new Graphics();
  private readonly tokenLayer = new Container();
  private readonly ui = new Container();
  private readonly overlay = new Container();
  private readonly input = new Container();
  private readonly tokens = new Map<number, Token>();
  private readonly enemyViews = new Map<number, { view: Container; hp: Graphics }>();
  private waveText!: Text;
  private gateText!: Text;
  private info!: Text;
  private toast!: Text;
  private startBtn!: Button;
  private speedBtn!: Button;
  private buttons: Button[] = [];
  private speed = 1;
  private selected: number | null = null;
  private dragging: { id: number; x: number; y: number } | null = null;
  private benchY = 0;
  private time = 0;

  override enter(): void {
    this.run = new Run(this.game.rng.int(1, 2 ** 31 - 1));
    // Warstwa gestów pod przyciskami: przyciski dostają dotyk pierwsze, reszta trafia do gestów.
    this.addChild(this.mapLayer, this.panel, this.input, this.tokenLayer, this.ui, this.overlay);
    this.mapLayer.addChild(this.ground, this.bondsG, this.enemyLayer, this.fxLayer);

    this.waveText = this.text(30, C.text);
    this.gateText = this.text(30, C.accent);
    this.gateText.anchor.set(1, 0);
    this.info = this.text(22, C.text);
    this.info.style.wordWrap = true;
    this.info.style.wordWrapWidth = 400;
    this.info.style.lineHeight = 30;
    this.toast = this.text(30, C.accent);
    this.toast.anchor.set(0.5);
    this.toast.alpha = 0;
    this.startBtn = new Button({ label: 'Do boju!', color: '#b5562c', width: 260, height: 96, fontSize: 38, resolution: this.game.pixelRatio, onTap: () => this.startWave() });
    this.speedBtn = new Button({ label: '×1', color: '#4a4058', width: 120, height: 80, fontSize: 32, resolution: this.game.pixelRatio, onTap: () => this.toggleSpeed() });
    this.buttons.push(this.startBtn, this.speedBtn);
    this.ui.addChild(this.waveText, this.gateText, this.info, this.startBtn, this.speedBtn, this.toast);

    const input = gestures(this.input, { dragThreshold: 8 });
    input.on('tap', ({ x, y }) => this.tap(x, y));
    input.on('dragStart', ({ x, y }) => this.dragStart(x, y));
    input.on('drag', ({ x, y }) => this.dragMove(x, y));
    input.on('dragEnd', ({ x, y }) => this.dragEnd(x, y));

    this.syncTokens();
    this.refreshUi();
    this.timers.after(0.1, () => this.game.markReady());
  }

  override resize(view: View): void {
    const panelH = Math.max(PANEL_MIN, view.height - MAP_H);
    const scale = Math.min(1, (view.height - panelH) / MAP_H);
    this.mapLayer.scale.set(scale);
    this.mapLayer.x = (view.width - 720 * scale) / 2;
    this.mapLayer.y = 0;
    const top = MAP_H * scale;
    this.panel.clear().rect(0, top, view.width, view.height - top).fill({ color: C.panel });
    this.panel.rect(0, top, view.width, 4).fill({ color: 0x3a2f45 });
    this.benchY = top + 70;
    this.waveText.position.set(20, view.safe.top + 14);
    this.gateText.position.set(view.width - 20, view.safe.top + 14);
    this.info.position.set(24, top + 125);
    this.startBtn.position.set(view.width - 160, view.height - view.safe.bottom - 70);
    this.speedBtn.position.set(view.width - 100, view.height - view.safe.bottom - 70);
    this.toast.position.set(view.width / 2, top * 0.45);
    this.input.hitArea = new Rectangle(0, 0, view.width, view.height);
    this.drawGround();
    this.layoutTokens(true);
    this.layoutOverlay();
  }

  override fixedUpdate(dt: number): void {
    if (this.run.phase !== 'wave') return;
    for (let i = 0; i < this.speed; i++) {
      const ev = this.run.step(dt);
      this.react(ev);
      if (this.run.phase !== 'wave') {
        this.afterWave();
        break;
      }
    }
  }

  override update(dt: number): void {
    this.time += dt;
    for (const b of this.buttons) b.tick(dt);
    this.syncEnemies();
    this.updateTokens();
    this.drawBonds();
  }

  // --- przebieg ---

  private startWave(): void {
    if (this.run.phase !== 'plan') return;
    if (!this.run.party.some((d) => d.alive && d.slot !== null)) {
      this.say('Ustaw kogoś na stanowisku!');
      return;
    }
    this.run.startWave();
    this.selected = null;
    haptics.tap();
    this.refreshUi();
  }

  private toggleSpeed(): void {
    this.speed = this.speed === 1 ? 2 : 1;
    this.speedBtn.setLabel(`×${this.speed}`);
  }

  private afterWave(): void {
    const run = this.run;
    for (const v of this.enemyViews.values()) v.view.destroy({ children: true });
    this.enemyViews.clear();
    this.syncTokens();
    if (run.phase === 'reward') this.showRewards();
    else this.showEnd();
    this.refreshUi();
  }

  private react(ev: Events): void {
    for (const s of ev.shots) this.shot(s.from, s.to, s.kind);
    for (const e of ev.enemyDied) this.burst(e, C.enemy[e.kind]);
    if (ev.gateHit) {
      haptics.hit();
      void pulse(this.tweens, this.gateText, 0.3);
    }
    for (const d of ev.knockedOut) this.say(`${d.name} pada ranny!`);
    for (const d of ev.defenderFell) {
      haptics.error();
      this.say(`${d.name} poległ.`);
    }
    for (const d of ev.moods) this.say(d.mood === 'grief' ? `${d.name} w żałobie po ${d.mourns}` : `${d.name} wpada w szał po ${d.mourns}!`);
    for (const d of ev.levelUp) {
      const t = this.tokens.get(d.id);
      if (t) void pulse(this.tweens, t.view, 0.3);
    }
    if (ev.defenderFell.length) this.syncTokens();
  }

  private restart(): void {
    for (const t of this.tokens.values()) t.view.destroy({ children: true });
    this.tokens.clear();
    this.overlay.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.buttons = [this.startBtn, this.speedBtn];
    this.run = new Run(this.game.rng.int(1, 2 ** 31 - 1));
    this.selected = null;
    this.syncTokens();
    this.layoutTokens(true);
    this.refreshUi();
  }

  // --- nakładki: nagrody i koniec ---

  private showRewards(): void {
    const run = this.run;
    const view = this.game.view;
    const box = new Container();
    box.label = 'panel';
    const dim = new Graphics();
    dim.label = 'dim';
    const title = this.text(44, C.accent);
    title.text = `Fala ${run.wave} odparta`;
    title.anchor.set(0.5);
    title.y = -360;
    box.addChild(title);
    const lines = (run.lastSummary?.bondUps ?? []).map((b) => `${b.a.name} i ${b.b.name}: ${b.name}`);
    if (lines.length) {
      const bonds = this.text(26, '#f0c050');
      bonds.text = lines.join('\n');
      bonds.anchor.set(0.5);
      bonds.style.align = 'center';
      bonds.y = -290;
      box.addChild(bonds);
    }
    run.rewards.forEach((r, i) => {
      const b = new Button({
        label: r.title,
        color: '#4a3a5a',
        width: 600,
        height: 120,
        fontSize: 32,
        resolution: this.game.pixelRatio,
        onTap: () => {
          run.chooseReward(i);
          this.closeOverlay();
          this.syncTokens();
          this.layoutTokens(false);
          this.refreshUi();
        },
      });
      b.y = -150 + i * 170;
      const desc = this.text(22, C.dim);
      desc.text = r.text;
      desc.anchor.set(0.5);
      desc.y = b.y + 78;
      box.addChild(b, desc);
      this.buttons.push(b);
    });
    this.overlay.addChild(dim, box);
    this.layoutOverlay();
    void popIn(this.tweens, box, 0.35);
    void view;
  }

  private showEnd(): void {
    const run = this.run;
    const box = new Container();
    box.label = 'panel';
    const dim = new Graphics();
    dim.label = 'dim';
    const won = run.phase === 'won';
    const title = this.text(56, won ? C.accent : '#d05a4a');
    title.text = won ? 'Świt. Brama ocalała.' : 'Brama padła.';
    title.anchor.set(0.5);
    title.y = -300;
    const fallen = run.party.filter((d) => !d.alive);
    const scarred = run.party.filter((d) => d.alive && d.wounds > 0);
    const body = this.text(28, C.text);
    body.style.align = 'center';
    body.text = [
      won ? `Wszystkie ${WAVES.length} fal odparte.` : `Przetrwaliście ${run.wave} z ${WAVES.length} fal.`,
      '',
      fallen.length ? `Polegli: ${fallen.map((d) => `${d.name} (${CLASSES[d.cls].name})`).join(', ')}` : 'Nikt nie poległ.',
      scarred.length ? `Z bliznami: ${scarred.map((d) => d.name).join(', ')}` : '',
    ].join('\n');
    body.style.wordWrap = true;
    body.style.wordWrapWidth = 620;
    body.anchor.set(0.5);
    body.y = -120;
    const again = new Button({ label: 'Nowa noc', color: '#b5562c', width: 360, resolution: this.game.pixelRatio, onTap: () => this.restart() });
    again.y = 120;
    this.buttons.push(again);
    box.addChild(title, body, again);
    this.overlay.addChild(dim, box);
    this.layoutOverlay();
    void popIn(this.tweens, box, 0.4);
    if (won) haptics.success();
  }

  private closeOverlay(): void {
    this.overlay.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.buttons = [this.startBtn, this.speedBtn];
  }

  private layoutOverlay(): void {
    const view = this.game.view;
    const dim = this.overlay.getChildByLabel('dim') as Graphics | null;
    dim?.clear().rect(0, 0, view.width, view.height).fill({ color: 0x08060c, alpha: 0.8 });
    this.overlay.getChildByLabel('panel')?.position.set(view.width / 2, view.height / 2);
  }

  // --- sterowanie ---

  private screenToMap(x: number, y: number): Point {
    return { x: (x - this.mapLayer.x) / this.mapLayer.scale.x, y: (y - this.mapLayer.y) / this.mapLayer.scale.y };
  }

  private slotScreen(slot: number): Point {
    const s = this.run.map.slots[slot];
    if (!s) return { x: 0, y: 0 };
    return { x: this.mapLayer.x + s.x * this.mapLayer.scale.x, y: this.mapLayer.y + s.y * this.mapLayer.scale.y };
  }

  private tokenAt(x: number, y: number): Defender | undefined {
    let best: { d: Defender; dist: number } | null = null;
    for (const d of this.run.party) {
      if (!d.alive) continue;
      const t = this.tokens.get(d.id);
      if (!t) continue;
      const dist = Math.hypot(t.view.x - x, t.view.y - y);
      if (dist < 50 && (!best || dist < best.dist)) best = { d, dist };
    }
    return best?.d;
  }

  private tap(x: number, y: number): void {
    const d = this.tokenAt(x, y);
    this.selected = d ? d.id : null;
    this.refreshUi();
  }

  private dragStart(x: number, y: number): void {
    if (this.run.phase !== 'plan') return;
    const d = this.tokenAt(x, y);
    if (!d) return;
    this.dragging = { id: d.id, x, y };
    this.selected = d.id;
    const t = this.tokens.get(d.id);
    if (t) {
      this.tokenLayer.addChild(t.view); // na wierzch
      this.tweens.to(t.view.scale, { x: 1.2, y: 1.2 }, { duration: 0.1 });
    }
    haptics.tap();
    this.refreshUi();
  }

  private dragMove(x: number, y: number): void {
    if (!this.dragging) return;
    this.dragging.x = x;
    this.dragging.y = y;
    const t = this.tokens.get(this.dragging.id);
    t?.view.position.set(x, y);
  }

  private dragEnd(x: number, y: number): void {
    const drag = this.dragging;
    this.dragging = null;
    if (!drag) return;
    const t = this.tokens.get(drag.id);
    if (t) this.tweens.to(t.view.scale, { x: 1, y: 1 }, { duration: 0.12 });
    const m = this.screenToMap(x, y);
    const slot = this.run.map.slots
      .map((s) => ({ s, dist: Math.hypot(s.x - m.x, s.y - m.y) }))
      .sort((a, b) => a.dist - b.dist)[0];
    if (slot && slot.dist < 70) this.run.place(drag.id, slot.s.id);
    else if (y > this.benchY - 60) this.run.place(drag.id, null);
    haptics.tap();
    this.layoutTokens(false);
    this.refreshUi();
  }

  // --- widok: teren, żetony, wrogowie, efekty ---

  private drawGround(): void {
    const g = this.ground.clear();
    const run = this.run;
    g.rect(0, 0, 720, MAP_H).fill({ color: C.bg });
    const pts = run.map.path.points.flatMap((p) => [p.x, p.y]);
    g.poly(pts, false).stroke({ color: C.pathEdge, width: 74, join: 'round', cap: 'round' });
    g.poly(pts, false).stroke({ color: C.path, width: 58, join: 'round', cap: 'round' });
    const gate = run.map.gate;
    g.roundRect(gate.x - 90, gate.y - 20, 180, 40, 6).fill({ color: C.gate }).stroke({ color: 0x2a1a10, width: 4 });
    for (const s of run.map.slots) {
      if (run.canBlock(s.id)) g.circle(s.x, s.y, 50).stroke({ color: C.blockRing, width: 3, alpha: 0.7 });
      g.circle(s.x, s.y, 42).fill({ color: C.slot }).stroke({ color: C.slotEdge, width: 3 });
    }
  }

  private drawBonds(): void {
    const g = this.bondsG.clear();
    const run = this.run;
    for (const d of run.party) {
      if (!d.alive || d.slot === null) continue;
      for (const n of run.neighborsOf(d)) {
        if (n.id < d.id) continue;
        const a = run.map.slots[d.slot];
        const b = n.slot === null ? undefined : run.map.slots[n.slot];
        if (!a || !b) continue;
        const level = bondLevel(run.bondPoints(d, n));
        const color = C.bond[level] ?? C.bond[0];
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color, width: 4 + level * 3, alpha: level ? 0.9 : 0.45 });
      }
    }
  }

  private syncTokens(): void {
    for (const d of this.run.party) {
      if (!d.alive) {
        const t = this.tokens.get(d.id);
        if (t) {
          this.tweens.to(t.view, { alpha: 0 }, { duration: 0.4 });
          this.timers.after(0.45, () => t.view.destroy({ children: true }));
          this.tokens.delete(d.id);
        }
        continue;
      }
      if (this.tokens.has(d.id)) continue;
      const view = new Container();
      const body = new Graphics();
      const hp = new Graphics();
      const label = this.text(30, '#ffffff');
      label.anchor.set(0.5);
      label.text = CLASSES[d.cls].glyph;
      const badge = this.text(18, '#ffe7a0');
      badge.anchor.set(0.5);
      badge.position.set(26, -26);
      const marks = this.text(16, '#ff8a7a');
      marks.anchor.set(0.5);
      marks.position.set(0, 52);
      view.addChild(body, label, badge, hp, marks);
      this.tokenLayer.addChild(view);
      this.tokens.set(d.id, { id: d.id, view, body, hp, label, badge, marks });
    }
    this.layoutTokens(true);
  }

  private layoutTokens(instant: boolean): void {
    const bench = this.run.party.filter((d) => d.alive && d.slot === null);
    const view = this.game.view;
    const gap = Math.min(90, (view.width - 60) / Math.max(1, bench.length));
    for (const d of this.run.party) {
      const t = this.tokens.get(d.id);
      if (!t || (this.dragging && this.dragging.id === d.id)) continue;
      let p: Point;
      if (d.slot !== null) p = this.slotScreen(d.slot);
      else {
        const i = bench.indexOf(d);
        p = { x: 60 + i * gap, y: this.benchY };
      }
      if (instant) t.view.position.set(p.x, p.y);
      else this.tweens.to(t.view, { x: p.x, y: p.y }, { duration: 0.2, ease: 'backOut' });
    }
  }

  private updateTokens(): void {
    const s = this.mapLayer.scale.x;
    for (const d of this.run.party) {
      const t = this.tokens.get(d.id);
      if (!t) continue;
      const r = 34 * (d.slot !== null ? Math.max(0.8, s) : 1);
      const color = C.cls[d.cls];
      t.body.clear().circle(0, 0, r).fill({ color: d.down ? 0x444048 : color }).stroke({ color: d.id === this.selected ? 0xffffff : 0x0c0a10, width: d.id === this.selected ? 5 : 3 });
      t.label.alpha = d.down ? 0.4 : 1;
      t.badge.text = `${d.level}`;
      const ratio = Math.max(0, d.hp / d.maxHp);
      t.hp.clear().rect(-30, r + 4, 60, 7).fill({ color: 0x1a0a0a }).rect(-30, r + 4, 60 * ratio, 7).fill({ color: ratio < 0.35 ? 0xd04a3a : 0x7ac06a });
      const mood = d.mood === 'grief' ? ' żal' : d.mood === 'rage' ? ' szał' : '';
      t.marks.text = `${'✚'.repeat(d.wounds)}${mood}${d.down ? ' ranny' : ''}`;
    }
  }

  private syncEnemies(): void {
    const seen = new Set<number>();
    for (const e of this.run.enemies) {
      seen.add(e.id);
      let v = this.enemyViews.get(e.id);
      if (!v) {
        const def = ENEMIES[e.kind];
        const view = new Container();
        const body = new Graphics().circle(0, 0, def.radius).fill({ color: C.enemy[e.kind] }).stroke({ color: 0x050405, width: 3 });
        if (def.ranged) body.circle(0, 0, def.radius * 0.4).fill({ color: 0xe0d0ff, alpha: 0.7 });
        const hp = new Graphics();
        view.addChild(body, hp);
        this.enemyLayer.addChild(view);
        v = { view, hp };
        this.enemyViews.set(e.id, v);
      }
      v.view.position.set(e.x, e.y);
      const r = ENEMIES[e.kind].radius;
      v.hp.clear().rect(-r, -r - 10, r * 2, 5).fill({ color: 0x1a0a0a }).rect(-r, -r - 10, r * 2 * Math.max(0, e.hp / e.maxHp), 5).fill({ color: 0xd04a3a });
    }
    for (const [id, v] of this.enemyViews) {
      if (!seen.has(id)) {
        v.view.destroy({ children: true });
        this.enemyViews.delete(id);
      }
    }
  }

  private shot(from: Point, to: Point, kind: Events['shots'][number]['kind']): void {
    const g = new Graphics();
    switch (kind) {
      case 'arrow':
        g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ color: 0xe8e0c0, width: 3, alpha: 0.8 });
        break;
      case 'bolt':
        g.circle(to.x, to.y, CLASSES.mage.splash).fill({ color: 0xa070ff, alpha: 0.35 }).stroke({ color: 0xc8a8ff, width: 3 });
        break;
      case 'slash':
        g.arc(to.x, to.y, 26, -1, 1).stroke({ color: 0xffffff, width: 4 });
        break;
      case 'heal':
        g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ color: 0x8aff9a, width: 3, alpha: 0.6 });
        g.rect(to.x - 3, to.y - 14, 6, 28).rect(to.x - 14, to.y - 3, 28, 6).fill({ color: 0x8aff9a });
        break;
      case 'curse':
        g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ color: 0xb050ff, width: 3, alpha: 0.8 });
        break;
    }
    this.fxLayer.addChild(g);
    this.tweens.to(g, { alpha: 0 }, { duration: 0.25 });
    this.timers.after(0.26, () => g.destroy());
  }

  private burst(at: Point, color: number): void {
    const g = new Graphics().circle(0, 0, 22).fill({ color, alpha: 0.6 });
    g.position.set(at.x, at.y);
    this.fxLayer.addChild(g);
    this.tweens.to(g.scale, { x: 2, y: 2 }, { duration: 0.3, ease: 'quadOut' });
    this.tweens.to(g, { alpha: 0 }, { duration: 0.3 });
    this.timers.after(0.31, () => g.destroy());
  }

  private say(message: string): void {
    this.toast.text = message;
    this.toast.alpha = 1;
    this.tweens.killOf(this.toast);
    this.tweens.to(this.toast, { alpha: 0 }, { duration: 0.6, delay: 1.6 });
  }

  private refreshUi(): void {
    const run = this.run;
    this.waveText.text = `Fala ${Math.min(run.wave + 1, WAVES.length)}/${WAVES.length}`;
    this.gateText.text = `Brama ${run.gate}`;
    const planning = run.phase === 'plan';
    this.startBtn.visible = planning;
    this.speedBtn.visible = run.phase === 'wave';
    const d = this.selected !== null ? run.defender(this.selected) : undefined;
    if (d) {
      const def = CLASSES[d.cls];
      const bonds = run.party
        .filter((o) => o !== d && o.alive && run.bondPoints(d, o) > 0)
        .map((o) => {
          const level = bondLevel(run.bondPoints(d, o));
          return `${o.name}: ${level ? BOND.levels[level - 1]?.name : `${run.bondPoints(d, o)}/${BOND.levels[0].at}`}`;
        });
      this.info.text = [
        `${d.name} · ${def.name} · poz. ${d.level} · ${TRAITS[d.trait].name}`,
        `Życie ${Math.ceil(d.hp)}/${d.maxHp}${d.wounds ? ` · rany ${d.wounds}` : ''}${d.mood === 'grief' ? ` · żałoba po ${d.mourns}` : d.mood === 'rage' ? ` · szał po ${d.mourns}` : ''}`,
        `Obrażenia ×${run.damageMult(d).toFixed(2)} · zabici ${d.kills}`,
        bonds.length ? `Więzi: ${bonds.join(', ')}` : 'Więzi: brak (stawiaj obok siebie)',
      ].join('\n');
    } else if (planning) {
      this.info.text = 'Przeciągnij obrońców na stanowiska. Sąsiedzi budują więzi.\nRycerz zatrzymuje wrogów tylko na stanowisku z obwódką.\nStuknij obrońcę, by zobaczyć jego kartę.';
    } else {
      this.info.text = '';
    }
  }

  private text(size: number, color: string): Text {
    return new Text({
      text: '',
      style: { fontFamily: FONT, fontSize: size, fontWeight: '700', fill: color, stroke: { color: '#08060c', width: Math.max(3, size * 0.1) } },
      resolution: this.game.pixelRatio,
    });
  }
}
