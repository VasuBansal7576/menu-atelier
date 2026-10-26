import json
import re
import struct
import sys
import unicodedata
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent
directory = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'outputs' / 'grade'
manifest = json.loads((directory / 'manifest.json').read_text())

class GalleryParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cards = []
        self.images = []
        self.links = []
        self.filters = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'article':
            self.cards.append(attrs)
        if tag == 'img':
            self.images.append(attrs)
        if tag == 'a':
            self.links.append(attrs.get('href', ''))
        if tag == 'button' and 'data-filter' in attrs:
            self.filters[attrs['data-filter']] = attrs.get('aria-pressed')

gallery_html = (directory / 'index.html').read_text()
gallery = GalleryParser()
gallery.feed(gallery_html)
assert len(manifest) == len(gallery.cards) == 12, 'Expected all twelve exports'
assert gallery.filters == {'curated': 'true', 'all': 'false', 'trattoria': 'false', 'atelier': 'false', 'botanical': 'false', 'midnight': 'false'}, gallery.filters
selected = [card for card in gallery.cards if 'hidden' not in card]
assert [card['data-design'] for card in selected] == ['trattoria', 'atelier', 'botanical'], selected
assert all(card['data-curated'] == 'true' for card in selected), selected
assert [(entry['menuId'], entry['templateId']) for entry in sorted(manifest, key=lambda entry: entry['curatedOrder'] or 99)[:3]] == [('pizzeria-bianco', 'trattoria'), ('balthazar', 'atelier'), ('dishoom', 'botanical')]
assert all(not image['src'].endswith('.svg') for image in gallery.images), 'PDF raster images required'
assert not re.search(r'/Users/|/private/|file://|api[_-]?key|access[_-]?token', gallery_html + json.dumps(manifest), re.I), 'Public gallery contains local paths or secrets'
assert 'April 2023' in gallery_html and 'not affiliated with or endorsed' in gallery_html
expected_images = {}

def normalized(value):
    return ''.join(unicodedata.normalize('NFC', value).casefold().split())

def embedded_font(font):
    font = font.get_object()
    if '/DescendantFonts' in font:
        return all(embedded_font(child) for child in font['/DescendantFonts'])
    descriptor = font.get('/FontDescriptor')
    return descriptor is not None and any(key in descriptor.get_object() for key in ('/FontFile', '/FontFile2', '/FontFile3'))

results = []
for entry in manifest:
    snapshot = json.loads((directory / (entry['filename'] + '.json')).read_text())
    menu = snapshot['menu']
    reader = PdfReader(directory / (entry['filename'] + '.pdf'))
    text = '\n'.join(page.extract_text() or '' for page in reader.pages)
    flat = normalized(text)
    assert len(reader.pages) == entry['pages'], entry['filename']
    assert len(entry['pageImages']) == entry['pages'], entry['filename']
    for number, (page, image) in enumerate(zip(reader.pages, entry['pageImages']), start=1):
        assert image['number'] == number, (entry['filename'], 'page order')
        png = directory / image['png']
        assert png.is_relative_to(directory / 'pages'), (entry['filename'], 'page raster path')
        header = png.read_bytes()[:24]
        assert header[:8] == b'\x89PNG\r\n\x1a\n' and header[12:16] == b'IHDR', png
        pixels = struct.unpack('>II', header[16:24])
        assert pixels == (image['pixelWidth'], image['pixelHeight']), (png, 'raster dimensions')
        width, height = float(page.mediabox.width), float(page.mediabox.height)
        assert abs(width - image['width']) < .02 and abs(height - image['height']) < .02, (png, 'PDF dimensions')
        assert abs(pixels[0] / pixels[1] - width / height) < .003, (png, 'raster aspect ratio')
        assert max(pixels) == 1100, (png, 'raster resolution')
        expected_images[image['png']] = image
        assert f"{entry['filename']}.pdf#page={number}" in gallery.links, (png, 'missing PDF page link')
    assert (directory / (entry['filename'] + '.png')).read_bytes() == (directory / entry['pageImages'][0]['png']).read_bytes(), (entry['filename'], 'root thumbnail differs')
    assert entry['filename'] + '.json' in gallery.links and entry['source'] in gallery.links, (entry['filename'], 'backup/source link')
    missing = [item['name'] for section in menu['sections'] for item in section['items'] if normalized(item['name']) not in flat]
    assert not missing, (entry['filename'], 'missing dish names', missing)
    prices = Counter(item['price'] for section in menu['sections'] for item in section['items'])
    symbol = {'USD': '$', 'GBP': '£', 'EUR': '€', 'INR': '₹', 'JPY': '¥'}[menu['currency']]
    for amount, count in prices.items():
        value = f'{amount:,}' if menu['currency'] == 'JPY' else f'{amount / 100:,.2f}'
        assert flat.count(normalized(symbol + value)) >= count, (entry['filename'], 'missing price', symbol + value, count)
    assert all(embedded_font(font) for page in reader.pages for font in page['/Resources']['/Font'].values()), (entry['filename'], 'font not embedded')
    results.append({'file': entry['filename'] + '.pdf', 'format': entry['format'], 'pages': len(reader.pages), 'dishes': entry['dishes'], 'all_page_rasters_and_links': True, 'source_names_and_prices': True, 'all_fonts_embedded': True, 'bytes': (directory / (entry['filename'] + '.pdf')).stat().st_size})
assert len(gallery.images) == len(expected_images), 'Gallery must show every actual PDF page'
for image in gallery.images:
    expected = expected_images[image['src']]
    assert (int(image['width']), int(image['height'])) == (expected['pixelWidth'], expected['pixelHeight']), image
assert {str(path.relative_to(directory)) for path in (directory / 'pages').rglob('*.png')} == set(expected_images), 'Stale or missing page rasters'
published = root / 'dist' / 'grading'
if directory.resolve() == (root / 'outputs' / 'grade').resolve() and published.exists():
    public_exports = [directory / (entry['filename'] + extension) for entry in manifest for extension in ('.pdf', '.json', '.png')]
    for path in [directory / 'index.html', directory / 'manifest.json', *public_exports, *[directory / name for name in expected_images]]:
        assert path.read_bytes() == (published / path.relative_to(directory)).read_bytes(), (path, 'published file differs')
receipt = {'pdfs': len(results), 'pages': len(expected_images), 'gallery_curated_default': True, 'gallery_all_exports_available': True, 'checks': results}
(directory / 'verification.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
