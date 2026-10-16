"""Deterministic, original synthesis. No samples or external audio services.

Requires numpy (only for rebuilding assets, never at runtime).
Run: python scripts/generate_audio.py
"""
import hashlib
import json
from pathlib import Path
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/audio'
RATE = 24000
PROFILES = [
    ('FIRE', 91, 'crackle', 'Crackling flame and descending heat'),
    ('WATER', 173, 'bubble', 'Bubbles and a broad surf tail'),
    ('EARTH', 53, 'stone', 'Low stone fracture and granular rumble'),
    ('LIGHT', 523, 'bell', 'Clear harmonic bells'),
    ('SHADOW', 63, 'void', 'Dark detuned downward resonance'),
    ('WIND', 211, 'air', 'Filtered air and swirling gusts'),
    ('LIGHTNING', 137, 'electric', 'Short electrical arcs and bright crackle'),
    ('ICE', 659, 'crystal', 'Brittle inharmonic crystal'),
    ('MAGMA', 47, 'lava', 'Slow low bubbles and rolling heat'),
    ('POISON', 127, 'acid', 'Resonant bubbling and acid fizz'),
    ('SPACE', 83, 'warp', 'Detuned frequency-modulated warp'),
    ('TIME', 293, 'clock', 'Tick pulses with a reverse swell'),
    ('BLOOD', 109, 'metal', 'Tension and inharmonic chain resonance'),
    ('ASTRAL', 440, 'stars', 'Wide harmonic shimmer'),
    ('PSYCHIC', 197, 'mind', 'Beating tones and nervous modulation'),
]
CUES = {'precast': (.32, False), 'charging': (1.0, True),
        'casting': (.42, False), 'traveling': (1.0, True),
        'impact': (1.4, False), 'shockwave': (1.1, False),
        'aftermath': (1.8, False)}


