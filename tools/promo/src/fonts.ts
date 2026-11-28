import { loadFont as loadBaloo } from '@remotion/google-fonts/Baloo2';
import { loadFont as loadLilita } from '@remotion/google-fonts/LilitaOne';

/** Captions: rounded and heavy like the game's UI, with Polish letters (Lilita One has no ą, ę, ś, ż...). */
export const captionFont = loadBaloo('normal', { weights: ['800'], subsets: ['latin', 'latin-ext'] }).fontFamily;
/** Game logo (Glut uses Lilita One in its UI). */
export const logoFont = loadLilita('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily;
