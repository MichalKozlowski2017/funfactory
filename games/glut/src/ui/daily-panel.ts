import { Container, Graphics, Text } from 'pixi.js';
import { hexToNumber, palettes } from '@funfactory/art';
import { Button, type View } from '@funfactory/kit2d';
import { formatTime } from '../sim/achievements.ts';
import { dailyStreak, dayKey, lastDays, secondsToNextDay, weekday, type DailyRecord } from '../sim/daily.ts';
import { formatDay, t } from '../i18n.ts';

const pal = palettes.candy;
const FONT = 'system-ui, -apple-system, sans-serif';
const H = 1120;

export interface DailyPanelOptions {
  pixelRatio: number;
  daily: readonly DailyRecord[];
  /** Medal (7 dni z rzędu) już zdobyty. */
  medal: boolean;
  onPlay: () => void;
  onRanking: () => void;
  onClose: () => void;
}

/**
 * Wyzwanie dnia: data i odliczanie do następnego, dzisiejszy wynik, seria dni z postępem do medalu,
 * wykres ostatnich 7 dni, przyciski: graj, ranking dnia, zamknij.
 */
export class DailyPanel extends Container {
  private readonly dim = new Graphics();
  private readonly panel = new Graphics();
  private readonly body = new Container();
  private readonly countdown: Text;
  private readonly buttons: Button[];
  private secondsShown = -1;

  constructor(o: DailyPanelOptions) {
    super();
    const text = (size: number, fill: string, weight: '700' | '800' = '800') =>
      new Text({
        text: '',
        style: { fontFamily: FONT, fontSize: size, fontWeight: weight, fill, stroke: { color: pal.ink, width: Math.max(3, size * 0.1), join: 'round' } },
        resolution: o.pixelRatio,
        anchor: 0.5,
      });
    this.dim.eventMode = 'static';
    const today = dayKey(new Date());
    const rec = o.daily.find((r) => r.day === today);
    const streak = dailyStreak([...o.daily], today);

    const title = text(54, pal.surface);
    title.text = t('daily');
    title.y = 70;
    const date = text(32, '#ffd9a0');
    date.text = formatDay(today);
    date.y = 126;
    this.countdown = text(26, '#a99cc0', '700');
    this.countdown.y = 168;

    // Dziś: wynik i próby.
    const card = new Graphics().roundRect(-290, 210, 580, 150, 28).fill({ color: 0x3a2c55 });
    const todayText = text(40, rec ? '#ffffff' : '#d8cdea');
    todayText.text = rec ? t('todayBest', { m: rec.best }) : t('todayNone');
    todayText.y = 262;
    const tries = text(26, '#a99cc0', '700');
    tries.text = rec ? t('tries', { n: rec.tries }) : '';
    tries.y = 314;

    // Seria i medal.
    const streakText = text(30, streak > 0 ? '#ffb84d' : '#a99cc0');
    streakText.text = streak > 0 ? t('streakNow', { n: streak }) : t('streakNone');
    streakText.y = 400;
    const medal = text(26, o.medal ? '#8ee3a1' : '#d8cdea', '700');
    medal.text = o.medal ? t('medalGot') : t('medalGoal', { n: Math.min(7, streak) });
    medal.y = 444;
    const pips = new Graphics();
    if (!o.medal) {
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * 44;
        pips.circle(x, 486, 14).fill({ color: i < streak ? 0xffb84d : 0x241a36 }).stroke({ color: hexToNumber(pal.ink), width: 3 });
      }
    }

    // Wykres ostatnich 7 dni.
    const chartTitle = text(28, pal.surface);
    chartTitle.text = t('last7');
    chartTitle.y = 560;
    const chart = new Graphics();
    const labels = new Container();
    const days = lastDays(today, 7);
    const best = Math.max(1, ...days.map((d) => o.daily.find((r) => r.day === d)?.best ?? 0));
    const names = t('weekdays').split(',');
    const base = 820;
    const maxH = 190;
    days.forEach((d, i) => {
      const r = o.daily.find((x) => x.day === d);
      const x = (i - 3) * 78;
      const isToday = d === today;
      if (r) {
        const h = Math.max(14, (r.best / best) * maxH);
        chart.roundRect(x - 26, base - h, 52, h, 12).fill({ color: isToday ? 0xffb84d : 0x9b8cff }).stroke({ color: hexToNumber(pal.ink), width: 3 });
        const value = text(22, '#ffffff', '700');
        value.text = `${r.best}`;
        value.position.set(x, base - h - 20);
        labels.addChild(value);
      } else {
        chart.circle(x, base - 8, 7).fill({ color: 0x4a3d66 });
      }
      const day = text(24, isToday ? '#ffb84d' : '#a99cc0', '700');
      day.text = names[weekday(d)] ?? '';
      day.position.set(x, base + 30);
      labels.addChild(day);
    });
    const ever = Math.max(0, ...o.daily.map((r) => r.best));
    const everText = text(24, '#a99cc0', '700');
    everText.text = ever > 0 ? t('bestDailyEver', { m: ever }) : '';
    everText.y = 890;

    const play = new Button({ label: t('play'), color: '#ffb84d', width: 300, height: 100, fontSize: 42, resolution: o.pixelRatio, onTap: o.onPlay });
    play.position.set(-150 - 8, H - 110);
    const ranking = new Button({ label: t('dailyRanking'), color: '#5f86e8', width: 280, height: 100, fontSize: 32, resolution: o.pixelRatio, onTap: o.onRanking });
    ranking.position.set(140 + 8, H - 110);
    const close = new Button({ label: '✕', color: '#6e6488', width: 88, height: 88, fontSize: 40, radius: 44, resolution: o.pixelRatio, onTap: o.onClose });
    close.position.set(250, 64);
    this.buttons = [play, ranking, close];

    this.body.addChild(card, title, date, this.countdown, todayText, tries, streakText, medal, pips, chartTitle, chart, labels, everText, play, ranking, close);
    this.addChild(this.dim, this.panel, this.body);
    this.tick(0);
  }

  layout(view: View, bottom = 0): void {
    this.dim.clear().rect(0, 0, view.width, view.height).fill({ color: 0x140c22, alpha: 0.75 });
    const free = view.height - bottom - view.safe.top;
    const scale = Math.min(1, (free - 20) / H);
    const top = view.safe.top + Math.max(10, (free - H * scale) / 2);
    this.panel.clear().roundRect(30, top, view.width - 60, H * scale, 40).fill({ color: 0x2b1e3f }).stroke({ color: hexToNumber(pal.ink), width: 6 });
    this.body.position.set(view.width / 2, top);
    this.body.scale.set(scale);
  }

  tick(dt: number): void {
    for (const b of this.buttons) b.tick(dt);
    const left = secondsToNextDay(new Date());
    if (left !== this.secondsShown) {
      this.secondsShown = left;
      const h = Math.floor(left / 3600);
      this.countdown.text = t('nextIn', { t: `${h}:${formatTime(left % 3600).padStart(5, '0')}` });
    }
  }
}
