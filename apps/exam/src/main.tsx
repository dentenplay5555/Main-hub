import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#050b14',
          color: '#fff',
          padding: 24,
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            maxWidth: 500,
            backgroundColor: '#0a1526',
            border: '1px solid #f43f5e',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#fb7185', marginBottom: 12 }}>เกิดข้อผิดพลาดในการโหลดหน้าเว็บ</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
              {this.state.error?.message || 'ระบบเกิดปัญหาบางอย่าง'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#38bdf8',
                color: '#050b14',
                fontWeight: 700,
                border: 'none',
                padding: '10px 20px',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              รีเฟรชหน้าเว็บ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
