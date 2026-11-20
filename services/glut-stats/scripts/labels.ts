import { EN_DATA } from '../../../games/glut/src/i18n.ts';
const d = EN_DATA as unknown as { items: Record<string, string>; achievements: Record<string, [string, string]> };
const ach = Object.fromEntries(Object.entries(d.achievements).map(([k, v]) => [k, v[0]]));
console.log(JSON.stringify({ items: d.items, achievements: ach }));
