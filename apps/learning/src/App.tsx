import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import StudentView from './StudentView';
import TeacherView from './TeacherView';
import { api, ApiError, supabase, type Me } from './lib/api.ts';

const hubHref = import.meta.env.BASE_URL.replace(/learning\/$/, '');

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still checking
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState('');
  const [asStudent, setAsStudent] = useState(false);

  useEffect(() => {
    // Only store the session here. Calling other supabase APIs inside this callback can deadlock.
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setMe(null); return; }
    let live = true;
    setError('');
    api.me(session).then(
      (m) => live && setMe(m),
      (e: unknown) => live && setError(e instanceof ApiError && e.code === 'domain_not_allowed' ? 'ใช้อีเมลโรงเรียน (@student.nssc.ac.th) เท่านั้นนะ' : e instanceof ApiError ? e.message : 'เกิดข้อผิดพลาด'),
    );
    return () => { live = false; };
  }, [session]);

  const login = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
  const logout = () => supabase.auth.signOut();

  return (
    <>
      <header className="topbar noprint">
        <a className="back" href={hubHref}>← Hub</a>
        <b>Learning System</b>
        <span className="grow" />
        {session && <span className="muted small who">{session.user.email}</span>}
        {me?.role === 'teacher' && (
          <button className="btn alt small" onClick={() => setAsStudent(!asStudent)}>{asStudent ? 'มุมมองครู' : 'ดูแบบนักเรียน'}</button>
        )}
        {session && <button className="btn alt small" onClick={logout}>ออกจากระบบ</button>}
      </header>
      <main className="wrap">
        {session === undefined && <p className="muted center">กำลังตรวจสอบ…</p>}
        {session === null && (
          <div className="empty">
            <div className="big">🔐</div>
            <h2>เข้าสู่ระบบเพื่อดูผลของคุณ</h2>
            <p className="muted">ใช้บัญชี Google ของโรงเรียน</p>
            <button className="btn" onClick={login}>เข้าสู่ระบบด้วย Google</button>
          </div>
        )}
        {session && error && <p className="notice bad">{error}</p>}
        {session && !error && !me && <p className="muted center">กำลังโหลด…</p>}
        {session && me && (me.role === 'teacher' && !asStudent ? <TeacherView session={session} /> : <StudentView session={session} />)}
      </main>
    </>
  );
}
