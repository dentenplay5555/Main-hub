import Radar from './Radar';
import { CRITERIA, FLAG_INFO, badgesFor, stepsFor, type Diagnosis } from './lib/diagnose.ts';

const KS_TH: Record<string, string> = {
  Beginner: 'เริ่มต้น', 'Structure OK': 'โครงสร้างพอใช้', 'Language Dev': 'กำลังพัฒนาภาษา', Mastery: 'เชี่ยวชาญ',
};

export function KsPill({ ks }: { ks: string }) {
  return <span className={`pill ks-${ks.replace(/\s+/g, '').toLowerCase()}`}>{ks}</span>;
}

/** One student's diagnostic report: radar, level, flag, badges, next steps. Used by both student and teacher views. */
export default function Report({ d, onPrint, title = 'ระดับของคุณ' }: { d: Diagnosis; onPrint?: () => void; title?: string }) {
  const flag = FLAG_INFO[d.flag];
  const steps = stepsFor(d.ks, d.flag);
  const badges = badgesFor(d.rubric);
  return (
    <div className="report">
      <div className="grid2">
        <section className="card">
          <h3>สมรรถนะ 5 ด้าน</h3>
          <Radar rubric={d.rubric} />
          <div className="chips">
            {CRITERIA.map((c) => (
              <span key={c} className="chip"><b>{c}</b> {d.rubric[c] ?? '–'}/5</span>
            ))}
          </div>
        </section>
        <section className="card">
          <h3>{title}</h3>
          <div className="level">
            <KsPill ks={d.ks} />
            <span className="muted">{KS_TH[d.ks]}</span>
          </div>
          <div className="dots" aria-label={`คะแนน ${d.total} จาก 9`}>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={i < d.total ? 'dot on' : 'dot'}>{i + 1}</span>
            ))}
          </div>
          <p className="muted small">คะแนนรวม {d.total}/9</p>
          <div className={`flag ${flag.tone}`}>
            <b>{flag.title}</b>
            <p>{flag.text}</p>
          </div>
        </section>
      </div>

      <section className="card">
        <h3>ขั้นตอนต่อไป</h3>
        <ol className="steps">
          {steps.map((s) => (
            <li key={s.text} className={`step ${s.level}`}>
              <span className="tag">{s.level === 'urgent' ? 'ทำก่อน' : s.level === 'do' ? 'ทำต่อ' : 'ต่อยอด'}</span>
              {s.text}
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h3>เหรียญรางวัล</h3>
        <div className="badges">
          {badges.map((b) => (
            <div key={b.name} className={`badge${b.earned ? ' earned' : ''}`} title={b.future ? 'รอข้อมูลรอบถัดไป' : b.desc}>
              <span className="ico">{b.icon}</span>
              <b>{b.name}</b>
              <small>{b.future ? 'เร็ว ๆ นี้' : b.desc}</small>
            </div>
          ))}
        </div>
      </section>
      {onPrint && <button className="btn alt noprint" onClick={onPrint}>พิมพ์ใบแจ้งผล</button>}
    </div>
  );
}
