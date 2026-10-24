import React, { useState } from 'react';
import type { TeacherReportPayload } from '../../types';
import { Search, Eye, AlertTriangle } from 'lucide-react';

interface StudentListProps {
  students: TeacherReportPayload['students'];
  onSelectStudent: (student: TeacherReportPayload['students'][0]) => void;
  selectedStateFilter?: string;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onSelectStudent,
  selectedStateFilter
}) => {
  const [search, setSearch] = useState('');
  const [filterKS, setFilterKS] = useState<string>(selectedStateFilter || 'ALL');
  const [filterFlag, setFilterFlag] = useState<string>('ALL');

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.no.toString().includes(search);
    const matchKS = filterKS === 'ALL' || s.ks === filterKS;
    const matchFlag = filterFlag === 'ALL' || s.flag === filterFlag;
    return matchSearch && matchKS && matchFlag;
  });

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'var(--bg-deep)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 12px',
          width: '100%',
          maxWidth: 280
        }}>
          <Search size={15} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือเลขที่..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: 13,
              width: '100%'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={filterKS}
            onChange={e => setFilterKS(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-deep)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              padding: '6px 10px',
              fontSize: 12,
              outline: 'none'
            }}
          >
            <option value="ALL">กลุ่ม KS ทั้งหมด</option>
            <option value="Mastery">Mastery</option>
            <option value="Language Dev">Language Dev</option>
            <option value="Structure OK">Structure OK</option>
            <option value="Beginner">Beginner</option>
          </select>

          <select
            value={filterFlag}
            onChange={e => setFilterFlag(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-deep)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              padding: '6px 10px',
              fontSize: 12,
              outline: 'none'
            }}
          >
            <option value="ALL">Flag ทั้งหมด</option>
            <option value="OK">ปกติ (OK)</option>
            <option value="Careless">Careless</option>
            <option value="Lucky">Lucky</option>
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px' }}>เลขที่</th>
              <th style={{ padding: '10px' }}>ชื่อ-นามสกุล</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>TR</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>ME</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>LR</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>GRA</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>CC</th>
              <th style={{ padding: '10px', textAlign: 'center', color: 'var(--accent-emerald)' }}>รวม /25</th>
              <th style={{ padding: '10px', textAlign: 'center', color: 'var(--accent-cyan)' }}>tot /9</th>
              <th style={{ padding: '10px' }}>Knowledge State</th>
              <th style={{ padding: '10px' }}>Flag</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>ดูผล</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr
                key={s.userId}
                onClick={() => onSelectStudent(s)}
                className="interactive-card"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <td style={{ padding: '10px', fontWeight: 700, color: '#fff' }}>{s.no}</td>
                <td style={{ padding: '10px', fontWeight: 600, color: '#fff' }}>{s.name}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: s.scores.TR >= 3 ? '#fff' : 'var(--accent-rose)' }}>{s.scores.TR}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: s.scores.ME >= 3 ? '#fff' : 'var(--accent-rose)' }}>{s.scores.ME}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: s.scores.LR >= 3 ? '#fff' : 'var(--accent-rose)' }}>{s.scores.LR}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: s.scores.GRA >= 3 ? '#fff' : 'var(--accent-rose)' }}>{s.scores.GRA}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: s.scores.CC >= 3 ? '#fff' : 'var(--accent-rose)' }}>{s.scores.CC}</td>
                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: 'var(--accent-emerald)' }}>{s.rubricTotal}</td>
                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: 'var(--accent-cyan)' }}>{s.tot}</td>
                <td style={{ padding: '10px' }}>
                  <span className={`pill pill-${s.ks.toLowerCase().replace(' ', '-')}`}>
                    {s.ks}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  {s.flag !== 'OK' ? (
                    <span className={`pill pill-${s.flag.toLowerCase()}`}>
                      <AlertTriangle size={12} />
                      <span>{s.flag}</span>
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>OK</span>
                  )}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <button style={{ color: 'var(--accent-cyan)' }}>
                    <Eye size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
