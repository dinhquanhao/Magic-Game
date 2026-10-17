"""Original geometric SVG symbols, one per existing element. No font dependency."""
from pathlib import Path

SHAPES = {
    'FIRE': '<path d="M16 3c2 7 8 8 8 15a8 8 0 0 1-16 0c0-4 3-7 5-9-1 5 2 5 3 7 3-4 1-8 0-13Z"/>',
    'WATER': '<path d="M16 3C12 10 6 15 6 21a10 10 0 0 0 20 0C26 15 20 10 16 3Z"/><path d="M10 21q1 5 6 5"/>',
    'EARTH': '<path d="m3 26 8-16 5 7 5-12 8 21Z M11 10l2 16 M21 5l-2 21"/>',
    'LIGHT': '<circle cx="16" cy="16" r="6"/><path d="M16 2v5m0 18v5M2 16h5m18 0h5M6 6l4 4m12 12 4 4M6 26l4-4M22 10l4-4"/>',
    'SHADOW': '<path d="M22 3a13 13 0 1 0 7 21A12 12 0 0 1 22 3Z"/><path d="m6 15 4 1m2 8 2-3"/>',
    'WIND': '<path d="M3 11h18q8 0 5-6-3-4-6 0M3 17h23M4 23h14q7 0 5 5-2 3-5 0"/>',
    'LIGHTNING': '<path d="M18 2 5 19h10l-1 11L28 12H17Z"/>',
    'ICE': '<path d="M16 2v28M4 9l24 14M4 23 28 9M11 5l5 4 5-4M11 27l5-4 5 4M4 15l6-3-1-6M28 17l-6 3 1 6"/>',
    'MAGMA': '<path d="m3 28 9-20h8l9 20ZM12 8l2 8-3 5m9-13-2 9 5 4M9 4l-2-2m18 2 2-2M16 3V1"/>',
    'POISON': '<path d="M11 3h10m-8 0v10L4 26q-1 3 3 3h18q4 0 3-3l-9-13V3M8 21h16"/><circle cx="14" cy="18" r="1"/><circle cx="19" cy="25" r="1"/>',
    'SPACE': '<ellipse cx="16" cy="16" rx="14" ry="5" transform="rotate(-30 16 16)"/><ellipse cx="16" cy="16" rx="14" ry="5" transform="rotate(60 16 16)"/><circle cx="16" cy="16" r="4"/>',
    'TIME': '<path d="M7 3h18M7 29h18M9 3v5l14 16v5M23 3v5L9 24v5M12 24h8M12 8h8"/>',
    'BLOOD': '<path d="M16 3C13 10 8 14 8 20a8 8 0 0 0 16 0C24 14 19 10 16 3Z M3 11l4 4m18 0 4-4M2 22h3m22 0h3"/>',
    'ASTRAL': '<path d="m16 2 4 10 10 4-10 4-4 10-4-10-10-4 10-4ZM25 3v6m-3-3h6M5 25v5m-2-3h5"/>',
    'NATURE': '<path d="M16 29V12M16 20C5 20 3 12 4 5c9 0 14 4 12 15ZM16 15C16 6 23 3 29 4c0 9-4 14-13 11Z"/><path d="m7 9 9 11m9-12-9 7M10 28l6-4 6 4"/>',
}
ROOT = Path(__file__).resolve().parents[1]
out = ROOT / 'public/assets/ui/elements.svg'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text('<svg xmlns="http://www.w3.org/2000/svg">\n' + '\n'.join(
    f'<symbol id="{name.lower()}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{shape}</symbol>'
    for name, shape in SHAPES.items()) + '\n</svg>\n')
print('Generated 15 reusable element symbols.')
