import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSubmission } from './normalize.ts';

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
