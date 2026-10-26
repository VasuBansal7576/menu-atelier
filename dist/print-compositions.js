import { layoutStudioA } from './print-studio-a.js';
import { layoutStudioB } from './print-studio-b.js';
const definition = value => Object.freeze(value);
export const compositions = Object.freeze({
  trattoria: definition({ name: 'Market Bloom', mood: 'A vivid produce poster with category lanes', layout: layoutStudioA, variant: 'market-bloom' }),
  atelier: definition({ name: 'Folio', mood: 'A typographic journal with editorial rows', layout: layoutStudioB, variant: 'folio' }),
  botanical: definition({ name: 'Sunroom', mood: 'A landscape poster with an illustrated identity island', layout: layoutStudioB, variant: 'sunroom' }),
  midnight: definition({ name: 'Night Press', mood: 'A dark culinary broadsheet with an adaptive dish grid', layout: layoutStudioA, variant: 'night-press' })
});