def synth(index, cue, duration, loop):
    _, base, kind, _ = PROFILES[index]
    rng = np.random.default_rng(7300 + index * 101 + list(CUES).index(cue))
    n = round(RATE * duration)
    t = np.arange(n) / RATE
    # FFT noise is periodic, so the two loop boundaries share the same field.
    freq = np.fft.rfftfreq(n, 1 / RATE)
    white = rng.normal(size=len(freq)) + 1j * rng.normal(size=len(freq))
    cutoff = {'stone': 600, 'void': 450, 'lava': 800, 'air': 2200}.get(kind, 6000)
    noise = np.fft.irfft(white / np.sqrt(1 + (freq / cutoff) ** 6), n=n)
    noise /= max(1e-9, np.std(noise))
    noise *= .18
    pitch = {'precast': 1.6, 'charging': 1., 'casting': 1.3,
             'traveling': 1.15, 'impact': .65, 'shockwave': .45, 'aftermath': .85}[cue]
    f = base * pitch
    if loop:
        f = round(f * duration) / duration
    def tone(ratio=1, modulation=0):
        frequency = round(f * ratio * duration) / duration if loop else f * ratio
        mod_freq = 3 if loop else 3.1
        return np.sin(2 * np.pi * frequency * t + modulation * np.sin(2 * np.pi * mod_freq * t))
    pulse = (np.maximum(0, np.sin(2 * np.pi * (11 if loop else 11.7) * t))) ** 16
    if kind == 'crackle':
        x = noise * (.4 + 3 * pulse) + .28 * tone(1, 2) + .15 * tone(.5)
    elif kind == 'bubble':
        x = .4 * tone(1, 5) * (.25 + .75 * pulse) + noise * .7 + .15 * tone(2, 3)
    elif kind == 'stone':
        x = .55 * tone(1, .3) + .28 * tone(1.47) + noise * (1 + 2 * pulse)
    elif kind == 'bell':
        x = .52 * tone() + .23 * tone(2) + .12 * tone(3) + noise * .12
    elif kind == 'void':
        x = .45 * tone(1, 2.3) + .3 * tone(1.07) + noise * .3
    elif kind == 'air':
        x = noise * (1.5 + .65 * np.sin(2 * np.pi * 2 * t)) + .09 * tone(2, 1)
    elif kind == 'electric':
        x = noise * (.5 + 4 * pulse) + .25 * np.tanh(4 * tone(3, 5))
    elif kind == 'crystal':
        x = .5 * tone() + .27 * tone(2.71) + .16 * tone(4.13) + noise * pulse
    elif kind == 'lava':
        x = .6 * tone(1, 1) + noise + .3 * tone(2, 6) * pulse
    elif kind == 'acid':
        x = .4 * tone(1, 7) * (.3 + pulse) + .25 * tone(3.1, 3) + noise * 1.2
    elif kind == 'warp':
        x = .5 * tone(1, 4) + .24 * tone(1.07, 6) + .14 * tone(2.91)
    elif kind == 'clock':
        x = .4 * tone(3) * pulse + noise * pulse * 2 + .25 * tone(1, 1)
    elif kind == 'metal':
        x = .35 * tone() + .25 * tone(2.43) + .19 * tone(3.82) + noise * pulse * 1.6
    elif kind == 'stars':
        x = .35 * tone() + .25 * tone(1.5) + .18 * tone(2) + .12 * tone(4)
    else:
        x = .4 * tone(1, 3) + .32 * tone(1.03, 2) + .15 * tone(2.5, 5)
    if loop:
        # A 3 ms boundary taper also protects bright, steep waveforms whose
        # adjacent PCM samples can differ sharply despite mathematical periodicity.
        edge = np.minimum(1, np.minimum(t, duration - t) / .003)
        x *= np.sin(edge * np.pi / 2) ** 2
    else:
        u = t / duration
        if cue == 'precast':
            envelope = np.sin(np.pi * u) ** 1.3
        elif cue == 'casting':
            envelope = np.sin(np.pi * u) ** .7
        elif cue == 'impact':
            envelope = np.exp(-5 * u)
            x += .4 * np.sin(2 * np.pi * (65 * t - 16 * t * t)) * np.exp(-9 * u)
        elif cue == 'shockwave':
            envelope = (1 - u) ** 2
            x = .5 * x + noise * (1 - u)
        else:
            envelope = np.sin(np.pi * u) * np.exp(-2 * u)
        # 8 ms attack and 20 ms tail prevent one-shot discontinuities.
        envelope *= np.minimum(1, t / .008) * np.minimum(1, (duration - t) / .02)
        x *= envelope
    x -= np.mean(x)
    x *= .62 / max(1e-9, np.max(np.abs(x)))
    return x


def write_wav(path, signal):
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.round(signal * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(RATE); f.writeframes(pcm.tobytes())
    return {'url': '/' + str(path.relative_to(ROOT / 'public')),
            'duration': len(pcm) / RATE, 'peak': round(float(np.max(np.abs(pcm.astype(float)))) / 32768, 6),
            'rms': round(float(np.sqrt(np.mean((pcm.astype(float) / 32768) ** 2))), 6),
            'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    manifest = {'version': 1, 'sampleRate': RATE, 'channels': 1,
                'provenance': 'Original deterministic mathematical synthesis; no recordings, samples, models or paid services.',
                'elements': {}}
    for i, (element, base, kind, description) in enumerate(PROFILES):
        entry = {'baseFrequency': base, 'identity': description, 'cues': {}}
        for cue, (duration, loop) in CUES.items():
            entry['cues'][cue] = {**write_wav(OUT / 'spells' / element.lower() / f'{cue}.wav', synth(i, cue, duration, loop)), 'loop': loop}
        manifest['elements'][element] = entry
    # One quiet ambience supports the existing open training arena.
    n = RATE * 4; t = np.arange(n) / RATE
    rng = np.random.default_rng(991)
    frequencies = np.fft.rfftfreq(n, 1 / RATE)
    air = np.fft.irfft((rng.normal(size=len(frequencies)) + 1j * rng.normal(size=len(frequencies))) / (1 + (frequencies / 900) ** 2), n=n)
    air *= .22 / np.max(np.abs(air)); air -= air.mean()
    manifest['ambient'] = {**write_wav(OUT / 'arena-air.wav', air), 'loop': True}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Generated {len(PROFILES) * len(CUES) + 1} non-empty WAV files and manifest.')


if __name__ == '__main__':
    main()
