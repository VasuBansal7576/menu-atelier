import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent
menus = json.loads((root / "sources.json").read_text())
assert len(menus) == 3
menu_ids = set()
checked = 0
for menu in menus:
    assert menu["id"] not in menu_ids
    menu_ids.add(menu["id"])
    assert menu["currency"] in {"GBP", "USD"}
    assert menu["source"]["url"].startswith("https://")
    assert "Unofficial demo excerpt" in menu["source"]["note"]
    assert 2 <= len(menu["sections"]) <= 3
    rows = [item for section in menu["sections"] for item in section["items"]]
    assert 8 <= len(rows) <= 12
    ids = set()
    source = (root / f'{menu["id"]}-extract.md').read_text()
    for item in rows:
        assert item["id"] not in ids
        ids.add(item["id"])
        assert item["name"] and item["description"]
        assert isinstance(item["price"], (float, int))
        assert not isinstance(item["price"], bool)
        assert item["price"] > 0
        assert isinstance(item["tags"], list)
        found = [
            line for line in source.splitlines()
            if item["name"].casefold() in line.casefold()
            and re.search(rf'(?<![0-9.]){item["price"]:.2f}(?![0-9.])', line)
        ]
        assert found, f'No matching price line for {menu["id"]}/{item["id"]}'
        checked += 1
provenance = json.loads((root / "provenance.json").read_text())
assert provenance["sources_reviewed"] == len(set(provenance["reviewedUrls"]))
print(f"PASS: {len(menus)} official menu excerpts, {checked} priced dishes, unique IDs, schema, source price lines, and URL count.")
