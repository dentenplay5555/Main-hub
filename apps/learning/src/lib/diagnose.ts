// Diagnosis rules ported from the PRISM portal and the Supabase views (writing_assessment_items / _final).
// Pure functions, no I/O: the same rules can later move into the gateway unchanged.

export const CRITERIA = ['TR', 'ME', 'LR', 'GRA', 'CC'] as const;
export type Criterion = (typeof CRITERIA)[number];
export type Rubric = Partial<Record<Criterion, number>>;

export type KnowledgeState = 'Beginner' | 'Structure OK' | 'Language Dev' | 'Mastery';
export type Flag = 'Lucky' | 'Careless' | 'OK';

export interface ScoreRow {
  part_key: string;
  path: string;
  criterion: string;
  score: number;
}

/** Natural order so "d10" comes after "d2". */
function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

/**
 * Picks the rubric to diagnose from: the latest group (part + path, e.g. drafts/d3) that has all five criteria.
 * Returns null when no group is complete, so a half-filled submission is never given a wrong level.
 */
export function pickRubric(rows: ScoreRow[]): { rubric: Rubric; source: string } | null {
  const groups = new Map<string, Rubric>();
  for (const r of rows) {
    const crit = r.criterion.toUpperCase();
    if (!(CRITERIA as readonly string[]).includes(crit)) continue;
    if (!Number.isFinite(r.score)) continue;
    const key = `${r.part_key}/${r.path}`;
    const g = groups.get(key) ?? {};
    g[crit as Criterion] = r.score;
    groups.set(key, g);
  }
  const complete = [...groups.entries()].filter(([, g]) => CRITERIA.every((c) => g[c] !== undefined));
  if (complete.length === 0) return null;
  complete.sort((a, b) => naturalCompare(a[0], b[0]));
  const [source, rubric] = complete[complete.length - 1];
  return { rubric, source };
}

/** The nine yes/no items behind the 0-9 score. */
export function items(r: Rubric) {
  const g = (c: Criterion, n: number) => (r[c] ?? 0) >= n;
  return {
    q1: g('TR', 3), q2: g('TR', 4),
    q3: g('ME', 3),
    q4: g('LR', 3), q5: g('LR', 4),
    q6: g('GRA', 3), q7: g('GRA', 4),
    q8: g('CC', 3), q9: g('CC', 4),
  };
}

export function binaryTotal(r: Rubric): number {
  return Object.values(items(r)).filter(Boolean).length;
}

export function knowledgeState(total: number): KnowledgeState {
  if (total >= 8) return 'Mastery';
  if (total >= 6) return 'Language Dev';
  if (total >= 4) return 'Structure OK';
  return 'Beginner';
}

/** Lucky: coherence (CC) is good but grammar (GRA) is not. Careless: meaning (TR) ok at 3 but not 4. */
export function flagOf(r: Rubric): Flag {
  const q = items(r);
  if ((q.q8 || q.q9) && !q.q6 && !q.q7) return 'Lucky';
  if (q.q1 && !q.q2) return 'Careless';
  return 'OK';
}

export interface Diagnosis {
  rubric: Rubric;
  source: string;
  total: number;
  ks: KnowledgeState;
  flag: Flag;
}

export function diagnose(rows: ScoreRow[]): Diagnosis | null {
  const picked = pickRubric(rows);
  if (!picked) return null;
  const total = binaryTotal(picked.rubric);
  return { ...picked, total, ks: knowledgeState(total), flag: flagOf(picked.rubric) };
}

export const FLAG_INFO: Record<Flag, { tone: 'warn' | 'ok'; title: string; text: string }> = {
  Lucky: {
    tone: 'warn',
    title: '⚠ Lucky Guess — สมรรถนะไม่เสถียร',
    text: 'ตอบ CC ได้แต่ยังไม่ผ่าน GRA อาจท่องจำ Linkers โดยไม่เข้าใจโครงสร้างที่แท้จริง ต้องซ่อมเสริม GRA ก่อน',
  },
  Careless: {
    tone: 'warn',
    title: '⚠ Careless Error — Conclusion ไม่สมบูรณ์',
    text: 'ระบุใจความได้ดี แต่พลาดส่วนสรุป/Opinion ลองใช้ Checklist ตรวจก่อนส่งงานทุกครั้ง',
  },
  OK: {
    tone: 'ok',
    title: '✓ ไม่พบสัญญาณเตือน',
    text: 'ตอบสอดคล้องกับสมรรถนะที่มี ไม่พบรูปแบบผิดปกติในการตอบ',
  },
};

export interface Step {
  level: 'urgent' | 'do' | 'enrich';
  text: string;
}

