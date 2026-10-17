import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { buildSkillScore } from '../src/audio/score.js';

// Captured from the pre-edit browser, including config, camera cadence, rune
// geometry profile, mana/cooldown and audio score. UI positions are not identity.
const expected = JSON.parse(readFileSync(new URL('./fixtures/retained-skill-hashes.json', import.meta.url)));
const canonical = value => value && typeof value === 'object'
  ? Array.isArray(value) ? value.map(canonical)
    : Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  : value;

test('retained skills keep their pre-edit config, rune profile, cinematic, MP, cooldown and audio', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const registry = source.slice(source.indexOf('const elements=['), source.indexOf("document.querySelector('#projectCount')"));
  const plans = source.slice(source.indexOf('const cinematicPlans='), source.indexOf('function mat('))
    .replace(/^sound\.registerScores.*\n/gm, '').replace(/^audioLab=mountAudioLab.*\n/gm, '');
  const profile = source.split('\n').find(line => line.startsWith('const runeProfiles='));
  const costs = source.split('\n').filter(line => /^function (manaCost|cooldownDuration)\(/.test(line)).join('\n');
  const result = vm.runInNewContext(`${registry}\n${plans}\n${profile}\n${costs}\nJSON.stringify({elements,data:skillDefs.map((skill,i)=>({skill,plan:cinematicPlans[i],profile:runeProfiles[i],mana:manaCost(skill),cooldown:cooldownDuration(skill)}))})`, {
    cooldowns: null, THREE: { MathUtils: { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) } }
  });
  const { elements, data } = JSON.parse(result);
  assert.equal(elements.length, 15);
  assert.equal(data.length, 19);
  assert.deepEqual(data.filter(d => d.skill.elementIndex === 0).map(d => d.skill.id), ['FIRE-01']);
  assert.deepEqual(data.map(d => d.skill.id), Object.keys(expected));
  for (const d of data) {
    d.score = buildSkillScore(d.skill, d.plan);
    const hash = createHash('sha256').update(JSON.stringify(canonical(d))).digest('hex');
    assert.equal(hash, expected[d.skill.id], d.skill.id + ' changed from the pre-edit baseline');
  }
});
