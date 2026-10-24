// Central TypeScript Definitions matching design.md contracts

export type Role = 'student' | 'teacher' | 'dev';

// Legacy compat types (used by older components before refactor)
export interface ExerciseDefinition {
  id: string;
  name: string;
  seriesId: string;
  phase: string;
  status: 'active' | 'draft' | 'archived';
  dueDate: string;
  totalStudents: number;
  submittedStudents: number;
  manifestVersion: string;
  baseUrl: string;
  health: 'healthy' | 'degraded' | 'error';
  lastSyncAt: string;
  contractVerified: boolean;
  lastError?: string | null;
}

export interface StudentRecord {
  id: string;
  name: string;
  email: string;
  class: string;
  no: number;
  status: StatusType;
  scores: { TR: number; ME: number; LR: number; GRA: number; CC: number };
  rubricTotal: number;
  totScore: number;
  knowledgeState: KnowledgeStateType;
  flag: FlagType;
  level: { rank: number; name: string; xp: number; maxNextXp: number };
  badges: Array<{ id: string; name: string; icon: string; unlocked: boolean; hint: string }>;
  feedback?: { TR: string; ME: string; LR: string; GRA: string; CC: string };
  tips?: string[];
  teacherNotes?: string;
}

export interface SyncLogEntry {
  id: string;
  exerciseId: string;
  timestamp: string;
  durationMs: number;
  rowsAffected: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  details: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  ip: string;
}

export interface BinaryItemResult {
  id: string;
  label: string;
  passed: boolean;
  relatedSkill: string;
}

export type StatusType = 'TODO' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED';

export type KnowledgeStateType = 'Mastery' | 'Language Dev' | 'Structure OK' | 'Beginner';

export type FlagType = 'OK' | 'Lucky' | 'Careless';

export interface UserMe {
  id: string;
  name: string;
  email: string;
  role: Role;
  classes: string[];
}

export interface StudentExerciseItem {
  id: string;
  name: string;
  status: StatusType;
  dueAt: string | null;
  attemptsUsed: number;
  maxAttempts: number;
  exerciseUrl: string;
  series: string;
  phase: string;
}

export interface BadgeItem {
  id: string;
  name: string;
  earned: boolean;
  desc: string;
  isPending?: boolean;
}

export interface StudentResultPayload {
  exercise: {
    id: string;
    name: string;
  };
  student: {
    name: string;
    class: string;
    no: number;
  };
  status: StatusType;
  scores: {
    TR: number;
    ME: number;
    LR: number;
    GRA: number;
    CC: number;
  };
  rubricTotal: number;
  binary: Record<string, boolean>; // q1..q9
  binaryTotal: number;
  level: {
    n: number;
    name: string;
    xp: number;
  };
  ks: KnowledgeStateType;
  flag: FlagType;
  badges: BadgeItem[];
  feedback: {
    TR: string;
    ME: string;
    LR: string;
    GRA: string;
    CC: string;
  };
  tips: string[];
  attempts: {
    used: number;
    max: number;
  };
}

export interface TeacherReportPayload {
  exercise: {
    id: string;
    name: string;
    manifestVersion: string;
  };
  class: {
    name: string;
    students: number;
  };
  asOf: string;
  stats: {
    submitted: number;
    notSubmitted: number;
    avgTot: number;
    avgRubric: number;
    lucky: number;
    careless: number;
  };
  knowledgeStates: Array<{
    name: KnowledgeStateType;
    count: number;
    pct: number;
  }>;
  skills: Array<{
    code: string;
    name: string;
    passPct: number;
    avg: number;
  }>;
  itemDifficulty: Array<{
    id: string;
    passPct: number;
    tag: 'ง่าย' | 'ปานกลาง' | 'ยาก';
  }>;
  scoreDistribution: Array<{
    range: string;
    count: number;
  }>;
  insights: Array<{
    level: 'red' | 'amber' | 'green';
    text: string;
  }>;
  students: Array<{
    userId: string;
    no: number;
    name: string;
    scores: {
      TR: number;
      ME: number;
      LR: number;
      GRA: number;
      CC: number;
    };
    tot: number;
    rubricTotal: number;
    ks: KnowledgeStateType;
    flag: FlagType;
  }>;
  pending: Array<{
    no: number;
    name: string;
  }>;
}

export interface TeacherSubmissionStatus {
  userId: string;
  no: number;
  name: string;
  status: StatusType;
  partsCompleted: number;
  totalParts: number;
  lastActivityAt: string | null;
}

export interface DevExerciseItem {
  id: string;
  name: string;
  baseUrl: string;
  health: 'healthy' | 'syncing' | 'error';
  manifestVersion: string;
  enabled: boolean;
  lastSyncAt: string;
  lastError: string | null;
  rosterSource: boolean;
}

export interface SyncLogItem {
  id: string;
  exerciseId: string;
  at: string;
  ok: boolean;
  rows: number;
  ms: number;
  error?: string;
}

export interface AuditLogItem {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  target: string;
  at: string;
}

export interface DevUserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  classes: string[];
}
