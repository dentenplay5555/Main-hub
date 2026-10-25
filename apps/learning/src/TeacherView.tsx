import type { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';
import Report, { KsPill } from './Report';
import { api, ApiError, type OverviewItem, type Profile } from './lib/api.ts';
import { download, toCsv } from './lib/csv.ts';
import { diagnose, type Diagnosis, type KnowledgeState } from './lib/diagnose.ts';

interface Row { item: OverviewItem; d: Diagnosis | null }
const KS_ORDER: KnowledgeState[] = ['Mastery', 'Language Dev', 'Structure OK', 'Beginner'];

export default function TeacherView({ session }: { session: Session }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [missing, setMissing] = useState<Profile[]>([]);
  const [error, setError] = useState('');
  const [room, setRoom] = useState('');
  const [ks, setKs] = useState('');
  const [flag, setFlag] = useState('');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api.overview(session).then(
      (o) => {
        if (!live) return;
        setRows(o.items.map((item) => ({ item, d: diagnose(item.scores) })));
        setMissing(o.missing);
      },
      (e: unknown) => live && setError(e instanceof ApiError ? e.message : 'เกิดข้อผิดพลาด'),
    );
    return () => { live = false; };
  }, [session]);

  const rooms = useMemo(() => [...new Set([...(rows ?? []).map((r) => r.item.profile.klass), ...missing.map((m) => m.klass)].filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'th', { numeric: true })), [rows, missing]);
  const filtered = useMemo(() => (rows ?? []).filter((r) => {
    const p = r.item.profile;
    if (room && p.klass !== room) return false;
    if (ks && r.d?.ks !== ks) return false;
    if (flag && (r.d?.flag ?? '') !== flag) return false;
    const s = q.trim().toLowerCase();
    return !s || (p.name ?? '').toLowerCase().includes(s) || r.item.user_email.toLowerCase().includes(s) || String(p.no ?? '') === s;
  }).sort((a, b) => Number(a.item.profile.no ?? 1e9) - Number(b.item.profile.no ?? 1e9)), [rows, room, ks, flag, q]);

  if (error) return <p className="notice bad">{error}</p>;
  if (!rows) return <p className="muted center">กำลังโหลดข้อมูลห้อง…</p>;

  const missingHere = missing.filter((m) => !room || m.klass === room).sort((a, b) => (a.klass ?? '').localeCompare(b.klass ?? '', 'th', { numeric: true }) || Number(a.no ?? 1e9) - Number(b.no ?? 1e9));
  const scored = filtered.filter((r) => r.d);
  const exportCsv = () => {
    const head = ['ห้อง', 'เลขที่', 'ชื่อ', 'อีเมล', 'สถานะ', 'ระดับ', 'คะแนน(0-9)', 'ธง', 'TR', 'ME', 'LR', 'GRA', 'CC', 'ส่งล่าสุด'];
    const done = filtered.map((r) => [r.item.profile.klass, r.item.profile.no, r.item.profile.name, r.item.user_email, 'ส่งแล้ว', r.d?.ks, r.d?.total, r.d?.flag, r.d?.rubric.TR, r.d?.rubric.ME, r.d?.rubric.LR, r.d?.rubric.GRA, r.d?.rubric.CC, r.item.created_at]);
    const none = missingHere.map((m) => [m.klass, m.no, m.name, '', 'ยังไม่ส่ง']);
    download(`learning-${room || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([head, ...done, ...none]));
  };
  const count = (f: (d: Diagnosis) => boolean) => scored.filter((r) => f(r.d!)).length;
  const dist = Array.from({ length: 10 }, (_, n) => count((d) => d.total === n));
  const maxBar = Math.max(1, ...dist);
  const selected = rows.find((r) => r.item.id === sel);

  return (
    <>
      <section className="card">
        <h3>ภาพรวม {room || 'ทุกห้อง'}</h3>
        <div className="stats">
          <div><b>{filtered.length}</b><small>ส่งงานแล้ว</small></div>
          <div className={missingHere.length ? 'warn' : ''}><b>{missingHere.length}</b><small>ยังไม่ส่ง</small></div>
          <div><b>{scored.length}</b><small>วินิจฉัยได้</small></div>
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
      </section>

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
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ / เลขที่ / อีเมล" />
        <button className="btn alt" onClick={exportCsv}>ดาวน์โหลด CSV</button>
      </div>

      {missingHere.length > 0 && (
        <details className="card missing noprint">
          <summary><b>ยังไม่ส่งงาน {missingHere.length} คน</b> <span className="muted small">({room || 'ทุกห้อง'}) กดเพื่อดูรายชื่อ</span></summary>
          <ul>
            {missingHere.map((m, i) => (
              <li key={i}><span className="muted">{m.klass} เลขที่ {m.no ?? '–'}</span> {m.name ?? '(ไม่มีชื่อ)'}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="split">
        <ul className="list" aria-label="รายชื่อนักเรียน">
          {filtered.length === 0 && <li className="muted pad">ไม่พบนักเรียนตามตัวกรอง</li>}
          {filtered.map((r) => (
            <li key={r.item.id}>
              <button className={`row${sel === r.item.id ? ' active' : ''}`} onClick={() => setSel(r.item.id)}>
                <span className="no">{r.item.profile.no ?? '–'}</span>
                <span className="nm">{r.item.profile.name ?? r.item.user_email}<small>{r.item.profile.klass ?? ''}</small></span>
                {r.d ? <><KsPill ks={r.d.ks} />{r.d.flag !== 'OK' && <span className={`fl ${r.d.flag.toLowerCase()}`}>{r.d.flag[0]}</span>}</> : <span className="muted small">คะแนนไม่ครบ</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="detail">
          {!selected && <p className="muted center">เลือกนักเรียนเพื่อดูรายงานรายบุคคล</p>}
          {selected && (
            <>
              <h2>{selected.item.profile.name ?? selected.item.user_email} <small className="muted">{selected.item.profile.klass} เลขที่ {selected.item.profile.no ?? '–'}</small></h2>
              {selected.d ? <Report d={selected.d} title="ระดับ" onPrint={() => window.print()} /> : <p className="notice">ยังไม่มีคะแนนครบ 5 ด้าน จึงวินิจฉัยไม่ได้</p>}
            </>
          )}
        </div>
      </div>
    </>
  );
}
