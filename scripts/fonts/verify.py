from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parent


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    manifest_path = ROOT / "manifest.json"
    original_manifest = manifest_path.read_bytes()
    manifest = json.loads(original_manifest)
    before = {face[extension + "_path"]: digest(ROOT / face[extension + "_path"])
              for face in manifest["faces"] for extension in ["ttf", "woff2"]}
    subprocess.run([sys.executable, str(ROOT / "build.py")], check=True)
    assert manifest_path.read_bytes() == original_manifest, "The manifest must rebuild byte-for-byte."
    assert all(digest(ROOT / path) == expected for path, expected in before.items()), "Font output must rebuild byte-for-byte."
    receipts = []
    for face in manifest["faces"]:
        license_text = (ROOT / face["license_path"]).read_text()
        assert "SIL OPEN FONT LICENSE Version 1.1" in license_text
        font_cmaps = []
        versions = []
        for extension in ["ttf", "woff2"]:
            path = ROOT / face[extension + "_path"]
            assert digest(path) == face["sha256"][extension]
            font = TTFont(path, checkChecksums=2, recalcTimestamp=False)
            assert "glyf" in font and "cmap" in font and "name" in font
            assert not {"fvar", "gvar", "avar", "HVAR", "MVAR"}.intersection(font.keys())
            assert font["OS/2"].usWeightClass == face["weight"]
            assert font["OS/2"].fsType == 0, "Embedding must be unrestricted."
            for record in font["name"].names:
                if record.nameID in {1, 3, 4, 6, 16, 18}:
                    assert record.toUnicode().startswith("MenuAtelier"), record.toUnicode()
            cmap = font.getBestCmap()
            font_cmaps.append(cmap)
            glyph_set = font.getGlyphSet()
            for character, expected in face["required_glyphs"].items():
                assert (ord(character) in cmap) == expected
                if expected:
                    pen = BoundsPen(glyph_set)
                    glyph_set[cmap[ord(character)]].draw(pen)
                    assert pen.bounds is not None, f"Empty outline for {character} in {path}"
            assert set(face["layout_tables"]).issubset(font.keys())
            versions.append({"format": extension, "path": face[extension + "_path"],
                             "bytes": path.stat().st_size, "sha256": digest(path), "embedding_fsType": font["OS/2"].fsType})
            font.close()
        assert font_cmaps[0] == font_cmaps[1], "Both output formats must encode the same glyphs."
        receipts.append({"key": face["key"], "family": face["family"], "weight": face["weight"], "style": face["style"],
                         "required_glyphs": face["required_glyphs"], "encoded_codepoints": len(font_cmaps[0]),
                         "layout_tables": face["layout_tables"], "outputs": versions})
    receipt = {"result": "pass", "source_revision": manifest["source_revision"], "rebuild_byte_identical": True,
               "font_pairs": len(receipts), "checks": ["OFL-1.1 licenses", "source hashes", "static outlines", "renamed identities",
                                                         "unrestricted embedding", "matching TTF and WOFF2 cmaps",
                                                         "required glyph outlines", "retained layout tables"], "faces": receipts,
               "limitations": manifest["limitations"]}
    (ROOT / "verification.json").write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"result": "pass", "font_pairs": len(receipts), "rebuild_byte_identical": True,
                      "archivo_rupee_fallback": "source-sans-semibold"}, indent=2))


if __name__ == "__main__":
    main()
