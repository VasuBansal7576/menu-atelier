import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path
from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent
directory = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'outputs' / 'grade'
manifest = json.loads((directory / 'manifest.json').read_text())

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
    missing = [item['name'] for section in menu['sections'] for item in section['items'] if normalized(item['name']) not in flat]
    assert not missing, (entry['filename'], 'missing dish names', missing)
    prices = Counter(item['price'] for section in menu['sections'] for item in section['items'])
    symbol = {'USD': '$', 'GBP': '£', 'EUR': '€', 'INR': '₹', 'JPY': '¥'}[menu['currency']]
    for amount, count in prices.items():
        value = f'{amount:,}' if menu['currency'] == 'JPY' else f'{amount / 100:,.2f}'
        assert flat.count(normalized(symbol + value)) >= count, (entry['filename'], 'missing price', symbol + value, count)
    assert all(embedded_font(font) for page in reader.pages for font in page['/Resources']['/Font'].values()), (entry['filename'], 'font not embedded')
    results.append({'file': entry['filename'] + '.pdf', 'pages': len(reader.pages), 'dishes': entry['dishes'], 'source_names_and_prices': True, 'all_fonts_embedded': True, 'bytes': (directory / (entry['filename'] + '.pdf')).stat().st_size})
receipt = {'pdfs': len(results), 'checks': results}
(directory / 'verification.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
