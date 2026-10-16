import test from 'node:test';
import assert from 'node:assert/strict';
import { getSkillAreaRadius } from '../src/skill-area.js';

test('AOE uses a linear meter scale rather than applying the ratio twice', () => {
  const skill = { aoe: 300, spread: 300 / 16, shape: 'bloodChainNet' };
  assert.equal(getSkillAreaRadius(skill, 120), 7.5);
  assert.equal(getSkillAreaRadius(skill, 350), 21.875);
});

test('water respects its world-unit cap and invalid settings fall back safely', () => {
  const skill = { aoe: 300, spread: 300 / 16, shape: 'oceanDominion',
    oceanDominion: { worldUnitsPerMeter: 16, tide: { maxRadius: 270 } } };
  assert.equal(getSkillAreaRadius(skill, 350), 270 / 16);
  assert.equal(getSkillAreaRadius(skill, NaN), 270 / 16);
  assert.equal(getSkillAreaRadius(skill, 120), 7.5);
});
