import test from 'node:test';
import assert from 'node:assert/strict';
import { RUNE_RELEASE_FADE_SECONDS, runeReleaseAge, runeReleaseFade } from '../src/rune-fade.js';

test('runes wait for a visible effect, including delayed skills and empty placeholder roots', () => {
  const cast = { root: { visible: true, children: [] }, attack: { group: { visible: false } } };
  assert.equal(runeReleaseAge(cast, .1), null);
  assert.equal(runeReleaseAge(cast, 1.8), null);
  cast.attack.group.visible = true;
  assert.equal(runeReleaseAge(cast, 1.9), 0);
  assert.equal(cast.runeFadeStartedAt, 1.9);
  assert.ok(Math.abs(runeReleaseAge(cast, 2.8) - .9) < 1e-12);
  cast.attack.group.visible = false;
  assert.equal(runeReleaseAge(cast, 3.9), 2);
});

test('release has no opacity jump, fades smoothly to zero, and never reappears late', () => {
  assert.equal(runeReleaseFade(null), 0);
  assert.equal(runeReleaseFade(0), 0);
  assert.equal(runeReleaseFade(-1), 0);
  assert.equal(runeReleaseFade(RUNE_RELEASE_FADE_SECONDS / 2), .5);
  assert.equal(runeReleaseFade(RUNE_RELEASE_FADE_SECONDS), 1);
  assert.equal(runeReleaseFade(12), 1);
  assert.equal(runeReleaseFade(NaN), 1);
  let previous = 0;
  for (let age = 0; age <= 3; age += .01) {
    const fade = runeReleaseFade(age);
    assert.ok(fade >= previous && fade <= 1);
    previous = fade;
  }
});

test('pause reuses simulation age and each cast starts with independent visibility', () => {
  const first = { root: { visible: true, children: [{}] } };
  assert.equal(runeReleaseAge(first, .05), 0);
  const paused = runeReleaseAge(first, .65);
  assert.equal(runeReleaseAge(first, .65), paused);
  const second = { root: { visible: true, children: [{}] } };
  assert.equal(runeReleaseAge(second, .05), 0);
  assert.equal(runeReleaseFade(runeReleaseAge(first, 9)), 1);
  assert.equal(runeReleaseFade(runeReleaseAge(second, .05)), 0);
});
