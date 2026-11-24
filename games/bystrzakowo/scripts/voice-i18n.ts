/**
 * Kwestie lektora po angielsku i niemiecku → voice/<język>.json (zadanie dla skilla tts).
 *   node games/bystrzakowo/scripts/voice-i18n.ts
 * Lista nagrań pochodzi z gry (src/voice-lines.ts), więc brak tłumaczenia którejś kwestii przerywa skrypt.
 * Głosy: rodzime wzorce dla każdego języka (voices/lusia-en, bazyl-en, lusia-de, bazyl-de), zrobione z opisu
 * w VoxCPM2. Polskie wzorce czytały angielskie i niemieckie słowa z akcentem („Cat” jak „Cut”).
 * Bazyl to po angielsku i niemiecku Basil.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ITEMS, itemById, nameOf } from '../src/sim/catalog.ts';
import { setLang, type Lang } from '../src/sim/lang.ts';
import { lettersOf } from '../src/sim/letters.ts';
import { ITEM_NAMES } from '../src/sim/locales/items.ts';
import { wordsOf } from '../src/sim/syllables.ts';
import { voiceLines, type Guide } from '../src/voice-lines.ts';

type L = 'en' | 'de' | 'es';
type Text = string | Record<Guide, string>;

/** Kwestie wspólne (klucz bez przedrostka głosu). */
const T: Record<L, Record<string, Text>> = {
  en: {
    'bravo-1': 'Well done!',
    'bravo-2': 'Great job!',
    'bravo-3': 'Super, keep it up!',
    'bravo-4': 'Wonderful!',
    'bravo-5': "You're so clever!",
    'oops-1': 'Oops, try again.',
    'oops-2': "Hmm, that's not it. Try once more!",
    reward: 'Well done! You get a new sticker!',
    hello: { lusia: "Hi! I'm Lusia, and this is my friend Basil. Pick a little house and let's play together!", bazyl: "Hey! I'm Basil. Come on, it's going to be fun!" },
    help: { lusia: 'Look carefully. You can do it!', bazyl: 'Go on, touch a picture!' },
    // Lusia
    'realm-meadow': 'This is Puzzle Meadow! Pick a little house.',
    'realm-asleep': 'This land is still asleep. Ask a grown-up!',
    'realm-path': 'This is my Path! Here we draw with a finger.',
    'realm-studio': "This is the Little Studio! Here you can paint and create.",
    dots: 'Connect the dots in order! Start with number one.',
    memory: 'Find pairs of matching pictures!',
    'good-night': "That's enough playing for today! Lusia and Basil are going to sleep. See you tomorrow!",
    melody: 'Listen to my tune and play it the same way!',
    syllables: "Put the syllables in order, and then we'll read together!",
    coloring: 'Pick a color and touch the picture. Paint it any way you like!',
    'coloring-done': 'Beautiful! When you are done, touch the green arrow.',
    stickers: 'Make your own sticker picture! Drag a sticker onto the meadow.',
    letters: 'Draw the letter with your finger! Start at the green dot.',
    digits: 'Draw the number with your finger! Start at the green dot.',
    shadows: 'Whose shadow is this? Touch the right picture.',
    counting: 'Count how many there are!',
    'counting-touch': 'Touch them one by one and count with me.',
    album: 'This is your sticker album. Collect them all!',
    'number-0': 'Zero! There is nothing.',
    // Bazyl
    realms: 'Touch the colorful circles at the top to visit other lands!',
    stories: 'What happened first? Put the pictures in order!',
    'realm-workshop': 'Welcome to my workshop! Here we drag and arrange.',
    patterns: 'What comes next? Drag the missing picture!',
    shapes: 'Put each block into its hole!',
    matching: "What doesn't belong? Touch that picture.",
    jigsaw: 'Finish the picture! Drag the pieces into their places.',
    drag: 'Hold a picture with your finger and drag it to the box.',
    'sort-houses': 'Where do these animals live? Take each one to its home!',
    'sort-categories': 'Sort them! Each thing goes into its box.',
    'sort-colors': 'Put each thing into the bucket of the same color!',
    'sort-seasons': 'What do we wear in summer, and what in winter?',
    'sort-motion': 'How do these things move? Sort them!',
    'sort-size': 'Which animals are big, and which are small?',
    'category-kitchen': 'Kitchen things go here!',
    'category-fruit': 'Fruit goes here!',
    'category-vehicles': 'Vehicles go here!',
    'category-clothes': 'Clothes go here!',
    'category-vegetables': 'Vegetables go here!',
    'category-toys': 'Toys go here!',
    'category-animals': 'Animals go here!',
    'house-africa': 'In Africa!',
    'house-forest': 'In the forest!',
    'house-ice': 'Where there is ice and snow!',
    'house-village': 'On the farm!',
    'house-water': 'In the water!',
    'season-summer': 'For summer!',
    'season-winter': 'For winter!',
    'size-big': 'Big animals!',
    'size-small': 'Little animals!',
    'motion-drives': 'Things that drive!',
    'motion-flies': 'Things that fly!',
    'motion-swims': 'Things that swim!',
  },
  es: {
    'bravo-1': '¡Bravo!',
    'bravo-2': '¡Muy bien!',
    'bravo-3': '¡Súper, sigue así!',
    'bravo-4': '¡Maravilloso!',
    'bravo-5': '¡Qué listo eres!',
    'oops-1': 'Uy, inténtalo otra vez.',
    'oops-2': 'Mmm, no es ese. ¡Inténtalo de nuevo!',
    reward: '¡Bravo! ¡Ganas una calcomanía nueva!',
    hello: { lusia: '¡Hola! Soy Lusia, y este es mi amigo Basil. ¡Elige una casita y juguemos juntos!', bazyl: '¡Hola! Soy Basil. ¡Ven, va a ser divertido!' },
    help: { lusia: 'Mira con atención. ¡Tú puedes!', bazyl: '¡Anda, toca una imagen!' },
    'realm-meadow': '¡Esta es la Pradera de Acertijos! Elige una casita.',
    'realm-asleep': 'Este mundo todavía está dormido. ¡Pídele ayuda a un adulto!',
    'realm-path': '¡Este es mi Sendero! Aquí dibujamos con el dedo.',
    'realm-studio': '¡Este es el Pequeño Estudio! Aquí puedes pintar y crear.',
    dots: '¡Une los puntos en orden! Empieza por el uno.',
    memory: '¡Encuentra las parejas de imágenes iguales!',
    'good-night': '¡Por hoy ya jugamos bastante! Lusia y Basil se van a dormir. ¡Hasta mañana!',
    melody: '¡Escucha mi melodía y tócala igual!',
    syllables: '¡Ordena las sílabas y luego leemos juntos!',
    coloring: 'Elige un color y toca el dibujo. ¡Píntalo como quieras!',
    'coloring-done': '¡Qué bonito! Cuando termines, toca la flecha verde.',
    stickers: '¡Haz tu propio dibujo con calcomanías! Arrastra una calcomanía a la pradera.',
    letters: '¡Dibuja la letra con el dedo! Empieza en el punto verde.',
    digits: '¡Dibuja el número con el dedo! Empieza en el punto verde.',
    shadows: '¿De quién es esta sombra? Toca la imagen correcta.',
    counting: '¡Cuenta cuántos hay!',
    'counting-touch': 'Tócalos uno por uno y cuenta conmigo.',
    album: 'Este es tu álbum de calcomanías. ¡Colecciónalas todas!',
    'number-0': '¡Cero! No hay nada.',
    realms: '¡Toca los círculos de colores de arriba para visitar otros mundos!',
    stories: '¿Qué pasó primero? ¡Ordena las imágenes!',
    'realm-workshop': '¡Bienvenido a mi taller! Aquí arrastramos y ordenamos.',
    patterns: '¿Qué sigue? ¡Arrastra la imagen que falta!',
    shapes: '¡Mete cada bloque en su agujero!',
    matching: '¿Cuál sobra? Toca esa imagen.',
    jigsaw: '¡Arma la imagen! Arrastra las piezas a su lugar.',
    drag: 'Sujeta una imagen con el dedo y arrástrala a la caja.',
    'sort-houses': '¿Dónde viven estos animales? ¡Lleva a cada uno a su casa!',
    'sort-categories': '¡Clasifica! Cada cosa va en su caja.',
    'sort-colors': '¡Pon cada cosa en la cubeta del mismo color!',
    'sort-seasons': '¿Qué usamos en verano y qué en invierno?',
    'sort-motion': '¿Cómo se mueven estas cosas? ¡Clasifícalas!',
    'sort-size': '¿Qué animales son grandes y cuáles son pequeños?',
    'category-kitchen': '¡Aquí van las cosas de la cocina!',
    'category-fruit': '¡Aquí van las frutas!',
    'category-vehicles': '¡Aquí van los vehículos!',
    'category-clothes': '¡Aquí va la ropa!',
    'category-vegetables': '¡Aquí van las verduras!',
    'category-toys': '¡Aquí van los juguetes!',
    'category-animals': '¡Aquí van los animales!',
    'house-africa': '¡En África!',
    'house-forest': '¡En el bosque!',
    'house-ice': '¡Donde hay hielo y nieve!',
    'house-village': '¡En la granja!',
    'house-water': '¡En el agua!',
    'season-summer': '¡Para el verano!',
    'season-winter': '¡Para el invierno!',
    'size-big': '¡Animales grandes!',
    'size-small': '¡Animales pequeños!',
    'motion-drives': '¡Lo que rueda!',
    'motion-flies': '¡Lo que vuela!',
    'motion-swims': '¡Lo que nada!',
  },
  de: {
    'bravo-1': 'Bravo!',
    'bravo-2': 'Toll gemacht!',
    'bravo-3': 'Super, weiter so!',
    'bravo-4': 'Wunderbar!',
    'bravo-5': 'Du bist ja ein kluger Kopf!',
    'oops-1': 'Hoppla, versuch es noch mal.',
    'oops-2': 'Hmm, das ist es nicht. Versuch es noch einmal!',
    reward: 'Bravo! Du bekommst einen neuen Sticker!',
    hello: { lusia: 'Hallo! Ich bin Lusia, und das ist mein Freund Basil. Such dir ein Häuschen aus und lass uns zusammen spielen!', bazyl: 'Hey! Ich bin Basil. Komm, das wird lustig!' },
    help: { lusia: 'Schau genau hin. Du schaffst das!', bazyl: 'Na los, tipp auf ein Bild!' },
    'realm-meadow': 'Das ist die Rätselwiese! Such dir ein Häuschen aus.',
    'realm-asleep': 'Dieses Land schläft noch. Frag einen Erwachsenen!',
    'realm-path': 'Das ist mein Pfad! Hier malen wir mit dem Finger.',
    'realm-studio': 'Das ist das kleine Atelier! Hier kannst du malen und basteln.',
    dots: 'Verbinde die Punkte der Reihe nach! Fang bei der Eins an.',
    memory: 'Finde Paare mit gleichen Bildern!',
    'good-night': 'Für heute ist genug gespielt! Lusia und Basil gehen schlafen. Bis morgen!',
    melody: 'Hör dir meine Melodie an und spiel sie genauso nach!',
    syllables: 'Leg die Silben in die richtige Reihenfolge, dann lesen wir zusammen!',
    coloring: 'Such dir eine Farbe aus und tipp auf das Bild. Mal es an, wie du willst!',
    'coloring-done': 'Wunderschön! Wenn du fertig bist, tipp auf den grünen Pfeil.',
    stickers: 'Mach dein eigenes Stickerbild! Zieh einen Sticker auf die Wiese.',
    letters: 'Schreib den Buchstaben mit dem Finger! Fang beim grünen Punkt an.',
    digits: 'Schreib die Zahl mit dem Finger! Fang beim grünen Punkt an.',
    shadows: 'Wessen Schatten ist das? Tipp auf das richtige Bild.',
    counting: 'Zähl mal, wie viele es sind!',
    'counting-touch': 'Tipp sie der Reihe nach an und zähl mit mir.',
    album: 'Das ist dein Stickeralbum. Sammle sie alle!',
    'number-0': 'Null! Da ist nichts.',
    realms: 'Tipp oben auf die bunten Kreise, um andere Länder zu besuchen!',
    stories: 'Was war zuerst? Leg die Bilder der Reihe nach!',
    'realm-workshop': 'Willkommen in meiner Werkstatt! Hier ziehen und sortieren wir.',
    patterns: 'Was kommt als Nächstes? Zieh das fehlende Bild hin!',
    shapes: 'Steck jeden Klotz in sein Loch!',
    matching: 'Was passt hier nicht? Tipp auf dieses Bild.',
    jigsaw: 'Setz das Bild zusammen! Zieh die Teile an ihren Platz.',
    drag: 'Halte ein Bild mit dem Finger fest und zieh es in die Kiste.',
    'sort-houses': 'Wo wohnen diese Tiere? Bring jedes nach Hause!',
    'sort-categories': 'Sortier mal! Jedes Ding kommt in seine Kiste.',
    'sort-colors': 'Leg jedes Ding in den Eimer mit der gleichen Farbe!',
    'sort-seasons': 'Was tragen wir im Sommer, und was im Winter?',
    'sort-motion': 'Wie bewegen sich diese Dinge? Sortier sie!',
    'sort-size': 'Welche Tiere sind groß, und welche sind klein?',
    'category-kitchen': 'Hier kommen Küchensachen hin!',
    'category-fruit': 'Hier kommt das Obst hin!',
    'category-vehicles': 'Hier kommen die Fahrzeuge hin!',
    'category-clothes': 'Hier kommt die Kleidung hin!',
    'category-vegetables': 'Hier kommt das Gemüse hin!',
    'category-toys': 'Hier kommt das Spielzeug hin!',
    'category-animals': 'Hier kommen die Tiere hin!',
    'house-africa': 'In Afrika!',
    'house-forest': 'Im Wald!',
    'house-ice': 'Wo es Eis und Schnee gibt!',
    'house-village': 'Auf dem Bauernhof!',
    'house-water': 'Im Wasser!',
    'season-summer': 'Für den Sommer!',
    'season-winter': 'Für den Winter!',
    'size-big': 'Große Tiere!',
    'size-small': 'Kleine Tiere!',
    'motion-drives': 'Was fährt!',
    'motion-flies': 'Was fliegt!',
    'motion-swims': 'Was schwimmt!',
  },
};

