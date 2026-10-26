# Rebuild the menu font pack

The `sources/` directory contains official source fonts, exact GitHub inventories, metadata and OFL notices. `provenance.json` pins Google Fonts revision `e7db6ca603fd4862010383ff17ffd6cc4ffac1c0` and source hashes. The installed application uses renamed static derivatives in `dist/fonts/`.

Use Python3.10 or later in an isolated environment. Install the versions in `requirements.txt`, then run from this directory.

```sh
python build.py
python verify.py
node sync.mjs
```

`build.py` pins variable axes and subsets available Latin, punctuation and currency glyphs. It preserves layout tables and embedding rights. Every derivative has a MenuAtelier family and PostScript name. `verify.py` checks static outlines, font identities, source hashes, required glyphs and byte-identical rebuilding. `sync.mjs` copies the verified outputs and their licenses to the application directory and adjusts relative paths.

Source Sans3 supplies readable body text and controls. Cormorant Garamond supplies Maison's display and italic text. Archivo Black supplies Edition's headline. Fraunces650 at optical size72 supplies Mercato's poster type. Bebas Neue supplies Broadside's condensed headlines. The manifest lists all seven files, their exact weights, styles and SHA256 hashes.

Archivo Black's official source omits ₹. Prices use Source Sans3 or Cormorant, which include that glyph. Display strings with missing glyphs use Source Sans3 when it covers the whole string. Uncovered scripts fail preflight rather than being transliterated or replaced. This collection supports Latin text and does not support Devanagari, CJK or emoji.

The runtime layout engine measures TTF bytes with fontkit. Browser FontFace and PDF embedding receive those same TTF bytes. The WOFF2 copies make editor text available from CSS. Both encodings retain the same static outlines and cmap. OFL notices accompany each redistributed family in `dist/fonts/licenses/`.
