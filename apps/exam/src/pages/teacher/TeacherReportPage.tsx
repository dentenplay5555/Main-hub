import React, { useEffect, useState } from 'react';
import type { TeacherReportPayload } from '../../types';
import { teacherApi } from '../../lib/api';
import { StatCard } from '../../components/common/StatCard';
import { ItemDifficulty } from '../../components/common/ItemDifficulty';
import { ScoreDist } from '../../components/common/ScoreDist';
import { StudentList } from '../../components/common/StudentList';
import { PrintButton } from '../../components/common/PrintButton';
import { ExportCsvButton } from '../../components/common/ExportCsvButton';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { Users, TrendingUp, Award, AlertTriangle, Layers, Sliders, CheckCircle2, Clock } from 'lucide-react';

interface TeacherReportPageProps {
  exId: string;
  classId: string;
  onSelectClass: (classId: string) => void;
  onSelectExercise: (exId: string) => void;
  onViewStudentDetail: (userId: string) => void;
  onViewSubmissionStatus: () => void;
}

export const TeacherReportPage: React.FC<TeacherReportPageProps> = ({
  exId,
  classId,
  onSelectClass,
  onSelectExercise,
  onViewStudentDetail,
  onViewSubmissionStatus
}) => {
  const [data, setData] = useState<TeacherReportPayload | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKSFilter, setSelectedKSFilter] = useState<string>('ALL');

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportData, classesList] = await Promise.all([
        teacherApi.getReport(exId, classId),
        teacherApi.getClasses()
      ]);
      setData(reportData);
      setClasses(classesList);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดรายงานชั้นเรียนได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [exId, classId]);

  const handleExportCsv = () => {
    if (!data) return;
    const headers = ['เลขที่', 'ชื่อ-นามสกุล', 'TR', 'ME', 'LR', 'GRA', 'CC', 'รวม 25', 'tot 9', 'Knowledge State', 'Flag'];
    const rows = data.students.map(s => [
      s.no,
      `"${s.name}"`,
      s.scores.TR,
      s.scores.ME,
      s.scores.LR,
      s.scores.GRA,
      s.scores.CC,
      s.rubricTotal,
      s.tot,
      s.ks,
      s.flag
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Report_${classId}_${exId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={50} borderRadius={12} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height={120} borderRadius={12} />)}
        </div>
        <Skeleton height={300} borderRadius={12} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchReport} />;
  }

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Top Filter & Class Selector Bar (Rule 3) */}
      <div className="glass-card no-print" style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>
              รายงานรวมห้อง (Class Aggregate Report)
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              <span>แบบฝึกหัด: <strong style={{ color: 'var(--accent-cyan)' }}>{data.exercise.name}</strong></span>
              <span>·</span>
              <span style={{ color: 'var(--accent-emerald)' }}>ข้อมูลล่าสุดเมื่อ: {data.asOf}</span>
            </div>
          </div>
        </div>

        {/* Dropdowns & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Class Dropdown */}
          <select
            value={classId}
            onChange={e => onSelectClass(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-deep)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: 600,
              outline: 'none'
            }}
          >
            {classes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* View Submission Status Button */}
          <button
            onClick={onViewSubmissionStatus}
            className="btn-secondary"
            style={{ fontSize: 13, padding: '7px 14px' }}
          >
            <Clock size={15} />
            <span>เช็กใครส่ง/ไม่ส่ง ({data.stats.submitted}/{data.class.students})</span>
          </button>

          {/* Always Visible: Print & Export CSV (Rule 3) */}
          <ExportCsvButton onExport={handleExportCsv} />
          <PrintButton />
        </div>
      </div>

      {/* Top 4 KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard
          title="ส่งแล้ว / ทั้งหมด"
          value={`${data.stats.submitted} / ${data.class.students}`}
          subValue={`(${Math.round((data.stats.submitted / data.class.students) * 100)}%)`}
          icon={<Users size={18} color="var(--accent-cyan)" />}
          trendText={`ยังไม่ส่ง ${data.stats.notSubmitted} คน`}
          trendColor="var(--accent-rose)"
        />

        <StatCard
          title="คะแนนเฉลี่ยรูบริก 5 มิติ"
          value={data.stats.avgRubric}
          subValue="/ 25.0"
          icon={<TrendingUp size={18} color="var(--accent-emerald)" />}
          trendText="เกณฑ์เฉลี่ยระดับน่าพอใจ"
          trendColor="var(--accent-emerald)"
        />

        <StatCard
          title="ค่าเฉลี่ยข้อที่ผ่าน (CbKST)"
          value={data.stats.avgTot}
          subValue="/ 9 items"
          icon={<Award size={18} color="var(--accent-indigo)" />}
          trendText="เทียบเท่า Level 3-4"
          trendColor="var(--accent-indigo)"
        />

        <StatCard
          title="สัญญาณข้อผิดพลาด"
          value={`${data.stats.careless} Careless`}
          subValue={`· ${data.stats.lucky} Lucky`}
          icon={<AlertTriangle size={18} color="#fb923c" />}
          trendText="คลิกดูรายชื่อในตาราง"
          trendColor="#fb923c"
        />
      </div>

      {/* Insights Alert (Rule 3: red/amber/green) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.insights.map((ins, idx) => {
          const colorMap = {
            green: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399' },
            amber: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
            red: { bg: 'rgba(244, 63, 94, 0.1)', border: 'rgba(244, 63, 94, 0.3)', text: '#fb7185' }
          }[ins.level];
          return (
            <div
              key={idx}
              style={{
                backgroundColor: colorMap.bg,
                border: `1px solid ${colorMap.border}`,
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: 13,
                color: colorMap.text,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colorMap.text }} />
              <span>{ins.text}</span>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts Grid: Knowledge State, Pass Rate, Difficulty, Score Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Knowledge State Distribution */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>
              การกระจายกลุ่ม Knowledge State
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>คลิกเพื่อกรอง</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.knowledgeStates.map(ks => (
              <div
                key={ks.name}
                onClick={() => setSelectedKSFilter(selectedKSFilter === ks.name ? 'ALL' : ks.name)}
                className="interactive-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: selectedKSFilter === ks.name ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: selectedKSFilter === ks.name ? '1px solid var(--accent-cyan)' : '1px solid transparent'
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{ks.name}</span>
                <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                  <strong style={{ color: 'var(--accent-cyan)' }}>{ks.count} คน</strong>
                  <span style={{ color: 'var(--text-dim)' }}>({ks.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5 Competency Pass Rates */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>
              สมรรถนะ 5 ด้าน (% ผ่าน + ค่าเฉลี่ย)
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>เกณฑ์ผ่าน ≥ 3.0</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.skills.map(s => (
              <div key={s.code}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{s.code} ({s.name})</span>
                  <span>
                    <strong style={{ color: 'var(--accent-emerald)' }}>ผ่าน {s.passPct}%</strong>
                    <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>เฉลี่ย {s.avg}/5</span>
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.passPct}%`, backgroundColor: 'var(--accent-cyan)', borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Item Difficulty */}
        <ItemDifficulty items={data.itemDifficulty} />

        {/* Score Distribution */}
        <ScoreDist distribution={data.scoreDistribution} />
      </div>

      {/* Student List Table */}
      <StudentList
        students={data.students}
        onSelectStudent={s => onViewStudentDetail(s.userId)}
        selectedStateFilter={selectedKSFilter}
      />

      {/* Table "ใครยังไม่ส่ง" (Rule 3) */}
      {data.pending.length > 0 && (
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid var(--accent-rose)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-rose)', margin: '0 0 12px' }}>
            รายชื่อนักเรียนที่ยังไม่ส่งงาน ({data.pending.length} คน)
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.pending.map(p => (
              <span
                key={p.no}
                style={{
                  fontSize: 12,
                  backgroundColor: 'rgba(244, 63, 94, 0.1)',
                  color: '#fb7185',
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(244, 63, 94, 0.25)'
                }}
              >
                เลขที่ {p.no} - {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