export function stepsFor(ks: KnowledgeState, flag: Flag): Step[] {
  if (ks === 'Mastery') {
    return [
      { level: 'enrich', text: 'ต่อยอดด้วย Argumentative Essay หรือ Cause-Effect writing ระดับสูง' },
      { level: 'enrich', text: 'ทำหน้าที่ Peer Editor ให้เพื่อน — ช่วยเสริม GRA และ CC ของตัวเองไปพร้อมกัน' },
      { level: 'enrich', text: 'ท้าทายด้วย Multi-paragraph writing หรือ Portfolio 1 หน้าเต็ม' },
    ];
  }
  if (flag === 'Lucky') {
    return [
      { level: 'urgent', text: 'หยุดฝึก Linkers ชั่วคราว → ทบทวน S+V+O และ Tense พื้นฐานก่อน' },
      { level: 'urgent', text: 'ฝึก Error Correction: หาจุดผิดในประโยคที่ "ดูถูกต้องแต่ GRA ผิด"' },
      { level: 'do', text: 'เมื่อ GRA มั่นคงแล้ว ค่อยกลับมาฝึก Linkers ในบริบทประโยคจริง' },
    ];
  }
  if (flag === 'Careless') {
    return [
      { level: 'urgent', text: 'ฝึกเขียน Concluding Sentence ด้วย frame: "In conclusion, …" / "Overall, …"' },
      { level: 'do', text: 'ใช้ Writing Checklist ตรวจ paragraph ก่อนส่ง: มี Topic — Body — Conclusion ครบ?' },
      { level: 'do', text: 'ทำ Peer Editing เน้นตรวจส่วน Conclusion ของเพื่อน' },
    ];
  }
  if (ks === 'Beginner') {
    return [
      { level: 'urgent', text: 'เริ่มจาก Mechanics: สะกดคำ 10 คำ/วัน + เขียนประโยค S+V+O ให้คล่อง' },
      { level: 'urgent', text: 'ฝึกระบุ Topic Sentence จาก paragraph ตัวอย่างก่อนเขียนเอง' },
      { level: 'do', text: 'เมื่อ ME ผ่านแล้ว ค่อยเพิ่ม LR ทีละหัวข้อ — ยังไม่รีบไปที่ GRA หรือ CC' },
    ];
  }
  if (ks === 'Structure OK') {
    return [
      { level: 'urgent', text: 'พัฒนา LR: Academic vocabulary, collocations ในหัวข้อที่กำลังเรียน' },
      { level: 'urgent', text: 'พัฒนา GRA: Complex Sentence, Tense หลากหลาย, Error Correction' },
      { level: 'do', text: 'เมื่อผ่าน LR + GRA แล้ว จึงฝึก Linkers เพื่อพัฒนา CC ขั้นถัดไป' },
    ];
  }
  return [
    { level: 'do', text: 'ฝึก Linkers หลายประเภท (contrast, cause-effect, addition) เพื่อยกระดับ CC' },
    { level: 'do', text: 'พัฒนา GRA Complex: Subordinate Clauses, Passive Voice' },
    { level: 'enrich', text: 'เตรียมพัฒนาสู่ Mastery ด้วย integrated paragraph writing ทุกสมรรถนะ' },
  ];
}

export interface Badge {
  icon: string;
  name: string;
  desc: string;
  earned: boolean;
  /** Needs data this system does not collect yet (later rounds, anxiety survey). */
  future?: boolean;
}

export function badgesFor(r: Rubric): Badge[] {
  return [
    { icon: '✍️', name: 'First Draft Hero', desc: 'ส่ง Pretest แล้ว!', earned: true },
    { icon: '🎯', name: 'Target Sniper', desc: 'TR ≥ 3 ตอบโจทย์ผ่าน', earned: (r.TR ?? 0) >= 3 },
    { icon: '🔗', name: 'Bridge Builder', desc: 'CC ≥ 3 เชื่อมความคิดผ่าน', earned: (r.CC ?? 0) >= 3 },
    { icon: '⚡', name: 'Sharp Eye', desc: 'ME ≥ 4 กลไกภาษาดีเยี่ยม', earned: (r.ME ?? 0) >= 4 },
    { icon: '📈', name: 'Rocket Climber', desc: 'พัฒนาการ Pretest → Cycle 1', earned: false, future: true },
    { icon: '🧘', name: 'Calm Mind', desc: 'ความกังวล SLWAI ลดลง', earned: false, future: true },
  ];
}

/** Scores as the gateway returns them for a real assessment ({criterion, score}); same rules as diagnose(). */
export function diagnoseScores(scores: Array<{ criterion: string; score: number }>): Diagnosis | null {
  return diagnose(scores.map((x) => ({ part_key: 'assessment', path: '', criterion: x.criterion, score: x.score })));
}

/** True when the level recorded by the old PRISM import disagrees with the level the five scores give. */
export function levelMismatch(d: Diagnosis | null, importedLevel: string | null | undefined): boolean {
  return !!d && !!importedLevel && importedLevel.trim().toLowerCase() !== d.ks.toLowerCase();
}
