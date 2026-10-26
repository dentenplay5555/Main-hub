import type { Session } from '@supabase/supabase-js';
import { useMemo, useEffect, useState } from 'react';
import Report, { KsPill } from './Report';
import { api, ApiError, type StudentItem } from './lib/api.ts';
import { download, toCsv } from './lib/csv.ts';
import { diagnoseScores, levelMismatch, type Diagnosis, type KnowledgeState } from './lib/diagnose.ts';

interface Row { id: string; item: StudentItem; d: Diagnosis | null; mismatch: boolean }
const KS_ORDER: KnowledgeState[] = ['Mastery', 'Language Dev', 'Structure OK', 'Beginner'];

export default function TeacherView({ session }: { session: Session }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [room, setRoom] = useState('');
  const [ks, setKs] = useState('');
  const [flag, setFlag] = useState('');
  const [subf, setSubf] = useState('');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api.teacherStudents(session).then(
      (items) => {
        if (!live) return;
        setRows(items.map((item, i) => {
          const d = item.assessment ? diagnoseScores(item.assessment.scores) : null;
          return { id: item.email ?? `row-${i}`, item, d, mismatch: levelMismatch(d, item.assessment?.imported.level) };
        }));
      },
      (e: unknown) => live && setError(e instanceof ApiError ? e.message : 'เกิดข้อผิดพลาด'),
    );
    return () => { live = false; };
  }, [session]);

  const rooms = useMemo(() => [...new Set((rows ?? []).map((r) => r.item.profile.klass).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'th', { numeric: true })), [rows]);
  const inRoom = useMemo(() => (rows ?? []).filter((r) => !room || r.item.profile.klass === room), [rows, room]);
  const filtered = useMemo(() => inRoom.filter((r) => {
    if (ks && r.d?.ks !== ks) return false;
    if (flag && (r.d?.flag ?? '') !== flag) return false;
    if (subf === 'yes' && !r.item.submission.submitted) return false;
    if (subf === 'no' && r.item.submission.submitted) return false;
    const s = q.trim().toLowerCase();
    return !s || (r.item.profile.name ?? '').toLowerCase().includes(s) || (r.item.email ?? '').toLowerCase().includes(s) || String(r.item.profile.no ?? '') === s;
  }).sort((a, b) => (a.item.profile.klass ?? '').localeCompare(b.item.profile.klass ?? '', 'th', { numeric: true }) || Number(a.item.profile.no ?? 1e9) - Number(b.item.profile.no ?? 1e9)), [inRoom, ks, flag, subf, q]);

  if (error) return <p className="notice bad">{error}</p>;
  if (!rows) return <p className="muted center">กำลังโหลดข้อมูลห้อง…</p>;

  // Two independent blocks: results (real database) and submission status.
  const scored = inRoom.filter((r) => r.d);
  const count = (f: (d: Diagnosis) => boolean) => scored.filter((r) => f(r.d!)).length;
  const dist = Array.from({ length: 10 }, (_, n) => count((d) => d.total === n));
  const maxBar = Math.max(1, ...dist);
  const submitted = inRoom.filter((r) => r.item.submission.submitted).length;
  const mismatches = inRoom.filter((r) => r.mismatch).length;
  const selected = rows.find((r) => r.id === sel);

  const exportCsv = () => {
    const head = ['ห้อง', 'เลขที่', 'ชื่อ', 'อีเมล', 'ระดับ', 'คะแนน(0-9)', 'ธง', 'TR', 'ME', 'LR', 'GRA', 'CC', 'ระดับเดิมที่นำเข้า', 'ส่งแบบฝึก', 'ส่งล่าสุด'];
    const body = filtered.map((r) => [
      r.item.profile.klass, r.item.profile.no, r.item.profile.name, r.item.email,
      r.d?.ks, r.d?.total, r.d?.flag, r.d?.rubric.TR, r.d?.rubric.ME, r.d?.rubric.LR, r.d?.rubric.GRA, r.d?.rubric.CC,
      r.item.assessment?.imported.level, r.item.submission.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง', r.item.submission.last_at,
    ]);
    download(`learning-${room || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([head, ...body]));
  };

  return (
    <>
      <div className="grid2 stats-grid">
        <section className="card">
          <h3>ผลประเมิน {room || 'ทุกห้อง'} <span className="muted small">(ข้อมูลจริงในฐานข้อมูล)</span></h3>
          <div className="stats">
            <div><b>{scored.length}</b><small>มีผลครบ / {inRoom.length}</small></div>
            {KS_ORDER.map((k) => <div key={k}><b>{count((d) => d.ks === k)}</b><small>{k}</small></div>)}
            <div className="warn"><b>{count((d) => d.flag === 'Lucky')}</b><small>Lucky</small></div>
            <div className="warn"><b>{count((d) => d.flag === 'Careless')}</b><small>Careless</small></div>
          </div>
          <div className="bars" aria-label="การกระจายคะแนน 0-9">
            {dist.map((n, i) => (
              <div key={i} className="bar-col" title={`${i} คะแนน: ${n} คน`}>
                <span className="bar-n">{n || ''}</span>
                <div className="bar" style={{ height: `${(n / maxBar) * 100}%` }} />
                <span className="bar-x">{i}</span>
              </div>
            ))}
          </div>
          {mismatches > 0 && <p className="muted small">⚠ {mismatches} คนที่ระดับเดิมจาก PRISM ไม่ตรงกับคะแนนรายด้าน (ระบบแสดงตามคะแนนรายด้าน)</p>}
        </section>
        <section className="card">
          <h3>การส่งแบบฝึก <span className="muted small">(แยกจากผลประเมิน)</span></h3>
          <div className="stats">
            <div><b>{submitted}</b><small>ส่งแล้ว</small></div>
            <div className={inRoom.length - submitted ? 'warn' : ''}><b>{inRoom.length - submitted}</b><small>ยังไม่ส่ง</small></div>
            <div><b>{inRoom.length ? Math.round((submitted / inRoom.length) * 100) : 0}%</b><small>ส่งแล้ว</small></div>
          </div>
          <div className="progress" aria-hidden="true"><div style={{ width: `${inRoom.length ? (submitted / inRoom.length) * 100 : 0}%` }} /></div>
        </section>
      </div>

      <div className="filters noprint">
        <select value={room} onChange={(e) => setRoom(e.target.value)} aria-label="ห้อง">
          <option value="">ทุกห้อง</option>{rooms.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select value={ks} onChange={(e) => setKs(e.target.value)} aria-label="ระดับ">
          <option value="">ทุกระดับ</option>{KS_ORDER.map((k) => <option key={k}>{k}</option>)}
        </select>
        <select value={flag} onChange={(e) => setFlag(e.target.value)} aria-label="ธง">
          <option value="">ทุกธง</option><option>Lucky</option><option>Careless</option><option>OK</option>
        </select>
        <select value={subf} onChange={(e) => setSubf(e.target.value)} aria-label="การส่งแบบฝึก">
          <option value="">ส่ง/ไม่ส่ง ทั้งหมด</option><option value="yes">ส่งแล้ว</option><option value="no">ยังไม่ส่ง</option>
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ / เลขที่ / อีเมล" />
        <button className="btn alt" onClick={exportCsv}>ดาวน์โหลด CSV</button>
      </div>

      <div className="split">
        <ul className="list" aria-label="รายชื่อนักเรียน">
          {filtered.length === 0 && <li className="muted pad">ไม่พบนักเรียนตามตัวกรอง</li>}
          {filtered.map((r) => (
            <li key={r.id}>
              <button className={`row${sel === r.id ? ' active' : ''}`} onClick={() => setSel(r.id)}>
                <span className="no">{r.item.profile.no ?? '–'}</span>
                <span className="nm">{r.item.profile.name ?? r.item.email ?? '(ไม่มีชื่อ)'}<small>{r.item.profile.klass ?? ''}</small></span>
                {r.d ? <><KsPill ks={r.d.ks} />{r.d.flag !== 'OK' && <span className={`fl ${r.d.flag.toLowerCase()}`}>{r.d.flag[0]}</span>}</> : <span className="muted small">ไม่มีผล</span>}
                <span className={`sub ${r.item.submission.submitted ? 'yes' : 'no'}`} title={r.item.submission.submitted ? 'ส่งแบบฝึกแล้ว' : 'ยังไม่ส่งแบบฝึก'}>{r.item.submission.submitted ? '✓' : '–'}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="detail">
          {!selected && <p className="muted center">เลือกนักเรียนเพื่อดูรายงานรายบุคคล</p>}
          {selected && (
            <>
              <h2>{selected.item.profile.name ?? selected.item.email} <small className="muted">{selected.item.profile.klass} เลขที่ {selected.item.profile.no ?? '–'}</small></h2>
              <div className={`card subcard ${selected.item.submission.submitted ? 'done' : ''}`}>
                <b>แบบฝึก</b>{' '}
                {selected.item.submission.submitted
                  ? <>✅ ส่งแล้ว {selected.item.submission.count} ครั้ง <span className="muted small">(ล่าสุด {selected.item.submission.last_at ? new Date(selected.item.submission.last_at).toLocaleString('th-TH') : '–'})</span></>
                  : <>⏳ ยังไม่ส่ง</>}
              </div>
              {selected.mismatch && (
                <p className="notice">⚠ ระดับเดิมที่นำเข้าจาก PRISM คือ <b>{selected.item.assessment?.imported.level}</b> แต่คะแนนรายด้านให้ <b>{selected.d?.ks}</b> (แสดงตามคะแนนรายด้าน)</p>
              )}
              {selected.d ? <Report d={selected.d} title="ระดับ" onPrint={() => window.print()} /> : <p className="notice">ยังไม่มีผลประเมินครบ 5 ด้าน จึงวินิจฉัยไม่ได้</p>}
            </>
          )}
        </div>
      </div>
    </>
  );
}
