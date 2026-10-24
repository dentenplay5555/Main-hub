import { useEffect, useRef, useState } from 'react';
import { apps, type AppEntry } from './apps';

function Tile({ app }: { app: AppEntry }) {
  const live = Boolean(app.href);
  const inner = (
    <>
      <span className="tile-icon" style={{ background: app.color }} aria-hidden="true">
        {app.name.charAt(0)}
      </span>
      <span className="tile-name">{app.name}</span>
      {!live && <span className="tile-soon">เร็ว ๆ นี้</span>}
    </>
  );
  if (!live) return <div className="tile disabled">{inner}</div>;
  return (
    <a
      className="tile"
      href={app.href}
      {...(app.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {inner}
    </a>
  );
}

function Launcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="launcher" ref={ref}>
      <button
        className="launcher-btn"
        aria-label="แอปทั้งหมด"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
          {[3, 11, 19].flatMap((x) => [3, 11, 19].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />))}
        </svg>
      </button>
      {open && (
        <div className="launcher-pop" role="menu">
          {apps.map((app) => (
            <Tile key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <>
      <header className="topbar">
        <span className="brand">Hub</span>
        <Launcher />
      </header>
      <main className="home">
        <h1>เว็บแอปทั้งหมด</h1>
        <p className="lead">กดไอคอนมุมขวาบนเพื่อสลับแอปได้ทุกเมื่อ</p>
        <div className="cards">
          {apps.map((app) => {
            const live = Boolean(app.href);
            const body = (
              <>
                <span className="tile-icon" style={{ background: app.color }} aria-hidden="true">
                  {app.name.charAt(0)}
                </span>
                <span className="card-text">
                  <strong>{app.name}</strong>
                  <span>{app.description}</span>
                </span>
              </>
            );
            return live ? (
              <a
                key={app.id}
                className="card"
                href={app.href}
                {...(app.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {body}
              </a>
            ) : (
              <div key={app.id} className="card disabled">
                {body}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
