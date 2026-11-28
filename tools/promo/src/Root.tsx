import { Composition, Folder, type CalculateMetadataFunction } from 'remotion';
import { GamePromo } from './GamePromo';
import { ShowcasePromo, showcaseFrames, type ShowcaseProps } from './ShowcasePromo';
import { TabletPromo, tabletPromoFrames, type TabletPromoProps } from './TabletPromo';
import { FPS, promoFrames, type PromoProps } from './types';

/** Length follows the scenes in the props (edit shots in Studio, the clip adjusts). */
const calculateMetadata: CalculateMetadataFunction<PromoProps> = ({ props }) => ({ durationInFrames: promoFrames(props) });
const tabletMetadata: CalculateMetadataFunction<TabletPromoProps> = ({ props }) => ({ durationInFrames: tabletPromoFrames(props, FPS) });
const showcaseMetadata: CalculateMetadataFunction<ShowcaseProps> = ({ props }) => ({ durationInFrames: showcaseFrames(props, FPS) });

/**
 * One composition per game and language. Media live in release/<slug>/promo/src (linked into public/<slug>/):
 * gameplay from `pnpm shot games/<slug> --gpu --size 360x640@3 --query "bot&chase=4" --steps "rec:start,wait:50000,rec:save:x"`
 * (Glut: `chase` keeps the syrup a few metres under the slime, always in frame),
 * art, intro animation and music from Legion (skill comfyui: flux2-ref, wan22-i2v, ace15).
 * Bystrzakowo (landscape, tablet layout): `?promo=letters:3,shadows:2,...` plays like a child (games/bystrzakowo/src/promo.ts).
 */
