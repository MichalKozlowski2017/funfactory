/**
 * Katalog obiektów: jeden obrazek zasila wszystkie zagadki, do których pasuje (zob. docs/bystrzakowo.md).
 * Grafika: public/art/items/<id>.webp, nazwa w lektorze: public/audio/<głos>/item-<id>.m4a.
 */
export type Category = 'zwierzeta' | 'owoce' | 'pojazdy' | 'zabawki' | 'kuchnia';

export interface Item {
  id: string;
  /** Nazwa w mianowniku (lektor czyta ją po trafieniu). */
  name: string;
  category: Category;
  /** Sylwetka jest charakterystyczna: obiekt może być w zagadce z cieniami. */
  shadow: boolean;
  /** Mały, „policzalny” obiekt do zagadek z liczeniem. */
  countable: boolean;
}

export const ITEMS: readonly Item[] = [
  { id: 'kot', name: 'Kot', category: 'zwierzeta', shadow: true, countable: false },
  { id: 'pies', name: 'Pies', category: 'zwierzeta', shadow: true, countable: false },
  { id: 'krowa', name: 'Krowa', category: 'zwierzeta', shadow: true, countable: false },
  { id: 'slon', name: 'Słoń', category: 'zwierzeta', shadow: true, countable: false },
  { id: 'kurczak', name: 'Kurczaczek', category: 'zwierzeta', shadow: false, countable: true },
  { id: 'ryba', name: 'Rybka', category: 'zwierzeta', shadow: true, countable: true },
  { id: 'zaba', name: 'Żabka', category: 'zwierzeta', shadow: true, countable: false },
  { id: 'kaczka', name: 'Kaczka', category: 'zwierzeta', shadow: true, countable: true },
  { id: 'jablko', name: 'Jabłko', category: 'owoce', shadow: true, countable: true },
  { id: 'banan', name: 'Banan', category: 'owoce', shadow: true, countable: true },
  { id: 'gruszka', name: 'Gruszka', category: 'owoce', shadow: true, countable: true },
  { id: 'truskawka', name: 'Truskawka', category: 'owoce', shadow: true, countable: true },
  { id: 'auto', name: 'Autko', category: 'pojazdy', shadow: true, countable: false },
  { id: 'rower', name: 'Rower', category: 'pojazdy', shadow: true, countable: false },
  { id: 'samolot', name: 'Samolot', category: 'pojazdy', shadow: true, countable: false },
  { id: 'lodka', name: 'Łódka', category: 'pojazdy', shadow: true, countable: false },
  { id: 'pilka', name: 'Piłka', category: 'zabawki', shadow: false, countable: true },
  { id: 'mis', name: 'Miś', category: 'zabawki', shadow: true, countable: false },
  { id: 'klocek', name: 'Klocek', category: 'zabawki', shadow: false, countable: true },
  { id: 'kubek', name: 'Kubek', category: 'kuchnia', shadow: true, countable: false },
];

export const itemById = (id: string): Item => {
  const item = ITEMS.find((i) => i.id === id);
  if (!item) throw new Error(`Brak obiektu ${id}`);
  return item;
};
