from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
DIRECTORIES = ["cormorantgaramond", "sourcesans3", "archivoblack", "bebasneue", "fraunces"]
API = "https://api.github.com/repos/google/fonts"


def read_json(url: str):
    request = Request(url, headers={"User-Agent": "MenuAtelier-font-pack", "Accept": "application/vnd.github+json"})
    with urlopen(request, timeout=60) as response:
        return json.load(response)


def main():
    source_root = ROOT / "sources"
    source_root.mkdir(exist_ok=True)
    revision = read_json(f"{API}/commits/main")["sha"]
    provenance = {"repository": "https://github.com/google/fonts", "revision": revision, "families": {}}
    inventories = {}
    for directory in DIRECTORIES:
        url = f"{API}/contents/ofl/{directory}?ref={revision}"
        inventory = read_json(url)
        (source_root / f"{directory}-api.json").write_text(json.dumps(inventory, indent=2) + "\n")
        inventories[directory] = inventory
        print(directory, [item["name"] for item in inventory], flush=True)
    for directory, inventory in inventories.items():
        destination = source_root / directory
        destination.mkdir(exist_ok=True)
        family = {"inventory_url": f"{API}/contents/ofl/{directory}?ref={revision}", "files": []}
        for item in inventory:
            if not (item["name"].endswith(".ttf") or item["name"] in {"OFL.txt", "METADATA.pb", "upstream_info.md"}):
                continue
            blob = read_json(item["git_url"])
            payload = base64.b64decode(blob["content"])
            git_sha = hashlib.sha1(b"blob " + str(len(payload)).encode() + b"\0" + payload).hexdigest()
            if git_sha != item["sha"]:
                raise ValueError(f"Git blob integrity mismatch for {item['name']}")
            local_path = destination / item["name"]
            local_path.write_bytes(payload)
            family["files"].append({
                "name": item["name"], "path": str(local_path.relative_to(ROOT)),
                "source_url": item["download_url"], "blob_url": item["git_url"],
                "git_blob_sha": item["sha"], "sha256": hashlib.sha256(payload).hexdigest(),
                "bytes": len(payload),
            })
        provenance["families"][directory] = family
    (ROOT / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
    print(f"Saved official Google Fonts sources at {revision}.")


if __name__ == "__main__":
    main()
