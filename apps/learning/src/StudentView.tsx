import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import Report from './Report';
import { api, ApiError } from './lib/api.ts';
import { diagnose, type Diagnosis } from './lib/diagnose.ts';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'none' } | { kind: 'incomplete' } | { kind: 'ok'; d: Diagnosis; at: string };

export default function StudentView({ session }: { session: Session }) {
  const [st, setSt] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    let live = true;
    api.mine(session).then(
      (sub) => {
        if (!live) return;
        if (!sub) return setSt({ kind: 'none' });
        const d = diagnose(sub.scores);
        setSt(d ? { kind: 'ok', d, at: sub.created_at } : { kind: 'incomplete' });
      },
      (e: unknown) => live && setSt({ kind: 'error', message: e instanceof ApiError ? e.message : 'เกิดข้อผิดพลาด' }),
    );
    return () => { live = false; };
  }, [session]);

  if (st.kind === 'loading') return <p className="muted center">กำลังโหลดผลของคุณ…</p>;
  if (st.kind === 'error') return <p className="notice bad">{st.message}</p>;
  if (st.kind === 'none') {
    return (
      <div className="empty">
        <div className="big">📝</div>
        <h2>ยังไม่ได้ส่งงาน</h2>
        <p className="muted">ยังไม่มีข้อมูลการส่งงานของคุณในระบบ กรุณาทำแบบฝึกให้เสร็จ หรือติดต่อครูผู้สอน</p>
      </div>
    );
  }
  if (st.kind === 'incomplete') {
    return (
      <div className="empty">
        <div className="big">⏳</div>
        <h2>ยังไม่มีผลคะแนนครบ 5 ด้าน</h2>
        <p className="muted">ระบบได้รับงานของคุณแล้ว แต่ยังไม่มีคะแนนครบทั้ง TR, ME, LR, GRA, CC จึงยังวินิจฉัยระดับไม่ได้</p>
      </div>
    );
  }
  return (
    <>
      <p className="muted small">ส่งล่าสุด {new Date(st.at).toLocaleString('th-TH')}</p>
      <Report d={st.d} onPrint={() => window.print()} />
    </>
  );
}
