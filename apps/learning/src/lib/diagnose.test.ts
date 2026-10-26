import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseScores, levelMismatch, badgesFor, binaryTotal, diagnose, flagOf, knowledgeState, pickRubric, stepsFor, type ScoreRow } from './diagnose.ts';

const row = (path: string, criterion: string, score: number, part_key = 'drafts'): ScoreRow => ({ part_key, path, criterion, score });
const full = (path: string, v: Record<string, number>, part_key = 'drafts') =>
  Object.entries(v).map(([c, s]) => row(path, c, s, part_key));

test('binary total and knowledge state follow the PRISM bands (0-3, 4-5, 6-7, 8-9)', () => {
  assert.equal(binaryTotal({ TR: 5, ME: 5, LR: 5, GRA: 5, CC: 5 }), 9);
  assert.equal(binaryTotal({ TR: 1, ME: 1, LR: 1, GRA: 1, CC: 1 }), 0);
  assert.equal(binaryTotal({ TR: 3, ME: 3, LR: 3, GRA: 3, CC: 3 }), 5); // q1,q3,q4,q6,q8
  const bands: Array<[number, string]> = [[0, 'Beginner'], [3, 'Beginner'], [4, 'Structure OK'], [5, 'Structure OK'], [6, 'Language Dev'], [7, 'Language Dev'], [8, 'Mastery'], [9, 'Mastery']];
  for (const [t, ks] of bands) assert.equal(knowledgeState(t), ks, `total ${t}`);
});

test('flags: Lucky = CC without GRA; Careless = TR 3 but not 4; Lucky wins', () => {
  assert.equal(flagOf({ TR: 4, ME: 4, LR: 4, GRA: 2, CC: 3 }), 'Lucky');
  assert.equal(flagOf({ TR: 3, ME: 4, LR: 4, GRA: 4, CC: 4 }), 'Careless');
  assert.equal(flagOf({ TR: 3, ME: 4, LR: 4, GRA: 2, CC: 4 }), 'Lucky');
  assert.equal(flagOf({ TR: 4, ME: 4, LR: 4, GRA: 4, CC: 4 }), 'OK');
  assert.equal(flagOf({ TR: 2, ME: 2, LR: 2, GRA: 2, CC: 2 }), 'OK');
});

test('pickRubric uses the latest COMPLETE group in natural order', () => {
  const rows = [...full('d1', { TR: 1, ME: 1, LR: 1, GRA: 1, CC: 1 }), ...full('d2', { TR: 4, ME: 4, LR: 4, GRA: 4, CC: 4 }), ...full('d10', { TR: 5, ME: 5, LR: 5, GRA: 5, CC: 5 }), row('d11', 'TR', 5)];
  const p = pickRubric(rows)!;
  assert.equal(p.source, 'drafts/d10'); // d10 after d2; incomplete d11 ignored
  assert.equal(p.rubric.TR, 5);
});

test('no complete rubric -> null, never a guessed level', () => {
  assert.equal(pickRubric([]), null);
  assert.equal(diagnose([row('d1', 'TR', 5), row('d1', 'CC', 5)]), null);
  assert.equal(pickRubric([...full('x', { TR: 1, ME: 1, LR: 1, GRA: 1 })]), null);
});

test('criteria names are case-insensitive; unknown criteria and non-numbers are ignored', () => {
  const d = diagnose([row('d1', 'tr', 4), row('d1', 'me', 4), row('d1', 'Lr', 4), row('d1', 'gra', 4), row('d1', 'cc', 4), row('d1', 'pct', 99), row('d1', 'TR', Number.NaN)])!;
  assert.equal(d.total, 9);
  assert.equal(d.ks, 'Mastery');
});

test('steps and badges', () => {
  assert.equal(stepsFor('Mastery', 'Lucky')[0].level, 'enrich'); // Mastery ignores flags
  assert.equal(stepsFor('Language Dev', 'Lucky')[0].level, 'urgent');
  assert.equal(stepsFor('Language Dev', 'OK').length, 3);
  const b = badgesFor({ TR: 3, ME: 3, LR: 1, GRA: 1, CC: 2 });
  assert.deepEqual(b.filter((x) => x.earned).map((x) => x.name), ['First Draft Hero', 'Target Sniper']);
  assert.equal(b.filter((x) => x.future).length, 2);
});

test('diagnoseScores works on gateway-style rows; levelMismatch flags only real disagreements', () => {
  const d = diagnoseScores([{ criterion: 'TR', score: 1 }, { criterion: 'ME', score: 1 }, { criterion: 'LR', score: 1 }, { criterion: 'GRA', score: 1 }, { criterion: 'CC', score: 1 }])!;
  assert.equal(d.ks, 'Beginner');
  assert.equal(levelMismatch(d, 'Mastery'), true);
  assert.equal(levelMismatch(d, 'beginner'), false);
  assert.equal(levelMismatch(d, null), false);
  assert.equal(levelMismatch(null, 'Mastery'), false);
  assert.equal(diagnoseScores([{ criterion: 'TR', score: 5 }]), null);
});
