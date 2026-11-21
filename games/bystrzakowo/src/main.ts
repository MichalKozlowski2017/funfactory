import { Game } from '@funfactory/kit2d';
import { registerVoice } from './assets.ts';
import { MeadowScene } from './scenes/meadow.ts';
import { loadState } from './state.ts';
import { loadFont } from './ui.ts';

// Gra pozioma (tablety): stała wysokość 720 jednostek, szerokość zależy od ekranu.
const game = await new Game({ background: '#fff6e8', designHeight: 720 }).start();
await Promise.all([loadFont(), loadState()]);
registerVoice(game);
await game.scenes.go(new MeadowScene(), { fade: 0 });

// TYMCZASOWO: diagnostyka dźwięku na urządzeniu.
window.addEventListener(
  'pointerdown',
  () =>
    setTimeout(async () => {
      const s = game.sound;
      const out: Record<string, unknown> = { state: s.state, witaj: s.loaded('lusia-witaj'), muzyka: s.loaded('muzyka'), session: (navigator as unknown as { audioSession?: { type: string } }).audioSession?.type };
      try {
        const r = await fetch('./audio/lusia/witaj.m4a');
        const buf = await r.arrayBuffer();
        out.fetch = `${r.status} ${buf.byteLength}`;
        const ctx = new AudioContext();
        try {
          const b = await ctx.decodeAudioData(buf);
          out.decode = `ok ${b.duration.toFixed(2)}s`;
        } catch (e) {
          out.decode = `ERR ${String(e)}`;
        }
      } catch (e) {
        out.fetch = `ERR ${String(e)}`;
      }
      console.log('FFDIAG ' + JSON.stringify(out));
    }, 5000),
  { once: true },
);
