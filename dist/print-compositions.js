const definition = value => Object.freeze(value);
export const compositions = Object.freeze({
  trattoria: definition({ name: 'Osteria', mood: 'Asymmetric dining sheet', paper: '#fff5df', color: '#ac3528', ink: '#34281f', muted: '#514238', tint: '#f0d5b7', rule: '#d4b89d', titleFont: 'archivo-black', nameFont: 'fraunces-display', sectionFont: 'archivo-black', titleSize: 65, nameSize: 18, sectionSize: 18, margin: 32, gap: 29, identityWidth: .65, art: 'oven', mode: 'featured', itemGap: 24, headingGap: 27, sectionGap: 35 }),
  atelier: definition({ name: 'Herbarium', mood: 'Ink and restaurant paper', paper: '#f7f1e4', color: '#542326', ink: '#3a2d2b', muted: '#65524e', tint: '#ede3d3', rule: '#c7b5a5', titleFont: 'cormorant-semibold', nameFont: 'cormorant-semibold', sectionFont: 'source-sans-semibold', titleSize: 72, nameSize: 20, sectionSize: 13, margin: 38, gap: 36, identityWidth: .59, art: 'tomato-vine-fork', mode: 'balanced', itemGap: 20, headingGap: 23, sectionGap: 32 }),
  botanical: definition({ name: 'Counter', mood: 'Landscape service index', paper: '#f6f7f9', color: '#193baa', ink: '#172b67', muted: '#465778', tint: '#e5eafb', rule: '#b8c4e3', titleFont: 'archivo-black', nameFont: 'source-sans-semibold', sectionFont: 'source-sans-semibold', titleSize: 42, nameSize: 16, sectionSize: 15, margin: 32, gap: 28, identityWidth: .78, art: null, mode: 'index', itemGap: 18, headingGap: 22, sectionGap: 28 }),
  midnight: definition({ name: 'Table cards', mood: 'Small format dining cards', paper: '#fff5df', color: '#ac3528', ink: '#34281f', muted: '#514238', tint: '#f0d5b7', rule: '#d4b89d', titleFont: 'archivo-black', nameFont: 'fraunces-display', sectionFont: 'archivo-black', titleSize: 29, nameSize: 17, sectionSize: 15, margin: 26, gap: 0, identityWidth: 1, art: null, mode: 'cards', itemGap: 20, headingGap: 23, sectionGap: 30 })
});
export function physicalFormat(composition, family) {
  const letter = family === 'letter';
  if (composition.mode === 'cards') return { name: letter ? 'Half Letter' : 'A5', family: letter ? 'letter' : 'a4', width: letter ? 396 : 419.53, height: letter ? 612 : 595.28, unit: 'pt' };
  const [portraitWidth, portraitHeight] = letter ? [612, 792] : [595.28, 841.89];
  const landscape = composition.mode === 'index';
  return { name: `${letter ? 'Letter' : 'A4'}${landscape ? ' landscape' : ''}`, family: letter ? 'letter' : 'a4', width: landscape ? portraitHeight : portraitWidth, height: landscape ? portraitWidth : portraitHeight, unit: 'pt' };
}
export function drawOven(scene, cx, cy, scale, line, color) {
  const path = (points, weight = 1.4) => points.slice(1).forEach((point, index) => line(scene, cx + points[index][0] * scale, cy + points[index][1] * scale, cx + point[0] * scale, cy + point[1] * scale, color, weight * scale));
  const arch = (rx, ry, y, weight) => path(Array.from({ length: 33 }, (_, index) => { const a = Math.PI + index / 32 * Math.PI; return [Math.cos(a) * rx, Math.sin(a) * ry + y]; }), weight);
  arch(78, 65, 31, 2.3); arch(69, 57, 31, 1); arch(49, 42, 31, 2.4); arch(44, 36, 31, 1);
  path([[-78,31],[-78,52],[78,52],[78,31]],2.4); path([[-49,31],[-49,45],[49,45],[49,31]],2);
  for (let i = 1; i < 10; i++) { const a = Math.PI + i / 10 * Math.PI; path([[Math.cos(a)*51,Math.sin(a)*43+31],[Math.cos(a)*76,Math.sin(a)*64+31]],1.1); }
  path([[-81,58],[-33,60],[12,58],[84,60]],2);
  path([[-27,33],[-22,22],[-24,11],[-14,19],[-11,1],[-4,16],[-1,25],[4,32]],2.2);
  path([[7,34],[12,26],[13,12],[20,22],[21,2],[31,17],[28,31]],2.2);
  path([[-30,39],[28,36]],3); path([[-22,43],[34,40]],2); path([[64,65],[49,66],[38,64]],1);
}
