import React, { useEffect, useState } from 'react';
import type { UserMe, Role } from './types';
import { authApi } from './lib/api';

// Layout
import { StarfallBackground } from './components/StarfallBackground';

// Pages
import { LoginPageNew } from './pages/LoginPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { StudentExercisesPage } from './pages/student/StudentExercisesPage';
import { StudentResultPage } from './pages/student/StudentResultPage';
import { TeacherReportPage } from './pages/teacher/TeacherReportPage';
import { TeacherStatusPage } from './pages/teacher/TeacherStatusPage';
import { TeacherStudentResultPage } from './pages/teacher/TeacherStudentResultPage';
import { DevExercisesPage } from './pages/dev/DevExercisesPage';
import { DevLogsPage } from './pages/dev/DevLogsPage';
import { DevUsersPage } from './pages/dev/DevUsersPage';

// --- Route Types ---
type Route =
  | { page: 'login' }
  | { page: 'forbidden' }
  | { page: 'student/exercises' }
  | { page: 'student/result'; exId: string }
  | { page: 'teacher' }
  | { page: 'teacher/report'; exId: string; classId: string }
  | { page: 'teacher/status'; exId: string; classId: string }
  | { page: 'teacher/student'; exId: string; userId: string; classId: string }
  | { page: 'dev/exercises' }
  | { page: 'dev/logs' }
  | { page: 'dev/users' };

// App is served under a sub-path (e.g. /dentenplay-hub/exam/) — keep all URLs relative to it.
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
function stripBase(path: string): string {
  return BASE && path.startsWith(BASE) ? path.slice(BASE.length) || '/' : path;
}

export function pathToRoute(path: string): Route | null {
  const p = stripBase(path).replace(/\/$/, '') || '/';
  if (p === '/login') return { page: 'login' };
  if (p === '/forbidden') return { page: 'forbidden' };
  if (p === '/student' || p === '/student/exercises') return { page: 'student/exercises' };
  const studentResultMatch = p.match(/^\/student\/result\/([^/]+)/);
  if (studentResultMatch) return { page: 'student/result', exId: decodeURIComponent(studentResultMatch[1]) };
  if (p === '/teacher') return { page: 'teacher' };
  const teacherReportMatch = p.match(/^\/teacher\/report\/([^/]+)\/([^/]+)/);
  if (teacherReportMatch) return { page: 'teacher/report', exId: decodeURIComponent(teacherReportMatch[1]), classId: decodeURIComponent(teacherReportMatch[2]) };
  const teacherStatusMatch = p.match(/^\/teacher\/status\/([^/]+)\/([^/]+)/);
  if (teacherStatusMatch) return { page: 'teacher/status', exId: decodeURIComponent(teacherStatusMatch[1]), classId: decodeURIComponent(teacherStatusMatch[2]) };
  const teacherStudentMatch = p.match(/^\/teacher\/student\/([^/]+)\/([^/]+)/);
  if (teacherStudentMatch) return { page: 'teacher/student', exId: decodeURIComponent(teacherStudentMatch[1]), userId: decodeURIComponent(teacherStudentMatch[2]), classId: 'ม.3/1' };
  if (p === '/dev/exercises') return { page: 'dev/exercises' };
  if (p === '/dev/logs') return { page: 'dev/logs' };
  if (p === '/dev/users') return { page: 'dev/users' };
  return null;
}

export function routeToPath(route: Route): string {
  return BASE + rawRouteToPath(route);
}

function rawRouteToPath(route: Route): string {
  switch (route.page) {
    case 'login': return '/login';
    case 'forbidden': return '/forbidden';
    case 'student/exercises': return '/student';
    case 'student/result': return `/student/result/${encodeURIComponent(route.exId)}`;
    case 'teacher': return '/teacher';
    case 'teacher/report': return `/teacher/report/${encodeURIComponent(route.exId)}/${encodeURIComponent(route.classId)}`;
    case 'teacher/status': return `/teacher/status/${encodeURIComponent(route.exId)}/${encodeURIComponent(route.classId)}`;
    case 'teacher/student': return `/teacher/student/${encodeURIComponent(route.exId)}/${encodeURIComponent(route.userId)}`;
    case 'dev/exercises': return '/dev/exercises';
    case 'dev/logs': return '/dev/logs';
    case 'dev/users': return '/dev/users';
  }
}

// Default route per role
function defaultRouteForRole(role: Role): Route {
  if (role === 'student') return { page: 'student/exercises' };
  if (role === 'teacher') return { page: 'teacher' };
  return { page: 'dev/exercises' };
}

