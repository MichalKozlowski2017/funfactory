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
            durationSec: 3.0,
            characters: [
              { src: 'bystrzakowo/lusia-teacher.png', x: 40, y: 450, width: 600, delaySec: 0.4 },
              { src: 'bystrzakowo/bazyl-point.png', x: 560, y: 500, width: 560, delaySec: 0.6 },
            ],
          },
          chapters: [
            {
              name: '4 krainy, 21 zabaw',
              color: '#ff7a1c',
              shots: [
                { src: 'bystrzakowo/realms-pl.mp4', fromSec: 1.5, durationSec: 2.5, caption: 'Polana Zagadek: 8 zabaw' },
                { src: 'bystrzakowo/realms-pl.mp4', fromSec: 4.5, durationSec: 2.5, caption: 'Warsztat Bazyla: 6 zabaw' },
                { src: 'bystrzakowo/realms-pl.mp4', fromSec: 7.6, durationSec: 2.5, caption: 'Ścieżka Lusi: 4 zabawy' },
                { src: 'bystrzakowo/realms-pl.mp4', fromSec: 10.6, durationSec: 2.6, caption: 'Pracownia Malucha: 3 zabawy' },
              ],
            },
            {
              name: 'Polana Zagadek',
              color: '#4fb34a',
              shots: [
                { fromSec: 8.4, durationSec: 2.6, caption: 'Czyj to cień?' },
                { fromSec: 23.0, durationSec: 2.4, caption: 'Mamy i dzieci' },
                { fromSec: 30.3, durationSec: 2.4, caption: 'Liczenie' },
                { fromSec: 41.4, durationSec: 2.6, caption: 'Memory' },
              ],
            },
            {
              name: 'Warsztat Bazyla',
              color: '#e0873a',
              shots: [
                { fromSec: 55.0, durationSec: 2.4, caption: 'Segregowanie' },
                { fromSec: 68.2, durationSec: 2.6, caption: 'Układanki' },
                { fromSec: 82.4, durationSec: 2.4, caption: 'Co dalej?' },
                { fromSec: 95.4, durationSec: 2.4, caption: 'Historyjki obrazkowe' },
              ],
            },
            {
              name: 'Ścieżka Lusi',
              color: '#8e5bd6',
              shots: [
                { fromSec: 106.0, durationSec: 3.0, caption: 'Litery palcem' },
                { fromSec: 118.8, durationSec: 2.4, caption: 'Cyfry' },
                { fromSec: 132.4, durationSec: 2.4, caption: 'Łączenie kropek' },
                { fromSec: 141.6, durationSec: 2.4, caption: 'Labirynty' },
              ],
            },
            {
              name: 'Pracownia Malucha',
              color: '#ff5fa2',
              shots: [
                { fromSec: 153.0, durationSec: 2.8, caption: 'Kolorowanki' },
                { fromSec: 159.1, durationSec: 2.0, caption: 'Naklejka w nagrodę!' },
                { fromSec: 162.8, durationSec: 2.4, caption: 'Naklejanki' },
                { fromSec: 169.4, durationSec: 2.4, caption: 'Melodie' },
              ],
            },
            {
              name: 'Dla rodzica',
              color: '#3d8fd6',
              shots: [
                { fromSec: 174.2, durationSec: 2.6, caption: 'Postępy dziecka' },
                { fromSec: 179.2, durationSec: 2.2, caption: 'Album prac' },
                { fromSec: 182.2, durationSec: 2.2, caption: 'Pocztówka tygodnia' },
              ],
            },
          ],
          features: {
            image: 'bystrzakowo/keyart-book-21.jpg',
            title: 'Spokojna głowa rodzica',
            durationSec: 4.2,
            items: ['Bez reklam', 'Działa bez internetu', 'Lektor czyta polecenia', 'Trudność rośnie z dzieckiem', '4 języki'],
            characters: [{ src: 'bystrzakowo/bazyl-thumbs.png', x: 1240, y: 520, width: 560, delaySec: 0.5 }],
          },
          end: {
            image: 'bystrzakowo/keyart-blocks-11.jpg',
            logo: 'Bystrzakowo',
            subtitle: 'Zagadki malucha',
            cta: 'Wkrótce w sklepach',
            badges: ['bystrzakowo/google-play-badge-pl.png', 'bystrzakowo/app-store-badge-pl.png'],
            durationSec: 3.8,
            characters: [
              { src: 'bystrzakowo/lusia-wow.png', x: 1080, y: 560, width: 470, delaySec: 0.4 },
              { src: 'bystrzakowo/bazyl-wink.png', x: 1440, y: 600, width: 440, delaySec: 0.6 },
            ],
          },
          music: { src: 'bystrzakowo/film-music-922.flac', volume: 0.85 },
          colors: { ink: '#ff7a1c', logo: '#ff7a1c', cta: '#4fb34a' },
          fadeFrames: 7,
        }}
      />
      <Composition
        id="BystrzakowoFilmEN"
        component={ShowcasePromo}
        durationInFrames={1800}
        fps={FPS}
        width={1920}
        height={1080}
        calculateMetadata={showcaseMetadata}
        defaultProps={{
          recording: 'bystrzakowo/film-en.mp4',
          backdrop: 'bystrzakowo/keyart-village-31.jpg',
          intro: {
            image: 'bystrzakowo/keyart-village-31.jpg',
            logo: 'Smartyville',
            subtitle: 'Smart play for kids aged 3–6',
            durationSec: 3.0,
            characters: [
              { src: 'bystrzakowo/lusia-teacher.png', x: 40, y: 450, width: 600, delaySec: 0.4 },
              { src: 'bystrzakowo/bazyl-point.png', x: 560, y: 500, width: 560, delaySec: 0.6 },
            ],
          },
          chapters: [
            {
              name: '4 lands, 21 games',
              color: '#ff7a1c',
              shots: [
                { src: 'bystrzakowo/realms-en.mp4', fromSec: 1.5, durationSec: 2.5, caption: 'Puzzle Meadow: 8 games' },
                { src: 'bystrzakowo/realms-en.mp4', fromSec: 4.5, durationSec: 2.5, caption: "Basil's Workshop: 6 games" },
                { src: 'bystrzakowo/realms-en.mp4', fromSec: 7.6, durationSec: 2.5, caption: "Lusia's Path: 4 games" },
                { src: 'bystrzakowo/realms-en.mp4', fromSec: 10.6, durationSec: 2.6, caption: 'Little Studio: 3 games' },
              ],
            },
            {
              name: 'Puzzle Meadow',
              color: '#4fb34a',
              shots: [
                { fromSec: 8.4, durationSec: 2.6, caption: 'Whose shadow is it?' },
                { fromSec: 20.2, durationSec: 2.4, caption: 'Moms and babies' },
                { fromSec: 29.3, durationSec: 2.4, caption: 'Counting' },
                { fromSec: 42.0, durationSec: 2.6, caption: 'Memory' },
              ],
            },
            {
              name: "Basil's Workshop",
              color: '#e0873a',
              shots: [
                { fromSec: 54.6, durationSec: 2.4, caption: 'Sorting' },
                { fromSec: 67.6, durationSec: 2.6, caption: 'Jigsaw puzzles' },
                { fromSec: 82.4, durationSec: 2.4, caption: "What's next?" },
                { fromSec: 95.4, durationSec: 2.4, caption: 'Picture stories' },
              ],
            },
            {
              name: "Lusia's Path",
              color: '#8e5bd6',
              shots: [
                { fromSec: 107.2, durationSec: 3.0, caption: 'Trace letters' },
                { fromSec: 121.4, durationSec: 2.4, caption: 'Numbers' },
                { fromSec: 139.4, durationSec: 2.4, caption: 'Dot to dot' },
                { fromSec: 148.4, durationSec: 2.4, caption: 'Mazes' },
              ],
            },
            {
              name: 'Little Studio',
              color: '#ff5fa2',
              shots: [
                { fromSec: 159.0, durationSec: 2.8, caption: 'Coloring pages' },
                { fromSec: 165.2, durationSec: 2.0, caption: 'A sticker reward!' },
                { fromSec: 169.0, durationSec: 2.4, caption: 'Sticker scenes' },
                { fromSec: 175.8, durationSec: 2.4, caption: 'Melodies' },
              ],
            },
            {
              name: 'For parents',
              color: '#3d8fd6',
              shots: [
                { fromSec: 180.4, durationSec: 2.6, caption: 'Progress charts' },
                { fromSec: 185.2, durationSec: 2.2, caption: 'Art album' },
                { fromSec: 188.2, durationSec: 2.2, caption: 'Weekly postcard' },
              ],
            },
          ],
          features: {
            image: 'bystrzakowo/keyart-book-21.jpg',
            title: 'Peace of mind for parents',
            durationSec: 4.2,
            items: ['No ads', 'Works offline', 'Every instruction read aloud', 'Grows with your child', '4 languages'],
            characters: [{ src: 'bystrzakowo/bazyl-thumbs.png', x: 1240, y: 520, width: 560, delaySec: 0.5 }],
          },
          end: {
            image: 'bystrzakowo/keyart-blocks-11.jpg',
            logo: 'Smartyville',
            subtitle: 'Preschool Games',
            cta: 'Coming soon',
            badges: ['bystrzakowo/google-play-badge-en.png', 'bystrzakowo/app-store-badge-en.png'],
            durationSec: 3.8,
            characters: [
              { src: 'bystrzakowo/lusia-wow.png', x: 1080, y: 560, width: 470, delaySec: 0.4 },
              { src: 'bystrzakowo/bazyl-wink.png', x: 1440, y: 600, width: 440, delaySec: 0.6 },
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
