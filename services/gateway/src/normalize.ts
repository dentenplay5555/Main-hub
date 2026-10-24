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

const EXERCISE_KEYS = ['exerciseId', 'exercise_id', 'exId', 'ex', 'assignmentId', 'assignment_id', 'id'];
const PART_KEYS = ['part', 'partId', 'part_id', 'section'];
const CYCLE_KEYS = ['cycle', 'round', 'phase'];
const SCORE_KEYS = ['score', 'totalScore', 'total_score', 'points'];
const MAX_KEYS = ['maxScore', 'max_score', 'total', 'fullScore'];
const ANSWER_KEYS = ['answers', 'responses', 'data', 'result'];
const TIME_KEYS = ['clientTs', 'timestamp', 'ts', 'submittedAt', 'submitted_at'];

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
