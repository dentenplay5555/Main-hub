// Verified PRISM CbKST Diagnostic Rule Engine (Server-Side)
// Matched and verified with the 339-student dataset from Nakhon Sawan School (NSSC)

import type { KnowledgeStateType, FlagType, BadgeItem } from '../src/types';

export interface SkillScores {
  TR: number;
  ME: number;
  LR: number;
  GRA: number;
  CC: number;
}

export interface BinaryItemMap {
  q1: boolean;
  q2: boolean;
  q3: boolean;
  q4: boolean;
  q5: boolean;
  q6: boolean;
  q7: boolean;
  q8: boolean;
  q9: boolean;
  [key: string]: boolean;
}

// 1. Derive 9 Binary Items from 5 rubric skills (TR, ME, LR, GRA, CC)
export function deriveBinaryItemsFromRubric(scores: SkillScores): BinaryItemMap {
  return {
    q1: scores.TR >= 3,
    q2: scores.TR >= 4,
    q3: scores.ME >= 3,
    q4: scores.LR >= 3,
    q5: scores.LR >= 4,
    q6: scores.GRA >= 3,
    q7: scores.GRA >= 4,
    q8: scores.CC >= 3,
    q9: scores.CC >= 4
  };
}

// 2. Count total passed binary items (0 to 9)
export function countBinaryTotal(binary: BinaryItemMap): number {
  let count = 0;
  for (let i = 1; i <= 9; i++) {
    if (binary[`q${i}`]) count++;
  }
  return count;
}

// 3. Knowledge State (KS) derived from binary_total (0..9)
// 0–3: Beginner, 4–5: Structure OK, 6–7: Language Dev, 8–9: Mastery
export function evaluateKnowledgeState(binaryTotal: number): KnowledgeStateType {
  if (binaryTotal >= 8) return 'Mastery';
  if (binaryTotal >= 6) return 'Language Dev';
  if (binaryTotal >= 4) return 'Structure OK';
  return 'Beginner';
}

// 4. CbKST Flag: Lucky vs Careless vs OK
// Lucky = (q8 หรือ q9) และไม่ผ่าน q6, q7
// Careless = q1 ผ่านแต่ q2 ไม่ผ่าน
export function evaluateFlag(binary: BinaryItemMap): FlagType {
  const isLucky = (binary.q8 || binary.q9) && (!binary.q6 && !binary.q7);
  if (isLucky) return 'Lucky';

  const isCareless = binary.q1 && !binary.q2;
  if (isCareless) return 'Careless';

  return 'OK';
}

// 5. Level determination from binary_total / 9
// >= 8.5: Level 5, >= 7: Level 4, >= 5: Level 3, >= 3: Level 2, < 3: Level 1
export function evaluateLevel(binaryTotal: number): { n: number; name: string; xp: number } {
  if (binaryTotal >= 8.5) {
    return { n: 5, name: 'CbKST Grandmaster', xp: 100 };
  }
  if (binaryTotal >= 7) {
    return { n: 4, name: 'Language Warrior', xp: 80 };
  }
  if (binaryTotal >= 5) {
    return { n: 3, name: 'Coherence Crafter', xp: 60 };
  }
  if (binaryTotal >= 3) {
    return { n: 2, name: 'Structure Architect', xp: 40 };
  }
  return { n: 1, name: 'Novice Draftsman', xp: 20 };
}

