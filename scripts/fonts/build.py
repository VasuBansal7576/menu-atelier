from __future__ import annotations

import hashlib
import json
from pathlib import Path

import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


ROOT = Path(__file__).resolve().parent
RANGES = [(0x0000, 0x024F), (0x1E00, 0x1EFF), (0x2000, 0x206F), (0x20A0, 0x20CF),
          (0x2100, 0x214F), (0x2190, 0x21FF), (0x2200, 0x22FF), (0x25A0, 0x25FF)]
UNICODES = {point for start, end in RANGES for point in range(start, end + 1)}
SPECS = [
    {"key": "cormorant-semibold", "directory": "cormorantgaramond", "source": "CormorantGaramond[wght].ttf",
     "original_family": "Cormorant Garamond", "weight": 600, "style": "normal", "subfamily": "SemiBold", "axes": {"wght": 600}},
    {"key": "cormorant-medium-italic", "directory": "cormorantgaramond", "source": "CormorantGaramond-Italic[wght].ttf",
     "original_family": "Cormorant Garamond", "weight": 500, "style": "italic", "subfamily": "Medium Italic", "axes": {"wght": 500}},
    {"key": "source-sans-regular", "directory": "sourcesans3", "source": "SourceSans3[wght].ttf",
     "original_family": "Source Sans 3", "weight": 400, "style": "normal", "subfamily": "Regular", "axes": {"wght": 400}},
    {"key": "source-sans-semibold", "directory": "sourcesans3", "source": "SourceSans3[wght].ttf",
     "original_family": "Source Sans 3", "weight": 600, "style": "normal", "subfamily": "SemiBold", "axes": {"wght": 600}},
    {"key": "archivo-black", "directory": "archivoblack", "source": "ArchivoBlack-Regular.ttf",
     "original_family": "Archivo Black", "weight": 400, "style": "normal", "subfamily": "Regular", "axes": {}},
    {"key": "bebas-neue", "directory": "bebasneue", "source": "BebasNeue-Regular.ttf",
     "original_family": "Bebas Neue", "weight": 400, "style": "normal", "subfamily": "Regular", "axes": {}},
    {"key": "fraunces-display", "directory": "fraunces", "source": "Fraunces[SOFT,WONK,opsz,wght].ttf",
     "original_family": "Fraunces", "weight": 650, "style": "normal", "subfamily": "SemiBold",
     "axes": {"wght": 650, "opsz": 72, "SOFT": 0, "WONK": 1}},
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rename(font: TTFont, spec: dict, source_hash: str) -> tuple[str, str]:
    family = f"MenuAtelier {spec['original_family']}"
    subfamily = spec["subfamily"]
    postscript = f"MenuAtelier-{spec['original_family'].replace(' ', '')}-{subfamily.replace(' ', '')}"
    legacy_family = family if subfamily in {"Regular", "Italic"} else f"{family} {subfamily.replace(' Italic', '')}"
    legacy_style = "Italic" if spec["style"] == "italic" else "Regular"
    full_name = f"{family} {subfamily}"
    records = {
        1: legacy_family, 2: legacy_style, 3: f"MenuAtelier:{spec['key']}:{source_hash[:16]}",
        4: full_name, 6: postscript, 16: family, 17: subfamily, 18: full_name,
    }
    font["name"].names = [record for record in font["name"].names if record.nameID not in {*records, 21, 22, 25}]
    for name_id, value in records.items():
        font["name"].setName(value, name_id, 3, 1, 0x409)
        font["name"].setName(value, name_id, 1, 0, 0)
    return family, postscript


def main():
    provenance = json.loads((ROOT / "provenance.json").read_text())
    output = ROOT / "fonts"
    output.mkdir(exist_ok=True)
    faces = []
    for spec in SPECS:
        source_files = provenance["families"][spec["directory"]]["files"]
        source_record = next(record for record in source_files if record["name"] == spec["source"])
        source = ROOT / source_record["path"]
        if sha256(source) != source_record["sha256"]:
            raise ValueError(f"Source integrity mismatch for {source}")
        font = TTFont(source, recalcTimestamp=False)
        modified = font["head"].modified
        if spec["axes"]:
            available_axes = {axis.axisTag for axis in font["fvar"].axes}
            if available_axes != set(spec["axes"]):
                raise ValueError(f"Every variable axis must be pinned for {spec['key']}")
            font = instantiateVariableFont(font, spec["axes"], inplace=True, optimize=True)
        family, postscript = rename(font, spec, source_record["sha256"])
        font["OS/2"].usWeightClass = spec["weight"]
        options = subset.Options()
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.name_legacy = True
        options.name_languages = ["*"]
        options.glyph_names = True
        options.notdef_glyph = True
        options.notdef_outline = True
        options.recommended_glyphs = True
        options.recalc_average_width = True
        options.recalc_max_context = True
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=UNICODES)
        subsetter.subset(font)
        font["head"].modified = modified
        font.recalcTimestamp = False
        paths = {}
        hashes = {}
        sizes = {}
        for extension, flavor in [("ttf", None), ("woff2", "woff2")]:
            destination = output / f"{postscript}.{extension}"
            font.flavor = flavor
            font.save(destination, reorderTables=True)
            paths[extension] = str(destination.relative_to(ROOT))
            hashes[extension] = sha256(destination)
            sizes[extension] = destination.stat().st_size
        cmap = font.getBestCmap()
        mandatory = {character: ord(character) in cmap for character in "£€₹œ"}
        missing = [character for character, present in mandatory.items() if not present]
        if missing and not (spec["key"] == "archivo-black" and missing == ["₹"]):
            raise ValueError(f"Unexpected required glyph gap in {spec['key']}: {missing}")
        face = {
            "key": spec["key"], "family": family, "original_family": spec["original_family"],
            "postscript_name": postscript, "weight": spec["weight"], "style": spec["style"],
            "ttf_path": paths["ttf"], "woff2_path": paths["woff2"],
            "source_url": source_record["source_url"], "source_blob_url": source_record["blob_url"],
            "source_sha256": source_record["sha256"], "source_git_blob_sha": source_record["git_blob_sha"],
            "license_path": f"sources/{spec['directory']}/OFL.txt", "license": "OFL-1.1",
            "static_transform": {"axes": spec["axes"], "subset_ranges": [f"U+{a:04X}-{b:04X}" for a, b in RANGES],
                                 "renamed_family": family, "retained_layout_features": "all", "hinting": "retained"},
            "bytes": sizes, "sha256": hashes, "encoded_codepoints": len(cmap),
            "glyphs": len(font.getGlyphOrder()), "required_glyphs": mandatory,
            "layout_tables": [table for table in ["GDEF", "GPOS", "GSUB", "kern"] if table in font],
        }
        if missing:
            face["fallbacks"] = {"₹": "source-sans-semibold"}
            face["limitation"] = "The official Archivo Black source lacks U+20B9. Use Source Sans 3 Semibold for rupee prices."
        faces.append(face)
        font.close()
    manifest = {"schema_version": 1, "source_repository": provenance["repository"], "source_revision": provenance["revision"],
                "fonttools_version": fontTools.__version__, "faces": faces,
                "limitations": ["The subset retains the supported source glyphs within the stated Unicode ranges, not every codepoint in those ranges.",
                                "This Latin pack omits Devanagari and other non-Latin scripts.",
                                "Archivo Black requires the recorded Source Sans 3 fallback for the rupee symbol."]}
    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"faces": len(faces), "ttf_bytes": sum(face["bytes"]["ttf"] for face in faces),
                      "woff2_bytes": sum(face["bytes"]["woff2"] for face in faces)}, indent=2))


if __name__ == "__main__":
    main()
