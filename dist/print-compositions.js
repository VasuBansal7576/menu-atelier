import { layoutEditorial } from './print-editorial.js';
const entry=(name,mood,variant)=>Object.freeze({name,mood,variant,layout:layoutEditorial});
export const compositions=Object.freeze({
 trattoria:entry('Carta','A full-width Italian menu with fine rules and a dedicated price lane','trattoria'),
 atelier:entry('Maison','A centered brasserie identity, serif dishes and balanced category columns','atelier'),
 botanical:entry('Gazette','A landscape café menu with three category columns','botanical'),
 midnight:entry('Service','A concise landscape menu with a condensed identity and two columns','midnight')
});
