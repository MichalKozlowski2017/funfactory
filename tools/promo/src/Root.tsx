import { Composition, Folder, type CalculateMetadataFunction } from 'remotion';
import { GamePromo } from './GamePromo';
import { FPS, promoFrames, type PromoProps } from './types';

/** Length follows the scenes in the props (edit shots in Studio, the clip adjusts). */
const calculateMetadata: CalculateMetadataFunction<PromoProps> = ({ props }) => ({ durationInFrames: promoFrames(props) });

/**
 * One composition per game and language. Media live in release/<slug>/promo/src (linked into public/<slug>/):
 * gameplay from `pnpm shot games/<slug> --gpu --size 360x640@3 --query bot --steps "rec:start,wait:75000,rec:save:x"`,
 * art, intro animation and music from Legion (skill comfyui: flux2-ref, wan22-i2v, ace15).
 */
export const RemotionRoot = () => {
  return (
    <Folder name="Glut">
      <Composition
        id="GlutPromoPL"
        component={GamePromo}
        durationInFrames={630}
        fps={FPS}
        width={1080}
        height={1920}
        calculateMetadata={calculateMetadata}
        defaultProps={{
          intro: { src: 'glut/intro-701.mp4', durationSec: 2.5, playbackRate: 1.5, caption: 'Uciekaj przed syropem!' },
          shots: [
            { src: 'glut/bot-pl-7.mp4', fromSec: 4.0, durationSec: 4.6, caption: 'Strzelaj jak z procy!' },
            { src: 'glut/bot-pl-7.mp4', fromSec: 31.8, durationSec: 4.0, caption: 'Co 100 m nowy świat' },
            { src: 'glut/bot-pl-7.mp4', fromSec: 45.6, durationSec: 3.3, caption: 'Skacz w rytm muzyki' },
            { src: 'glut/bot-pl-7.mp4', fromSec: 55.0, durationSec: 2.9, caption: 'Pobijesz 172 m?', captionTop: 1440 },
          ],
          end: { image: 'glut/end-602.png', logo: 'Glut', tagline: 'Za darmo w Google Play', cta: 'Pobierz teraz', durationSec: 3.8 },
          music: { src: 'glut/music-813.flac', volume: 0.9 },
          gameVolume: 0,
          captionTop: 1330,
          colors: { ink: '#2a1238', text: '#ffffff', highlight: '#ffd23f', logo: '#ff6fb5', cta: '#ff5fa2' },
          transitionFrames: 6,
        }}
      />
    </Folder>
  );
};