const NUM: Record<L, string[]> = {
  en: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'],
  es: ['¡Uno', '¡Dos', '¡Tres', '¡Cuatro', '¡Cinco', '¡Seis', '¡Siete', '¡Ocho', '¡Nueve', '¡Diez'],
  de: ['Eins', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn'],
};

const COLORS: Record<L, Record<string, [show: string, bucket: string]>> = {
  en: {
    red: ['Show me something red!', 'Red bucket!'],
    yellow: ['Show me something yellow!', 'Yellow bucket!'],
    green: ['Show me something green!', 'Green bucket!'],
    blue: ['Show me something blue!', 'Blue bucket!'],
    orange: ['Show me something orange!', 'Orange bucket!'],
    pink: ['Show me something pink!', 'Pink bucket!'],
    purple: ['Show me something purple!', 'Purple bucket!'],
    brown: ['Show me something brown!', 'Brown bucket!'],
    white: ['Show me something white!', 'White bucket!'],
  },
  es: {
    red: ['¡Muéstrame algo rojo!', '¡Cubeta roja!'],
    yellow: ['¡Muéstrame algo amarillo!', '¡Cubeta amarilla!'],
    green: ['¡Muéstrame algo verde!', '¡Cubeta verde!'],
    blue: ['¡Muéstrame algo azul!', '¡Cubeta azul!'],
    orange: ['¡Muéstrame algo naranja!', '¡Cubeta naranja!'],
    pink: ['¡Muéstrame algo rosa!', '¡Cubeta rosa!'],
    purple: ['¡Muéstrame algo morado!', '¡Cubeta morada!'],
    brown: ['¡Muéstrame algo café!', '¡Cubeta café!'],
    white: ['¡Muéstrame algo blanco!', '¡Cubeta blanca!'],
  },
  de: {
    red: ['Zeig mir etwas Rotes!', 'Roter Eimer!'],
    yellow: ['Zeig mir etwas Gelbes!', 'Gelber Eimer!'],
    green: ['Zeig mir etwas Grünes!', 'Grüner Eimer!'],
    blue: ['Zeig mir etwas Blaues!', 'Blauer Eimer!'],
    orange: ['Zeig mir etwas Oranges!', 'Oranger Eimer!'],
    pink: ['Zeig mir etwas Rosanes!', 'Rosa Eimer!'],
    purple: ['Zeig mir etwas Lilanes!', 'Lila Eimer!'],
    brown: ['Zeig mir etwas Braunes!', 'Brauner Eimer!'],
    white: ['Zeig mir etwas Weißes!', 'Weißer Eimer!'],
  },
};

const SHAPES: Record<L, Record<string, string>> = {
  en: { circle: 'Circle!', square: 'Square!', triangle: 'Triangle!', rectangle: 'A rectangle!', star: 'Star!', heart: 'Heart!', oval: 'Oval!', rhombus: 'Diamond!', moon: 'Moon!', drop: 'Drop!' },
  es: { circle: '¡Círculo!', square: '¡Cuadrado!', triangle: '¡Triángulo!', rectangle: '¡Rectángulo!', star: '¡Estrella!', heart: '¡Corazón!', oval: '¡Óvalo!', rhombus: '¡Rombo!', moon: '¡Luna!', drop: '¡Gota!' },
  de: { circle: 'Kreis!', square: 'Quadrat!', triangle: 'Dreieck!', rectangle: 'Rechteck!', star: 'Stern!', heart: 'Herz!', oval: 'Oval!', rhombus: 'Raute!', moon: 'Mond!', drop: 'Tropfen!' },
};

const EMOTIONS: Record<L, Record<string, [show: string, face: string]>> = {
  en: {
    happy: ['Show me a happy face!', 'A happy face!'],
    sad: ['Show me a sad face!', 'A sad face!'],
    angry: ['Show me an angry face!', 'An angry face!'],
    surprised: ['Show me a surprised face!', 'A surprised face!'],
    scared: ['Show me a scared face!', 'A scared face!'],
    sleepy: ['Show me a sleepy face!', 'A sleepy face!'],
  },
  es: {
    happy: ['¡Muéstrame una carita feliz!', '¡Una carita feliz!'],
    sad: ['¡Muéstrame una carita triste!', '¡Una carita triste!'],
    angry: ['¡Muéstrame una carita enojada!', '¡Una carita enojada!'],
    surprised: ['¡Muéstrame una carita sorprendida!', '¡Una carita sorprendida!'],
    scared: ['¡Muéstrame una carita asustada!', '¡Una carita asustada!'],
    sleepy: ['¡Muéstrame una carita con sueño!', '¡Una carita con sueño!'],
  },
  de: {
    happy: ['Zeig mir ein fröhliches Gesicht!', 'Ein fröhliches Gesicht!'],
    sad: ['Zeig mir ein trauriges Gesicht!', 'Ein trauriges Gesicht!'],
    angry: ['Zeig mir ein wütendes Gesicht!', 'Ein wütendes Gesicht!'],
    surprised: ['Zeig mir ein überraschtes Gesicht!', 'Ein überraschtes Gesicht!'],
    scared: ['Zeig mir ein ängstliches Gesicht!', 'Ein ängstliches Gesicht!'],
    sleepy: ['Zeig mir ein müdes Gesicht!', 'Ein müdes Gesicht!'],
  },
};

/** „Gdzie jest mama …?”: forma młodego w zdaniu. */
const MOTHERS: Record<L, Record<string, string>> = {
  en: { chick: "Where is the chick's mommy?", calf: "Where is the calf's mommy?", kitten: "Where is the kitten's mommy?", lamb: "Where is the lamb's mommy?", piglet: "Where is the piglet's mommy?", foal: "Where is the foal's mommy?", duckling: "Where is the duckling's mommy?", tadpole: "Where is the tadpole's mommy?", 'fox-cub': "Where is the fox cub's mommy?", 'bear-cub': "Where is the bear cub's mommy?", 'penguin-chick': "Where is the penguin chick's mommy?", 'lion-cub': "Where is the lion cub's mommy?", 'kid-goat': "Where is the baby goat's mommy?", 'baby-giraffe': "Where is the baby giraffe's mommy?", 'seal-pup': "Where is the seal pup's mommy?", owlet: "Where is the owlet's mommy?", puppy: "Where is the puppy's mommy?", bunny: "Where is the baby bunny's mommy?", 'elephant-calf': "Where is the baby elephant's mommy?", 'baby-turtle': "Where is the baby turtle's mommy?" },
  es: { chick: '¿Dónde está la mamá del pollito?', calf: '¿Dónde está la mamá del ternero?', kitten: '¿Dónde está la mamá del gatito?', lamb: '¿Dónde está la mamá del corderito?', piglet: '¿Dónde está la mamá del cerdito?', foal: '¿Dónde está la mamá del potrillo?', duckling: '¿Dónde está la mamá del patito?', tadpole: '¿Dónde está la mamá del renacuajo?', 'fox-cub': "¿Dónde está la mamá del zorrito?", 'bear-cub': "¿Dónde está la mamá del osezno?", 'penguin-chick': "¿Dónde está la mamá del pingüinito?", 'lion-cub': "¿Dónde está la mamá del leoncito?", 'kid-goat': "¿Dónde está la mamá del cabrito?", 'baby-giraffe': "¿Dónde está la mamá de la jirafita?", 'seal-pup': "¿Dónde está la mamá de la foquita?", owlet: "¿Dónde está la mamá del búho bebé?", puppy: '¿Dónde está la mamá del cachorrito?', bunny: '¿Dónde está la mamá del conejito?', 'elephant-calf': '¿Dónde está la mamá del elefantito?', 'baby-turtle': '¿Dónde está la mamá de la tortuguita?' },
  de: { chick: 'Wo ist die Mama vom Küken?', calf: 'Wo ist die Mama vom Kälbchen?', kitten: 'Wo ist die Mama vom Kätzchen?', lamb: 'Wo ist die Mama vom Lämmchen?', piglet: 'Wo ist die Mama vom Ferkel?', foal: 'Wo ist die Mama vom Fohlen?', duckling: 'Wo ist die Mama vom Entenküken?', tadpole: 'Wo ist die Mama von der Kaulquappe?', 'fox-cub': "Wo ist die Mama vom Fuchsjungen?", 'bear-cub': "Wo ist die Mama vom Bärenjungen?", 'penguin-chick': "Wo ist die Mama vom Pinguinküken?", 'lion-cub': "Wo ist die Mama vom Löwenjungen?", 'kid-goat': "Wo ist die Mama vom Zicklein?", 'baby-giraffe': "Wo ist die Mama vom Giraffenbaby?", 'seal-pup': "Wo ist die Mama vom Robbenbaby?", owlet: "Wo ist die Mama vom Eulenküken?", puppy: 'Wo ist die Mama vom Welpen?', bunny: 'Wo ist die Mama vom Häschen?', 'elephant-calf': 'Wo ist die Mama vom Elefantenbaby?', 'baby-turtle': 'Wo ist die Mama vom Schildkrötenbaby?' },
};

const MAZE: Record<L, Record<string, string>> = {
  en: {
    calf: 'Lead the calf to its mommy!',
    duckling: 'Lead the duckling to its mommy!',
    kitten: 'Lead the kitten to its mommy!',
    rabbit: 'Lead the bunny to the carrot!',
    chick: 'Lead the chick to its mommy!',
    monkey: 'Lead the monkey to the banana!',
    butterfly: 'Lead the butterfly to the flower!',
    piglet: 'Lead the piglet to its mommy!',
    bee: 'Lead the bee to the flower!',
    squirrel: 'Lead the squirrel to the tree!',
    'fox-cub': "Lead the fox cub to its mommy!",
    'bear-cub': "Lead the bear cub to its mommy!",
    'penguin-chick': "Lead the penguin chick to its mommy!",
    'lion-cub': "Lead the lion cub to its mommy!",
    'kid-goat': "Lead the baby goat to its mommy!",
    'baby-giraffe': "Lead the baby giraffe to its mommy!",
    'seal-pup': "Lead the seal pup to its mommy!",
    owlet: "Lead the owlet to its mommy!",
    puppy: 'Lead the puppy to its mommy.',
    bunny: 'Lead the baby bunny to its mommy.',
    'elephant-calf': 'Lead the baby elephant to its mommy.',
    'baby-turtle': 'Lead the baby turtle to its mommy.',
  },
  es: {
    calf: '¡Lleva al ternero con su mamá!',
    duckling: '¡Lleva al patito con su mamá!',
    kitten: '¡Lleva al gatito con su mamá!',
    rabbit: '¡Lleva al conejo a la zanahoria!',
    chick: '¡Lleva al pollito con su mamá!',
    monkey: '¡Lleva al mono al plátano!',
    butterfly: '¡Lleva a la mariposa a la flor!',
    piglet: '¡Lleva al cerdito con su mamá!',
    bee: '¡Lleva a la abeja a la flor!',
    squirrel: '¡Lleva a la ardilla al árbol!',
    'fox-cub': "¡Lleva al zorrito con su mamá!",
    'bear-cub': "¡Lleva al osezno con su mamá!",
    'penguin-chick': "¡Lleva al pingüinito con su mamá!",
    'lion-cub': "¡Lleva al leoncito con su mamá!",
    'kid-goat': "¡Lleva al cabrito con su mamá!",
    'baby-giraffe': "¡Lleva a la jirafita con su mamá!",
    'seal-pup': "¡Lleva a la foquita con su mamá!",
    owlet: "¡Lleva al búho bebé con su mamá!",
    puppy: 'Lleva al cachorrito con su mamá.',
    bunny: 'Lleva al conejito con su mamá.',
    'elephant-calf': 'Lleva al elefantito con su mamá.',
    'baby-turtle': 'Lleva a la tortuguita con su mamá.',
  },
  de: {
    calf: 'Bring das Kälbchen zu seiner Mama!',
    duckling: 'Bring das Entenküken zu seiner Mama!',
    kitten: 'Bring das Kätzchen zu seiner Mama!',
    rabbit: 'Bring das Kaninchen zur Karotte!',
    chick: 'Bring das Küken zu seiner Mama!',
    monkey: 'Bring den Affen zur Banane!',
    butterfly: 'Bring den Schmetterling zur Blume!',
    piglet: 'Bring das Ferkel zu seiner Mama!',
    bee: 'Bring die Biene zur Blume!',
    squirrel: 'Bring das Eichhörnchen zum Baum!',
    'fox-cub': "Bring das Fuchsjunge zu seiner Mama!",
    'bear-cub': "Bring das Bärenjunge zu seiner Mama!",
    'penguin-chick': "Bring das Pinguinküken zu seiner Mama!",
    'lion-cub': "Bring das Löwenjunge zu seiner Mama!",
    'kid-goat': "Bring das Zicklein zu seiner Mama!",
    'baby-giraffe': "Bring das Giraffenbaby zu seiner Mama!",
    'seal-pup': "Bring das Robbenbaby zu seiner Mama!",
    owlet: "Bring das Eulenküken zu seiner Mama!",
    puppy: 'Bring den Welpen zu seiner Mama.',
    bunny: 'Bring das Häschen zu seiner Mama.',
    'elephant-calf': 'Bring das Elefantenbaby zu seiner Mama.',
    'baby-turtle': 'Bring das Schildkrötenbaby zu seiner Mama.',
  },
};

const STORIES: Record<L, Record<string, string>> = {
  en: {
    flower: 'First a seed, then a sprout, and at the end a flower!',
    chick: "First an egg, then the shell cracks, and at the end there's a little chick!",
    butterfly: 'First a caterpillar, then a cocoon, and at the end a butterfly!',
    snowman: 'First one snowball, then another, and at the end a snowman!',
    apple: 'First a whole apple, then a bite, and at the end an apple core!',
    'ice-cream': 'First a full ice cream, then less and less, and at the end an empty cone!',
    froglet: 'First little eggs, then a tadpole, and at the end a frog!',
    sandwich: 'First the bread, then the butter, and at the end a yummy sandwich!',
    tower: 'First one block, then two, and at the end a tall tower!',
    balloon: 'First an empty balloon, then a little air, and at the end a big balloon!',
    cake: 'First we mix the batter, then we bake, and at the end there is a cake!',
    castle: 'First a bucket of sand, then a sand tower, and at the end a sandcastle!',
    egg: 'First an egg, then we crack it into the pan, and at the end a fried egg!',
    pizza: 'First a ball of dough, then the sauce, and at the end a yummy pizza!',
    candle: 'First a tall candle, then shorter and shorter, and at the end a tiny stub!',
    cocoa: 'First an empty mug, then milk, and at the end warm cocoa!',
    nest: 'First some twigs, then a nest, and at the end a bird in the nest!',
    'small-tree': 'First a tiny sapling, then a little tree, and at the end an apple tree with apples!',
    airplane: 'First a sheet of paper, then we fold it, and at the end a paper plane!',
    banana: 'First a whole banana, then we peel it, and at the end only the peel is left!',
    watermelon: 'First a whole watermelon, then we cut it in half, and at the end yummy slices!',
    aquarium: 'First an empty fish bowl, then water, and at the end a little fish!',
    gift: 'First a wrapped present, then we open it, and inside there is a teddy bear!',
    'car-wash': 'First a muddy car, then soap foam, and at the end it is shiny and clean!',
    cupcake: 'First batter in a paper cup, then we bake it, and at the end cream and a cherry!',
    day: 'First the sun rises in the morning, then it is daytime, and at the end it is night!',
  },
  es: {
    flower: '¡Primero una semilla, luego un brote, y al final una flor!',
    chick: '¡Primero un huevo, luego se rompe el cascarón, y al final hay un pollito!',
    butterfly: '¡Primero una oruga, luego un capullo, y al final una mariposa!',
    snowman: '¡Primero una bola de nieve, luego otra, y al final un muñeco de nieve!',
    apple: '¡Primero una manzana entera, luego una mordida, y al final el corazón de la manzana!',
    'ice-cream': '¡Primero un helado lleno, luego cada vez menos, y al final un cono vacío!',
    froglet: '¡Primero unos huevitos, luego un renacuajo, y al final una rana!',
    sandwich: '¡Primero el pan, luego la mantequilla, y al final un rico sándwich!',
    tower: '¡Primero un bloque, luego dos, y al final una torre alta!',
    balloon: '¡Primero un globo vacío, luego un poco de aire, y al final un globo grande!',
    cake: '¡Primero mezclamos la masa, luego horneamos, y al final hay un pastel!',
    castle: '¡Primero una cubeta de arena, luego una torre de arena, y al final un castillo de arena!',
    egg: '¡Primero un huevo, luego lo rompemos en el sartén, y al final un huevo estrellado!',
    pizza: '¡Primero una bola de masa, luego la salsa, y al final una rica pizza!',
    candle: '¡Primero una vela larga, luego cada vez más corta, y al final un cabito chiquito!',
    cocoa: '¡Primero una taza vacía, luego leche, y al final un chocolate calientito!',
    nest: '¡Primero unas ramitas, luego un nido, y al final un pájaro en el nido!',
    'small-tree': '¡Primero un arbolito chiquito, luego un árbol, y al final un manzano con manzanas!',
    airplane: '¡Primero una hoja de papel, luego la doblamos, y al final un avión de papel!',
    banana: '¡Primero un plátano entero, luego lo pelamos, y al final solo queda la cáscara!',
    watermelon: '¡Primero una sandía entera, luego la partimos, y al final ricas rebanadas!',
    aquarium: '¡Primero una pecera vacía, luego agua, y al final un pececito!',
    gift: '¡Primero un regalo envuelto, luego lo abrimos, y adentro hay un osito!',
    'car-wash': '¡Primero un carrito sucio, luego espuma, y al final brilla de limpio!',
    cupcake: '¡Primero masa en un molde de papel, luego lo horneamos, y al final crema y una cereza!',
    day: '¡Primero sale el sol en la mañana, luego es de día, y al final es de noche!',
  },
  de: {
    flower: 'Zuerst ein Samen, dann ein Keimling, und am Ende eine Blume!',
    chick: 'Zuerst ein Ei, dann bricht die Schale, und am Ende ist da ein kleines Küken!',
    butterfly: 'Zuerst eine Raupe, dann ein Kokon, und am Ende ein Schmetterling!',
    snowman: 'Zuerst eine Schneekugel, dann noch eine, und am Ende ein Schneemann!',
    apple: 'Zuerst ein ganzer Apfel, dann ein Biss, und am Ende ein Apfelgriebs!',
    'ice-cream': 'Zuerst ein volles Eis, dann immer weniger, und am Ende eine leere Waffel!',
    froglet: 'Zuerst kleine Eier, dann eine Kaulquappe, und am Ende ein Frosch!',
    sandwich: 'Zuerst das Brot, dann die Butter, und am Ende ein leckeres Butterbrot!',
    tower: 'Zuerst ein Klotz, dann zwei, und am Ende ein hoher Turm!',
    balloon: 'Zuerst ein leerer Ballon, dann ein bisschen Luft, und am Ende ein großer Ballon!',
    cake: 'Zuerst rühren wir den Teig, dann backen wir, und am Ende gibt es eine Torte!',
    castle: 'Zuerst ein Eimer Sand, dann ein Sandturm, und am Ende eine Sandburg!',
    egg: 'Zuerst ein Ei, dann schlagen wir es in die Pfanne, und am Ende ein Spiegelei!',
    pizza: 'Zuerst eine Teigkugel, dann die Soße, und am Ende eine leckere Pizza!',
    candle: 'Zuerst eine lange Kerze, dann immer kürzer, und am Ende ein kleiner Stummel!',
    cocoa: 'Zuerst eine leere Tasse, dann Milch, und am Ende warmer Kakao!',
    nest: 'Zuerst ein paar Zweige, dann ein Nest, und am Ende ein Vogel im Nest!',
    'small-tree': 'Zuerst ein kleiner Setzling, dann ein Bäumchen, und am Ende ein Apfelbaum mit Äpfeln!',
    airplane: 'Zuerst ein Blatt Papier, dann falten wir es, und am Ende ein Papierflieger!',
    banana: 'Zuerst eine ganze Banane, dann schälen wir sie, und am Ende bleibt nur die Schale!',
    watermelon: 'Zuerst eine ganze Wassermelone, dann schneiden wir sie auf, und am Ende leckere Stücke!',
    aquarium: 'Zuerst ein leeres Fischglas, dann Wasser, und am Ende ein kleiner Fisch!',
    gift: 'Zuerst ein eingepacktes Geschenk, dann packen wir es aus, und drin ist ein Teddy!',
    'car-wash': 'Zuerst ein schmutziges Auto, dann Schaum, und am Ende glänzt es sauber!',
    cupcake: 'Zuerst Teig im Förmchen, dann backen wir ihn, und am Ende Sahne und eine Kirsche!',
    day: 'Zuerst geht morgens die Sonne auf, dann ist Tag, und am Ende ist Nacht!',
  },
};

/** Tekst kwestii `line` przewodnika `guide` w języku `l`. */
function text(l: L, guide: Guide, line: string): string {
  const common = T[l][line];
  if (common !== undefined) return typeof common === 'string' ? common : common[guide];
  const [kind, ...rest] = line.split('-');
  const key = rest.join('-');
  switch (kind) {
    case 'item':
      return l === 'es' ? `¡${ITEM_NAMES[key]![l]}!` : `${ITEM_NAMES[key]![l]}!`;
    case 'number':
      return `${NUM[l][Number(key) - 1]}!`;
    case 'color':
      return COLORS[l][key]![0];
    case 'hue':
      return COLORS[l][key]![1];
    case 'shape':
      return SHAPES[l][key]!;
    case 'emotions':
      return EMOTIONS[l][key]![0];
    case 'face':
      return EMOTIONS[l][key]![1];
    case 'mother':
      return MOTHERS[l][key]!;
    case 'maze':
      return MAZE[l][key]!;
    case 'history':
      return STORIES[l][key]!;
    case 'read': {
      const w = wordsOf(l).find((x) => x.item === key)!;
      const whole = ITEM_NAMES[key]![l];
      const parts = w.syl.map((s, i) => (i === 0 ? s[0] + s.slice(1).toLowerCase() : s.toLowerCase()));
      return l === 'es' ? `${parts.join('... ')}... ¡${whole}!` : `${parts.join('... ')}... ${whole}!`;
    }
    case 'letter': {
      const x = lettersOf(l).find((y) => y.ch.toLowerCase() === key)!;
      const word = nameOf(itemById(x.item));
      // Litery, które lektor czyta niewyraźnie, zapisane tak, jak się je wymawia.
      const spoken = ({ de: { G: 'Ge', J: 'Jott' }, es: { C: 'Ce' } } as Record<string, Record<string, string>>)[l]?.[x.ch] ?? x.ch;
      if (l === 'es') return `¡${spoken} de ${word.toLowerCase()}!`;
      return l === 'en' ? `${spoken} is for ${word.toLowerCase()}!` : `${spoken} wie ${word}!`;
    }
    case 'phoneme':
      if (l === 'es') return `¿Qué empieza con... ${key.toUpperCase()}?`;
      return l === 'en' ? `What starts with... ${key.toUpperCase()}?` : `Was fängt mit... ${key.toUpperCase()} an?`;
  }
  throw new Error(`Brak tłumaczenia: ${l} ${guide}-${line}`);
}

// Angielski: spokojne głosy (wybór właściciela 22.11.2026, poprzednie „krzyczały”).
const voiceOf = (l: L, g: Guide) => (l === 'en' ? `voices/${g}-en-calm` : `voices/${g}-${l}`);
/** Spokojniej: wykrzyknik czytany jest jak okrzyk, więc po angielsku kończymy kropką. */
const calm = (l: L, t: string) => (l === 'en' ? t.replace(/!/g, '.') : t);
const dir = join(import.meta.dirname, '..', 'voice');
for (const l of ['en', 'de', 'es'] as const) {
  setLang(l as Lang);
  const names = voiceLines(l);
  // Sylabowanie Whisper zawsze zapisuje po swojemu („Pumpkin? Pumpkin?”), więc te kwestie dostają mniej prób.
  const lines = (['lusia', 'bazyl'] as const).flatMap((g) =>
    names[g].map((line) => ({ name: `${g}-${line}`, text: calm(l, text(l, g, line)), voice: voiceOf(l, g), ...(line.startsWith('read-') ? { tries: 3 } : {}) })),
  );
  // Kwestie nagrane innym silnikiem (Chatterbox: własny tekst, seed, próbka głosu) zostają bez zmian.
  const file = join(dir, `${l}.json`);
  const kept = new Map<string, { name: string; engine?: string }>(
    existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')).lines as { name: string; engine?: string }[]).filter((x) => x.engine).map((x) => [x.name, x]) : [],
  );
  // Każda kwestia raz (np. nazwy obiektów są w obu głosach osobno, więc zostają).
  const unique = [...new Map(lines.map((x) => [x.name, kept.get(x.name) ?? x])).values()];
  writeFileSync(file, JSON.stringify({ voice: voiceOf(l, 'lusia'), lang: l, tries: 8, lines: unique }, null, 1) + '\n');
  console.log(`${l}: ${unique.length} kwestii`);
}
void ITEMS;