// 6. Actionable Diagnostic Tips per Knowledge State
export function getKnowledgeStateTips(ks: KnowledgeStateType, flag: FlagType): string[] {
  const tips: string[] = [];

  if (flag === 'Careless') {
    tips.push('ระวังหลุดเกณฑ์พื้นฐาน: ตอบตรงประเด็นขั้นต้น (q1) ได้ดีแล้ว ควรเพิ่มความลึกซึ้งและพัฒนาประเด็นหลักให้ครอบคลุมรอบด้าน (q2)');
  } else if (flag === 'Lucky') {
    tips.push('ทบทวนไวยากรณ์พื้นฐาน: โครงสร้างประโยคซับซ้อนและการเชื่อมโยง (q8/q9) เริ่มเห็นผล แต่ควรเน้นทบทวนกฎ FANBOYS (q6/q7) ให้แม่นยำ');
  }

  switch (ks) {
    case 'Mastery':
      tips.push('รักษามาตรฐานการเขียนระดับยอดเยี่ยม และท้าทายตนเองด้วยงานเขียนเชิงวิชาการ (Academic Writing)');
      tips.push('สามารถให้คำแนะนำและช่วยเหลือเป็นคู่บัดดี้ (Peer Reviewer) ให้เพื่อนร่วมชั้น');
      break;
    case 'Language Dev':
      tips.push('โครงสร้างย่อหน้าและการเชื่อมโยงความคิดดีมาก ควรเน้นเรื่องความหลากหลายของคลังคำศัพท์ (LR) และไวยากรณ์ (GRA)');
      tips.push('ตรวจทานเครื่องหมายวรรคตอนและการสะกดคำก่อนส่งงานทุกครั้ง');
      break;
    case 'Structure OK':
      tips.push('ไอเดียและประเด็นเนื้อหาชัดเจน แต่ควรฝึกจัดระเบียบความคิดและวาง Topic Sentence ให้เด่นชัดในแต่ละย่อหน้า');
      tips.push('เลือกใช้คำเชื่อม FANBOYS ให้ถูกต้องตามความสัมพันธ์ของประโยค');
      break;
    case 'Beginner':
    default:
      tips.push('ฝึกแต่งประโยคเดี่ยวและเชื่อมด้วยคำเชื่อมพื้นฐาน (and, but, so) ทีละคู่');
      tips.push('ทบทวนหลักการใช้ FANBOYS กับคุณครูผู้สอนเพื่อสร้างความมั่นใจ');
      break;
  }

  return tips;
}

// 7. Feedback messages per skill
export function getSkillFeedback(scores: SkillScores): Record<'TR' | 'ME' | 'LR' | 'GRA' | 'CC', string> {
  const format = (name: string, score: number) => {
    if (score >= 4.5) return `${name}: ระดับยอดเยี่ยม มีความเชี่ยวชาญสูง`;
    if (score >= 3.5) return `${name}: ระดับดี สื่อสารได้ชัดเจนตามเกณฑ์`;
    if (score >= 2.5) return `${name}: ระดับพอใช้ ควรฝึกฝนเพิ่มเติม`;
    return `${name}: ต้องได้รับการพัฒนา แนะนำปรึกษาครูผู้สอน`;
  };

  return {
    TR: format('Task Response', scores.TR),
    ME: format('Mechanics', scores.ME),
    LR: format('Lexical Resource', scores.LR),
    GRA: format('Grammar & Accuracy', scores.GRA),
    CC: format('Coherence & Cohesion', scores.CC)
  };
}

// 8. Badges Evaluation
export function evaluateBadges(scores: SkillScores, flag: FlagType, level: number): BadgeItem[] {
  return [
    {
      id: 'structure_ace',
      name: 'Structure Master',
      desc: 'ได้คะแนน Task Response และ Coherence ในเกณฑ์ระดับสูง (>= 4.0)',
      earned: scores.TR >= 4.0 && scores.CC >= 4.0
    },
    {
      id: 'grammar_shield',
      name: 'Grammar Shield',
      desc: 'ความแม่นยำไวยากรณ์ (GRA) ระดับดีเยี่ยม (>= 4.0)',
      earned: scores.GRA >= 4.0
    },
    {
      id: 'lexical_spark',
      name: 'Lexical Spark',
      desc: 'คลังคำศัพท์หลากหลายและสละสลวย (LR >= 4.0)',
      earned: scores.LR >= 4.0
    },
    {
      id: 'clean_mechanics',
      name: 'Precision Proofreader',
      desc: 'การสะกดคำและเครื่องหมายวรรคตอนถูกต้อง (ME >= 4.0)',
      earned: scores.ME >= 4.0
    },
    {
      id: 'cbkst_steady',
      name: 'Steady Climber',
      desc: 'พัฒนาการสม่ำเสมอตามลำดับ CbKST (Flag OK) และถึง Level 3 ขึ้นไป',
      earned: flag === 'OK' && level >= 3
    }
  ];
}
