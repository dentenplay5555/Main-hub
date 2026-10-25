import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from './csv.ts';

test('csv: BOM, quoting, Thai text, formula guard, numbers untouched', () => {
  const out = toCsv([['ชื่อ', 'หมายเหตุ'], ['สมชาย, ใจดี', 'say "hi"'], ['=1+1', -3], ['+66', null]]);
  assert.equal(out.charCodeAt(0), 0xfeff);
  const lines = out.slice(1).trim().split('\r\n');
  assert.equal(lines[0], 'ชื่อ,หมายเหตุ');
  assert.equal(lines[1], '"สมชาย, ใจดี","say ""hi"""');
  assert.equal(lines[2], "'=1+1,-3");
  assert.equal(lines[3], "'+66,");
});