// Route guard: which roles can access which page
function canAccess(route: Route, role: Role): boolean {
  if (route.page === 'login' || route.page === 'forbidden') return true;
  if (route.page.startsWith('student/')) return role === 'student' || role === 'dev';
  if (route.page === 'teacher' || route.page.startsWith('teacher/')) return role === 'teacher' || role === 'dev';
  if (route.page.startsWith('dev/')) return role === 'dev';
  return false;
}

// Top Navbar for logged-in state
const Navbar: React.FC<{
  user: UserMe;
  route: Route;
  onNavigate: (r: Route) => void;
  onLogout: () => void;
}> = ({ user, route, onNavigate, onLogout }) => {
  const roleLabel = user.role === 'student' ? 'นักเรียน' : user.role === 'teacher' ? 'ครูผู้สอน' : 'Dev Admin';
  const roleColor = user.role === 'student' ? 'var(--accent-cyan)' : user.role === 'teacher' ? 'var(--accent-emerald)' : 'var(--accent-purple)';

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'rgba(6, 14, 28, 0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      gap: 16
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 16,
          fontWeight: 800,
          color: 'var(--accent-cyan)',
          letterSpacing: '-0.01em'
        }}>
          Practice Hub
        </span>
        <span style={{
          fontSize: 10,
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: `${roleColor}18`,
          color: roleColor,
          border: `1px solid ${roleColor}35`,
          fontWeight: 700
        }}>
          {roleLabel}
        </span>
      </div>

      {/* Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
        {user.role === 'student' && (
          <NavButton
            active={route.page === 'student/exercises'}
            onClick={() => onNavigate({ page: 'student/exercises' })}
          >งานของฉัน</NavButton>
        )}
        {(user.role === 'teacher' || user.role === 'dev') && (
          <>
            <NavButton
              active={route.page === 'teacher'}
              onClick={() => onNavigate({ page: 'teacher' })}
            >เลือกห้อง/แบบฝึก</NavButton>
            <NavButton
              active={route.page === 'teacher/report'}
              onClick={() => onNavigate({ page: 'teacher/report', exId: 'prism-fanboys-pretest', classId: user.classes?.[0] || 'ม.3/1' })}
            >รายงานห้อง</NavButton>
            <NavButton
              active={route.page === 'teacher/status'}
              onClick={() => onNavigate({ page: 'teacher/status', exId: 'prism-fanboys-pretest', classId: user.classes?.[0] || 'ม.3/1' })}
            >ใครส่ง/ไม่ส่ง</NavButton>
          </>
        )}
        {user.role === 'dev' && (
          <>
            <NavButton active={route.page === 'dev/exercises'} onClick={() => onNavigate({ page: 'dev/exercises' })}>
              Exercise Registry
            </NavButton>
            <NavButton active={route.page === 'dev/logs'} onClick={() => onNavigate({ page: 'dev/logs' })}>
              Logs
            </NavButton>
            <NavButton active={route.page === 'dev/users'} onClick={() => onNavigate({ page: 'dev/users' })}>
              Users
            </NavButton>
          </>
        )}
      </div>

      {/* User + Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{user.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{user.email}</div>
        </div>
        <button
          onClick={onLogout}
          className="btn-secondary"
          style={{ fontSize: 12, padding: '6px 12px' }}
        >
          ออกจากระบบ
        </button>
      </div>
    </nav>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '6px 12px',
      borderRadius: 'var(--radius-sm)',
      fontSize: 13,
      fontWeight: active ? 700 : 500,
      backgroundColor: active ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
      color: active ? 'var(--accent-cyan)' : 'var(--text-muted)',
      border: active ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
      whiteSpace: 'nowrap',
      minHeight: 36
    }}
  >
    {children}
  </button>
);

// --- Teacher Picker Panel (for teacher home) ---
const TeacherPicker: React.FC<{
  onNavigate: (r: Route) => void;
  user: UserMe;
}> = ({ onNavigate, user }) => {
  const classes = user.classes?.length ? user.classes : ['ม.3/1', 'ม.3/2'];
  const exercises = [
    { id: 'prism-fanboys-pretest', name: 'PRISM · FANBOYS · Pretest' },
    { id: 'prism-fanboys-c1', name: 'PRISM · FANBOYS · Cycle 1' },
    { id: 'prism-fanboys-c2', name: 'PRISM · FANBOYS · Cycle 2' },
    { id: 'prism-fanboys-post', name: 'PRISM · FANBOYS · Post-Test' }
  ];
  const [selEx, setSelEx] = useState(exercises[0].id);
  const [selCls, setSelCls] = useState(classes[0]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>
          สวัสดี, {user.name}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          เลือกห้องเรียนและชุดแบบฝึกหัดเพื่อดูรายงาน
        </p>
      </div>

      <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            ห้องเรียน
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {classes.map(cls => (
              <button
                key={cls}
                onClick={() => setSelCls(cls)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${selCls === cls ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  backgroundColor: selCls === cls ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: selCls === cls ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  fontSize: 14,
                  fontWeight: selCls === cls ? 700 : 500,
                  minHeight: 44
                }}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            ชุดแบบฝึกหัด
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exercises.map(ex => (
              <button
                key={ex.id}
                onClick={() => setSelEx(ex.id)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${selEx === ex.id ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  backgroundColor: selEx === ex.id ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  color: selEx === ex.id ? '#fff' : 'var(--text-muted)',
                  fontSize: 13,
                  fontWeight: selEx === ex.id ? 600 : 400,
                  textAlign: 'left',
                  minHeight: 44
                }}
              >
                {ex.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
          <button
            onClick={() => onNavigate({ page: 'teacher/report', exId: selEx, classId: selCls })}
            className="btn-primary"
            style={{ flex: 1, fontSize: 14 }}
          >
            ดูรายงานรวมห้อง →
          </button>
          <button
            onClick={() => onNavigate({ page: 'teacher/status', exId: selEx, classId: selCls })}
            className="btn-secondary"
            style={{ flex: 1, fontSize: 14 }}
          >
            ใครส่ง/ไม่ส่ง →
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---
export function App() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [route, setRoute] = useState<Route>({ page: 'login' });
  const [toast, setToast] = useState<string | null>(null);

  const isDevMock = import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK === 'true';

  // On mount: check session from /api/me and sync with browser URL
  useEffect(() => {
    (async () => {
      let loggedUser: UserMe | null = null;
      try {
        const me = await authApi.getMe();
        loggedUser = me;
      } catch {
        if (isDevMock) {
          const mockRole = localStorage.getItem('practice_hub_mock_role') as Role | null;
          if (mockRole) {
            loggedUser = {
              id: 'mock-usr',
              name: mockRole === 'student' ? 'ด.ช. กฤษณะ วงศ์สวัสดิ์ (Dev Mock)' : mockRole === 'teacher' ? 'อาจารย์สมเกียรติ ยิ่งเจริญ (Dev Mock)' : 'Dev Admin (Dev Mock)',
              email: mockRole === 'student' ? 'student@demo.local' : mockRole === 'teacher' ? 'teacher@demo.local' : 'dev@demo.local',
              role: mockRole,
              classes: ['ม.3/1', 'ม.3/2', 'ม.3/3', 'ม.3/4']
            };
          }
        }
      }

      setUser(loggedUser);
      setAuthChecked(true);

      const urlRoute = pathToRoute(window.location.pathname);
      if (!loggedUser) {
        setRoute({ page: 'login' });
        if (window.location.pathname !== `${BASE}/login`) {
          window.history.replaceState(null, '', `${BASE}/login`);
        }
      } else if (urlRoute && canAccess(urlRoute, loggedUser.role)) {
        setRoute(urlRoute);
      } else {
        const def = defaultRouteForRole(loggedUser.role);
        setRoute(def);
        window.history.replaceState(null, '', routeToPath(def));
      }
    })();
  }, [isDevMock]);

  // Listen to browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const r = pathToRoute(window.location.pathname);
      if (r) {
        setRoute(r);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleDemoLogin = isDevMock ? (role: Role) => {
    localStorage.setItem('practice_hub_mock_role', role);
    const mockUser: UserMe = {
      id: `mock-${role}`,
      name: role === 'student' ? 'ด.ช. กฤษณะ วงศ์สวัสดิ์ (Dev Mock)' : role === 'teacher' ? 'อาจารย์สมเกียรติ ยิ่งเจริญ (Dev Mock)' : 'Dev Admin (Dev Mock)',
      email: role === 'student' ? 'student@demo.local' : role === 'teacher' ? 'teacher@demo.local' : 'dev@demo.local',
      role,
      classes: ['ม.3/1', 'ม.3/2', 'ม.3/3', 'ม.3/4']
    };
    setUser(mockUser);
    const def = defaultRouteForRole(role);
    setRoute(def);
    window.history.pushState(null, '', routeToPath(def));
  } : undefined;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    localStorage.removeItem('practice_hub_mock_role');
    setUser(null);
    setRoute({ page: 'login' });
    window.history.pushState(null, '', `${BASE}/login`);
  };

  const navigate = (r: Route) => {
    if (!user) {
      setRoute({ page: 'login' });
      window.history.pushState(null, '', `${BASE}/login`);
      return;
    }
    if (!canAccess(r, user.role)) {
      setRoute({ page: 'forbidden' });
      window.history.pushState(null, '', `${BASE}/forbidden`);
      return;
    }
    setRoute(r);
    window.history.pushState(null, '', routeToPath(r));
    window.scrollTo(0, 0);
  };

  // Loading state (checking auth)
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#060e1c' }}>
        <StarfallBackground />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid rgba(56,189,248,0.3)', borderTopColor: '#38bdf8', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>กำลังตรวจสอบ session...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in
  if (!user || route.page === 'login') {
    return <LoginPageNew onDemoLogin={handleDemoLogin} />;
  }

  // Forbidden
  if (route.page === 'forbidden') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <StarfallBackground />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Navbar user={user} route={route} onNavigate={navigate} onLogout={handleLogout} />
          <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
            <ForbiddenPage onGoBack={() => navigate(defaultRouteForRole(user.role))} />
          </main>
        </div>
      </div>
    );
  }

  // Route guard
  if (!canAccess(route, user.role)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <StarfallBackground />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Navbar user={user} route={route} onNavigate={navigate} onLogout={handleLogout} />
          <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
            <ForbiddenPage onGoBack={() => navigate(defaultRouteForRole(user.role))} />
          </main>
        </div>
      </div>
    );
  }

  // Render page content
  const renderPage = () => {
    switch (route.page) {
      case 'student/exercises':
        return (
          <StudentExercisesPage
            onSelectResult={(exId) => navigate({ page: 'student/result', exId })}
          />
        );

      case 'student/result':
        return (
          <StudentResultPage
            exId={route.exId}
            onBack={() => navigate({ page: 'student/exercises' })}
            onSelectExercise={(exId) => navigate({ page: 'student/result', exId })}
          />
        );

      case 'teacher':
        return <TeacherPicker user={user} onNavigate={navigate} />;

      case 'teacher/report':
        return (
          <TeacherReportPage
            exId={route.exId}
            classId={route.classId}
            onSelectClass={(classId) => navigate({ page: 'teacher/report', exId: route.exId, classId })}
            onSelectExercise={(exId) => navigate({ page: 'teacher/report', exId, classId: route.classId })}
            onViewStudentDetail={(userId) => navigate({ page: 'teacher/student', exId: route.exId, userId, classId: route.classId })}
            onViewSubmissionStatus={() => navigate({ page: 'teacher/status', exId: route.exId, classId: route.classId })}
          />
        );

      case 'teacher/status':
        return (
          <TeacherStatusPage
            exId={route.exId}
            classId={route.classId}
            onBack={() => navigate({ page: 'teacher/report', exId: route.exId, classId: route.classId })}
          />
        );

      case 'teacher/student':
        return (
          <TeacherStudentResultPage
            exId={route.exId}
            userId={route.userId}
            classId={route.classId}
            onBack={() => navigate({ page: 'teacher/report', exId: route.exId, classId: route.classId })}
          />
        );

      case 'dev/exercises':
        return (
          <DevExercisesPage
            onNavigateLogs={() => navigate({ page: 'dev/logs' })}
            onNavigateUsers={() => navigate({ page: 'dev/users' })}
          />
        );

      case 'dev/logs':
        return (
          <DevLogsPage
            onNavigateExercises={() => navigate({ page: 'dev/exercises' })}
            onNavigateUsers={() => navigate({ page: 'dev/users' })}
          />
        );

      case 'dev/users':
        return (
          <DevUsersPage
            onNavigateExercises={() => navigate({ page: 'dev/exercises' })}
            onNavigateLogs={() => navigate({ page: 'dev/logs' })}
          />
        );

      default:
        return <TeacherPicker user={user} onNavigate={navigate} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <StarfallBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Navbar
          user={user}
          route={route}
          onNavigate={navigate}
          onLogout={handleLogout}
        />

        <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '32px 20px' }}>
          {renderPage()}
        </main>

        <footer style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '14px 24px',
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--text-dim)',
          backgroundColor: 'rgba(6, 14, 28, 0.8)'
        }}>
          Practice Hub · PRISM CbKST Diagnostic Framework · โรงเรียนนครสวรรค์ · Cloudflare Workers D1 · 2026
        </footer>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          backgroundColor: '#0a1628',
          border: '1px solid var(--accent-emerald)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 9999,
          fontSize: 13,
          color: '#fff',
          animation: 'slideUp 0.2s ease-out'
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
