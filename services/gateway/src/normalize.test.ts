import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractScores, normalizeSubmission, splitParts } from './normalize.ts';

test('reads the usual fields', () => {
  const n = normalizeSubmission({ exerciseId: 'ex1', part: 2, cycle: 'c1', score: 7, maxScore: 10, answers: { q1: 'a' } });
  assert.equal(n.exerciseId, 'ex1');
  assert.equal(n.part, '2');
  assert.equal(n.cycle, 'c1');
  assert.equal(n.score, 7);
  assert.equal(n.maxScore, 10);
  assert.deepEqual(n.answers, { q1: 'a' });
  assert.deepEqual(n.warnings, []);
});

test('accepts alternative field names', () => {
  const n = normalizeSubmission({ exercise_id: 'ex9', total_score: '12', timestamp: '2026-10-24T10:00:00Z', responses: [1, 2] });
  assert.equal(n.exerciseId, 'ex9');
  assert.equal(n.score, 12);
  assert.equal(n.clientTs, '2026-10-24T10:00:00.000Z');
  assert.deepEqual(n.answers, [1, 2]);
});

test('bad values become warnings, never exceptions', () => {
  const n = normalizeSubmission({ exerciseId: { nested: true }, score: 'abc', timestamp: 'not a date' });
  assert.equal(n.exerciseId, null);
  assert.equal(n.score, null);
  assert.equal(n.clientTs, null);
  assert.ok(n.warnings.includes('unreadable_exercise_id'));
  assert.ok(n.warnings.includes('score_not_a_number'));
  assert.ok(n.warnings.includes('timestamp_unreadable'));
});

test('any body shape is survivable', () => {
  for (const body of [null, undefined, 42, 'text', true, [], [1, 2, 3], { a: { b: { c: [] } } }]) {
    const n = normalizeSubmission(body);
    assert.ok(Array.isArray(n.warnings));
  }
  assert.ok(normalizeSubmission([1, 2]).warnings.includes('body_is_array_treated_as_answers'));
  assert.ok(normalizeSubmission(42).warnings.includes('body_not_an_object'));
});

test('score of NaN/Infinity is dropped', () => {
  assert.equal(normalizeSubmission({ score: Infinity }).score, null);
  assert.equal(normalizeSubmission({ score: NaN }).score, null);
});

test('splitParts: sparse, empty and odd bodies', () => {
  assert.deepEqual(splitParts(null).parts, []);
  assert.deepEqual(splitParts({}).parts, []);
  assert.equal(splitParts({ only: { a: 1 } }).parts.length, 1);
  assert.equal(splitParts({ a: {}, b: [] }).parts.every((p) => p.is_empty), true);
  assert.deepEqual(splitParts([1, 2]).parts.map((p) => p.key), ['_body']);
  assert.deepEqual(splitParts('hi').parts.map((p) => p.key), ['_body']);
  const m = splitParts({ sheet: 'S', n: 3, p: { x: 1 } }).parts;
  assert.deepEqual(m.map((p) => p.key).sort(), ['_meta', 'p']);
});

test('splitParts: caps the number of parts', () => {
  const big: Record<string, unknown> = {};
  for (let i = 0; i < 300; i++) big[`p${i}`] = { i };
  const r = splitParts(big);
  assert.equal(r.parts.length, 200);
  assert.ok(r.warnings.includes('too_many_parts_truncated'));
});

test('extractScores: finds scores at any depth, ignores junk', () => {
  const { parts } = splitParts({ d: { d1: { tr: 3, GRA: '4', LR: 'x', ME: null }, deep: { a: { b: { CC: 2 } } } } });
  const s = extractScores(parts).map((x) => `${x.path}:${x.criterion}=${x.score}`).sort();
  assert.deepEqual(s, ['d1:GRA=4', 'd1:TR=3', 'deep.a.b:CC=2']);
});