export const RemotionRoot = () => {
  return (
    <>
    <Folder name="Glut">
      <Composition
        id="GlutPromoPL"
        component={GamePromo}
        durationInFrames={450}
        fps={FPS}
        width={1080}
        height={1920}
        calculateMetadata={calculateMetadata}
        defaultProps={{
          shots: [
            { src: 'glut/chase2-45a.mp4', fromSec: 19.4, durationSec: 3.2, caption: 'Syrop cię goni!', danger: true },
            { src: 'glut/chase2-45a.mp4', fromSec: 22.6, durationSec: 2.6, caption: 'W ostatniej chwili!', cut: 'hard', danger: true },
            { src: 'glut/chase2-45a.mp4', fromSec: 28.6, durationSec: 2.8, caption: 'Co 100 m nowy świat' },
            { src: 'glut/chase2-45a.mp4', fromSec: 34.6, durationSec: 4.0, caption: 'Ile wytrzymasz?', captionTop: 1440, danger: true },
          ],
          end: { image: 'glut/end-602.png', logo: 'Glut', tagline: 'Za darmo w Google Play', cta: 'Pobierz teraz', durationSec: 2.8 },
          music: { src: 'glut/music-813.flac', volume: 0.9 },
          gameVolume: 0,
          captionTop: 1330,
          colors: { ink: '#2a1238', text: '#ffffff', highlight: '#ffd23f', logo: '#ff6fb5', cta: '#ff5fa2', danger: '#ff2d6f' },
          transitionFrames: 5,
        }}
      />
      <Composition
        id="GlutPromoEN"
        component={GamePromo}
        durationInFrames={450}
        fps={FPS}
        width={1080}
        height={1920}
        calculateMetadata={calculateMetadata}
        defaultProps={{
          shots: [
            { src: 'glut/chase2-45-en.mp4', fromSec: 19.4, durationSec: 3.2, caption: 'The syrup is coming!', danger: true },
            { src: 'glut/chase2-45-en.mp4', fromSec: 22.6, durationSec: 2.6, caption: 'Just in time!', cut: 'hard', danger: true },
            { src: 'glut/chase2-45-en.mp4', fromSec: 28.6, durationSec: 2.8, caption: 'Reach new worlds!' },
            { src: 'glut/chase2-45-en.mp4', fromSec: 34.6, durationSec: 4.0, caption: 'How far can you go?', captionTop: 1440, danger: true },
          ],
          end: { image: 'glut/end-602.png', logo: 'Glut', tagline: 'Free on Google Play', cta: 'Get it now', durationSec: 2.8 },
          music: { src: 'glut/music-813.flac', volume: 0.9 },
          gameVolume: 0,
          captionTop: 1330,
          colors: { ink: '#2a1238', text: '#ffffff', highlight: '#ffd23f', logo: '#ff6fb5', cta: '#ff5fa2', danger: '#ff2d6f' },
          transitionFrames: 5,
        }}
      />
    </Folder>
    <Folder name="Bystrzakowo">
      <Composition
        id="BystrzakowoPromoPL"
        component={TabletPromo}
        durationInFrames={450}
        fps={FPS}
        width={1080}
        height={1920}
        calculateMetadata={tabletMetadata}
        defaultProps={{
          background: 'bystrzakowo/bg-901.png',
          headline: 'Mądra zabawa dla przedszkolaka',
          shots: [
            { src: 'bystrzakowo/promo-pl.mp4', fromSec: 6.9, durationSec: 3.0, caption: 'Pierwsze litery' },
            { src: 'bystrzakowo/promo-pl.mp4', fromSec: 15.9, durationSec: 2.6, caption: 'Zagadki z lektorem' },
            { src: 'bystrzakowo/promo-pl.mp4', fromSec: 39.8, durationSec: 2.8, caption: 'Kolorowanki' },
            { src: 'bystrzakowo/promo-pl.mp4', fromSec: 53.2, durationSec: 2.8, caption: 'Układanki' },
            { src: 'bystrzakowo/promo-pl.mp4', fromSec: 60.0, durationSec: 2.0, caption: 'Postępy dla rodzica' },
          ],
          characters: [
            { src: 'bystrzakowo/lusia-point.png', x: -90, y: 1130, width: 700, delaySec: 0.3 },
            { src: 'bystrzakowo/bazyl-point.png', x: 610, y: 1300, width: 500, flip: true, delaySec: 0.6 },
          ],
          end: {
            image: 'bystrzakowo/endbg-912.png',
            logo: 'Bystrzakowo',
            logoFont: 'round',
            tagline: 'Bez reklam · offline',
            cta: 'Wkrótce w sklepach',
            durationSec: 2.8,
            characters: [
              { src: 'bystrzakowo/lusia-wow.png', x: -80, y: 1130, width: 680, delaySec: 0.4 },
              { src: 'bystrzakowo/bazyl-thumbs.png', x: 600, y: 1320, width: 480, delaySec: 0.6 },
            ],
          },
          music: { src: 'bystrzakowo/music.m4a', volume: 0.35 },
          gameVolume: 1,
          tabletTop: 470,
          captionTop: 1115,
          colors: { ink: '#ffffff', text: '#7a3fb0', headline: '#ff7a1c', logo: '#ff7a1c', cta: '#4fb34a', bezel: '#2b2f3a' },
          fadeFrames: 6,
        }}
      />
      <Composition
        id="BystrzakowoFilmPL"
        component={ShowcasePromo}
        durationInFrames={1800}
        fps={FPS}
        width={1920}
        height={1080}
        calculateMetadata={showcaseMetadata}
        defaultProps={{
          recording: 'bystrzakowo/film-pl.mp4',
          backdrop: 'bystrzakowo/keyart-village-31.jpg',
          intro: {
            image: 'bystrzakowo/keyart-village-31.jpg',
            logo: 'Bystrzakowo',
            subtitle: 'Mądra zabawa dla dzieci 3–6 lat',
            durationSec: 3.4,
            characters: [
              { src: 'bystrzakowo/lusia-teacher.png', x: 40, y: 450, width: 600, delaySec: 0.4 },
              { src: 'bystrzakowo/bazyl-point.png', x: 560, y: 500, width: 560, delaySec: 0.6 },
            ],
          },
          chapters: [
            { name: '4 krainy, 21 zabaw', color: '#ff7a1c', shots: [{ fromSec: 0.0, durationSec: 3.6, caption: 'Wybierz krainę i graj' }] },
            {
              name: 'Polana Zagadek',
              color: '#4fb34a',
              shots: [
                { fromSec: 8.4, durationSec: 2.6, caption: 'Czyj to cień?' },
                { fromSec: 23.0, durationSec: 2.6, caption: 'Mamy i dzieci' },
                { fromSec: 30.3, durationSec: 2.6, caption: 'Liczenie' },
                { fromSec: 41.4, durationSec: 3.2, caption: 'Memory' },
              ],
            },
            {
              name: 'Warsztat Bazyla',
              color: '#e0873a',
              shots: [
                { fromSec: 55.0, durationSec: 2.6, caption: 'Segregowanie' },
                { fromSec: 67.6, durationSec: 3.2, caption: 'Układanki' },
                { fromSec: 82.4, durationSec: 2.6, caption: 'Co dalej?' },
                { fromSec: 95.4, durationSec: 2.6, caption: 'Historyjki obrazkowe' },
              ],
            },
            {
              name: 'Ścieżka Lusi',
              color: '#8e5bd6',
              shots: [
                { fromSec: 105.6, durationSec: 3.6, caption: 'Litery palcem' },
                { fromSec: 118.6, durationSec: 2.8, caption: 'Cyfry' },
                { fromSec: 132.4, durationSec: 2.6, caption: 'Łączenie kropek' },
                { fromSec: 141.6, durationSec: 2.6, caption: 'Labirynty' },
              ],
            },
            {
              name: 'Pracownia Malucha',
              color: '#ff5fa2',
              shots: [
                { fromSec: 152.6, durationSec: 3.4, caption: 'Kolorowanki' },
                { fromSec: 159.1, durationSec: 2.1, caption: 'Naklejka w nagrodę!' },
                { fromSec: 162.8, durationSec: 2.6, caption: 'Naklejanki' },
                { fromSec: 169.2, durationSec: 2.8, caption: 'Melodie' },
              ],
            },
            {
              name: 'Dla rodzica',
              color: '#3d8fd6',
              shots: [
                { fromSec: 174.2, durationSec: 3.0, caption: 'Postępy dziecka' },
                { fromSec: 179.2, durationSec: 2.2, caption: 'Album prac' },
                { fromSec: 182.2, durationSec: 2.4, caption: 'Pocztówka tygodnia' },
              ],
            },
          ],
          features: {
            image: 'bystrzakowo/keyart-book-21.jpg',
            title: 'Spokojna głowa rodzica',
            durationSec: 4.6,
            items: ['Bez reklam', 'Działa bez internetu', 'Lektor czyta polecenia', 'Trudność rośnie z dzieckiem', '4 języki'],
            characters: [{ src: 'bystrzakowo/bazyl-thumbs.png', x: 1240, y: 520, width: 560, delaySec: 0.5 }],
          },
          end: {
            image: 'bystrzakowo/keyart-blocks-11.jpg',
            logo: 'Bystrzakowo',
            subtitle: 'Zagadki malucha',
            cta: 'Wkrótce w sklepach',
            durationSec: 3.8,
            characters: [
              { src: 'bystrzakowo/lusia-wow.png', x: 160, y: 540, width: 520, delaySec: 0.4 },
              { src: 'bystrzakowo/bazyl-wink.png', x: 560, y: 560, width: 500, delaySec: 0.6 },
            ],
          },
          music: { src: 'bystrzakowo/film-music-922.flac', volume: 0.85 },
          colors: { ink: '#ff7a1c', logo: '#ff7a1c', cta: '#4fb34a' },
          fadeFrames: 7,
        }}
      />
    </Folder>
    </>
  );
};
