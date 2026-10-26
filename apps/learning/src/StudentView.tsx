import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import Report from './Report';
import { api, ApiError, type Profile } from './lib/api.ts';
import { diagnoseScores, type Diagnosis } from './lib/diagnose.ts';

type Result =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'not_in_roster' }
  | { kind: 'no_assessment'; profile: Profile | null }
  | { kind: 'incomplete'; profile: Profile | null }
  | { kind: 'ok'; profile: Profile | null; d: Diagnosis };
type Sub = { submitted: boolean; last_at: string | null } | null;

export default function StudentView({ session }: { session: Session }) {
  const [res, setRes] = useState<Result>({ kind: 'loading' });
  const [sub, setSub] = useState<Sub>(null);

  useEffect(() => {
    let live = true;
    // Stats come from the real database; submission status is a separate call and never blocks the stats.
    api.myAssessment(session).then(
      (a) => {
        if (!live) return;
        if (!a.in_roster) return setRes({ kind: 'not_in_roster' });
        if (!a.assessment) return setRes({ kind: 'no_assessment', profile: a.profile });
        const d = diagnoseScores(a.assessment.scores);
        setRes(d ? { kind: 'ok', profile: a.profile, d } : { kind: 'incomplete', profile: a.profile });
      },
      (e: unknown) => live && setRes({ kind: 'error', message: e instanceof ApiError ? e.message : 'เกิดข้อผิดพลาด' }),
    );
    api.mySubmission(session).then((x) => live && setSub(x), () => live && setSub(null));
    return () => { live = false; };
  }, [session]);

  const submission = sub && (
    <div className={`card subcard ${sub.submitted ? 'done' : ''}`}>
      <b>แบบฝึก</b>{' '}
      {sub.submitted
        ? <span>✅ ส่งแล้ว <span className="muted small">(ล่าสุด {sub.last_at ? new Date(sub.last_at).toLocaleString('th-TH') : '–'})</span></span>
        : <span>⏳ ยังไม่ได้ส่งแบบฝึก</span>}
    </div>
  );

  if (res.kind === 'loading') return <p className="muted center">กำลังโหลดผลของคุณ…</p>;
  if (res.kind === 'error') return <p className="notice bad">{res.message}</p>;
  if (res.kind === 'not_in_roster') {
    return (
      <div className="empty">
        <div className="big">🔎</div>
        <h2>ไม่พบอีเมลนี้ในรายชื่อนักเรียน</h2>
        <p className="muted">กรุณาใช้อีเมลโรงเรียนของตัวเอง หรือแจ้งครูผู้สอนให้ตรวจรายชื่อ</p>
      </div>
    );
  }
  const who = res.profile && (
    <p className="muted small">{res.profile.name} · {res.profile.klass} เลขที่ {res.profile.no ?? '–'}</p>
  );
  if (res.kind === 'no_assessment') {
    return (
      <>
        {who}
        <div className="empty">
          <div className="big">📝</div>
          <h2>ยังไม่มีผลประเมินของคุณ</h2>
          <p className="muted">ยังไม่พบผลของคุณในระบบ กรุณาติดต่อครูผู้สอน</p>
        </div>
        {submission}
      </>
    );
  }
  if (res.kind === 'incomplete') {
    return (
      <>
        {who}
        <div className="empty">
          <div className="big">⏳</div>
          <h2>ผลประเมินยังไม่ครบ 5 ด้าน</h2>
          <p className="muted">ยังไม่มีคะแนนครบทั้ง TR, ME, LR, GRA, CC จึงยังวินิจฉัยระดับไม่ได้</p>
        </div>
        {submission}
      </>
    );
  }
  return (
    <>
      {who}
      {submission}
      <Report d={res.d} onPrint={() => window.print()} />
    </>
  );
}
