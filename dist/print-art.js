const assets = Object.freeze({
  'tomato-vine-fork': Object.freeze({ url: new URL('./art/tomato-vine-fork-original.png', import.meta.url).href, width: 1774, height: 887 })
});
const prepared = new Map();
const preparation = new Map();
export function prepareArt(ids = Object.keys(assets)) {
  return Promise.all(ids.map(id => {
    if (preparation.has(id)) return preparation.get(id);
    const asset = assets[id];
    if (!asset) throw new Error('This menu illustration is unavailable.');
    const pending = (async () => {
      let bytes;
      if (typeof process !== 'undefined' && process.versions?.node) bytes = new Uint8Array(await (await import('node:fs/promises')).readFile(new URL(asset.url)));
      else {
        const response = await fetch(asset.url);
        if (!response.ok) throw new Error('The menu illustration could not load. Reload to try again.');
        bytes = new Uint8Array(await response.arrayBuffer());
      }
      prepared.set(id, Object.freeze({ ...asset, bytes }));
    })().catch(error => { preparation.delete(id); throw error; });
    preparation.set(id, pending);
    return pending;
  }));
}
export function getArt(id) {
  const asset = prepared.get(id) || assets[id];
  if (!asset) throw new Error('This menu illustration is unavailable.');
  return asset;
}
