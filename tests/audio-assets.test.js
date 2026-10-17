import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CueTimeline} from '../src/audio/spell-audio.js';

const manifest = JSON.parse(readFileSync(new URL('../public/assets/audio/manifest.json', import.meta.url)));
assert.equal(Object.keys(manifest.elements).length, 15);
const hashes = new Set();
for (const element of Object.values(manifest.elements)) {
  assert.equal(Object.keys(element.cues).length, 7);
  for (const cue of Object.values(element.cues)) {
    const wav = readFileSync(new URL('../public' + cue.url, import.meta.url));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.readUInt16LE(20), 1); // PCM
    assert.equal(wav.readUInt16LE(22), 1);
    assert.equal(wav.readUInt32LE(24), 24000);
    assert.equal(wav.readUInt16LE(34), 16);
    assert.equal((wav.length - 44) / 48000, cue.duration);
    assert.equal(createHash('sha256').update(wav).digest('hex'), cue.sha256);
    let sum = 0, square = 0, peak = 0;
    for (let i = 44; i < wav.length; i += 2) {
      const sample = wav.readInt16LE(i) / 32768;
      sum += sample; square += sample * sample; peak = Math.max(peak, Math.abs(sample));
    }
    const count = (wav.length - 44) / 2;
    assert.ok(peak > .1 && peak < .7, `peak ${peak}`);
    assert.ok(Math.sqrt(square / count) > .025, 'silent cue');
    assert.ok(Math.abs(sum / count) < .001, 'DC bias');
    if (cue.loop) assert.ok(Math.abs(wav.readInt16LE(44) - wav.readInt16LE(wav.length - 2)) / 32768 < .2, 'loop discontinuity');
    assert.ok(!hashes.has(cue.sha256), 'duplicate element audio');
    hashes.add(cue.sha256);
  }
}

const timeline = new CueTimeline();
const frame = {id: 'cast-1', phase: 'charging', time: 0, impact: 2};
assert.deepEqual(timeline.update(frame), {events: ['precast'], loops: ['charging']});
assert.deepEqual(timeline.update(frame).events, []);
assert.deepEqual(timeline.update({...frame, phase: 'channeling'}).events, []);
assert.deepEqual(timeline.update({...frame, phase: 'active', time: 0}).events, ['casting']);
assert.deepEqual(timeline.update({...frame, phase: 'active', time: 2.1}).events, ['impact']);
assert.deepEqual(timeline.update({...frame, phase: 'active', time: 2.6}).events, ['shockwave', 'aftermath']);
assert.deepEqual(timeline.update({...frame, phase: 'active', time: 2.6}).events, []);
assert.deepEqual(timeline.update({...frame, id: 'late', phase: 'active', time: 8}, true).events, []);
assert.deepEqual(timeline.update(null), {events: [], loops: []});
