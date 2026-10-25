// Tolerant payload reader. It NEVER throws: whatever an exercise web sends, we keep the raw body
// and pull out the fields we recognise. Anything odd becomes a warning, not an error.

export interface NormalizedSubmission {
  exerciseId: string | null;
  part: string | null;
  cycle: string | null;
  score: number | null;
  maxScore: number | null;
  answers: unknown;
  clientTs: string | null;
  warnings: string[];
}

const EXERCISE_KEYS = ['exerciseId', 'exercise_id', 'exId', 'ex', 'assignmentId', 'assignment_id', 'FormType', 'formType', 'id'];
const PART_KEYS = ['part', 'partId', 'part_id', 'section'];
const CYCLE_KEYS = ['cycle', 'round', 'phase'];
const SCORE_KEYS = ['score', 'totalScore', 'total_score', 'points'];
const MAX_KEYS = ['maxScore', 'max_score', 'total', 'fullScore'];
const ANSWER_KEYS = ['answers', 'responses', 'data', 'result'];
const TIME_KEYS = ['clientTs', 'timestamp', 'ts', 'submittedAt', 'submitted_at', 'FinishedAt', 'finishedAt'];

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function asText(v: unknown, max = 128): string | null {
  if (typeof v === 'string') return v.trim().slice(0, max) || null;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function normalizeSubmission(body: unknown): NormalizedSubmission {
  const warnings: string[] = [];
  let obj: Record<string, unknown>;

  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    obj = body as Record<string, unknown>;
  } else if (Array.isArray(body)) {
    obj = { answers: body };
    warnings.push('body_is_array_treated_as_answers');
  } else {
    obj = { answers: body ?? null };
    warnings.push('body_not_an_object');
  }

  const exerciseRaw = pick(obj, EXERCISE_KEYS);
  const exerciseId = asText(exerciseRaw);
  if (exerciseRaw === undefined) warnings.push('missing_exercise_id');
  else if (exerciseId === null) warnings.push('unreadable_exercise_id');

  const scoreRaw = pick(obj, SCORE_KEYS);
  const score = asNumber(scoreRaw);
  if (scoreRaw !== undefined && score === null) warnings.push('score_not_a_number');

  const maxRaw = pick(obj, MAX_KEYS);
  const maxScore = asNumber(maxRaw);
  if (maxRaw !== undefined && maxScore === null) warnings.push('max_score_not_a_number');

  const tsRaw = pick(obj, TIME_KEYS);
  let clientTs: string | null = null;
  if (tsRaw !== undefined) {
    const d = typeof tsRaw === 'number' ? new Date(tsRaw) : new Date(String(tsRaw));
    if (Number.isNaN(d.getTime())) warnings.push('timestamp_unreadable');
    else clientTs = d.toISOString();
  }

  const answersRaw = pick(obj, ANSWER_KEYS);

  return {
    exerciseId,
    part: asText(pick(obj, PART_KEYS)),
    cycle: asText(pick(obj, CYCLE_KEYS)),
    score,
    maxScore,
    answers: answersRaw === undefined ? null : answersRaw,
    clientTs,
    warnings,
  };
}

// ---- Parts ---------------------------------------------------------------------------------------
// Every top-level section of the body (info, outline, drafts, journey, ...) is kept as its own "part".
// Sections can be missing, empty ({}), or have only a few fields; none of that is an error.

export interface Part {
  key: string;
  data: unknown;
  is_empty: boolean;
}
export interface PartScore {
  part_key: string;
  path: string;
  criterion: string;
  score: number;
}

const MAX_PARTS = 200;
const MAX_SCORES = 500;
const MAX_DEPTH = 6;
const SCORE_CRITERIA = new Map(
  ['TR', 'ME', 'LR', 'GRA', 'CC', 'score', 'totalScore', 'pct'].map((k) => [k.toLowerCase(), k]),
);

function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

export function splitParts(body: unknown): { parts: Part[]; warnings: string[] } {
  const warnings: string[] = [];
  if (body === null || body === undefined) return { parts: [], warnings };
  if (typeof body !== 'object' || Array.isArray(body)) {
    return { parts: [{ key: '_body', data: body, is_empty: isEmptyValue(body) }], warnings };
  }
  const parts: Part[] = [];
  const meta: Record<string, unknown> = {};
  const flat: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (value !== null && typeof value === 'object') {
      if (parts.length >= MAX_PARTS) {
        if (!warnings.includes('too_many_parts_truncated')) warnings.push('too_many_parts_truncated');
        continue;
      }
      parts.push({ key: key.slice(0, 128), data: value, is_empty: isEmptyValue(value) });
    } else {
      // Flat payloads ("Socratic_Topic", "Act1_Acc", ...): group by the text before the first "_",
      // ignoring trailing digits, so Act1_Acc..Act6_Acc become one part "Act". Field names stay as sent.
      const m = key.match(/^([A-Za-z][A-Za-z0-9]*?)\d*_.+/);
      if (m) (flat[m[1]] ??= {})[key] = value;
      else meta[key] = value; // everything else (sheet name, Name, Class, timestamps) goes together
    }
  }
  for (const [group, data] of Object.entries(flat)) {
    if (parts.length >= MAX_PARTS) break;
    parts.push({ key: group.slice(0, 128), data, is_empty: false });
  }
  if (Object.keys(meta).length > 0) parts.push({ key: '_meta', data: meta, is_empty: false });
  return { parts, warnings };
}

/** Finds recognised numeric scores anywhere inside a part, remembering where each one was found. */
export function extractScores(parts: Part[]): PartScore[] {
  const out: PartScore[] = [];
  const walk = (node: unknown, partKey: string, path: string[], depth: number) => {
    if (out.length >= MAX_SCORES || depth > MAX_DEPTH || node === null || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const criterion = SCORE_CRITERIA.get(k.toLowerCase()) ?? (/(^|_)acc$|pct$/i.test(k) ? k : undefined);
      const n = criterion ? asNumber(v) : null;
      if (criterion && n !== null) {
        if (out.length < MAX_SCORES) out.push({ part_key: partKey, path: path.join('.'), criterion, score: n });
      } else if (v !== null && typeof v === 'object') {
        walk(v, partKey, [...path, k], depth + 1);
      }
    }
  };
  for (const p of parts) walk(p.data, p.key, [], 0);
  return out;
}
