import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Undo2 } from 'lucide-react';
import { C } from './ui';

const ToastContext = createContext({ push: () => {} });

let _id = 0;
const nextId = () => ++_id;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = nextId();
    const t = {
      id,
      kind: 'info',
      duration: 4000,
      ...toast,
    };
    setToasts(ts => [...ts, t]);
    if (t.duration > 0) {
      setTimeout(() => remove(id), t.duration);
    }
    return id;
  }, [remove]);

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <ToastViewport toasts={toasts} remove={remove} />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

function ToastViewport({ toasts, remove }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm">
      {toasts.map(t => <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />)}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (toast.duration <= 0) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(pct);
      if (pct === 0) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [toast.duration]);

  const accent = toast.kind === 'success' ? C.ok
    : toast.kind === 'error' ? C.bad
    : toast.kind === 'warn' ? C.warn
    : C.ink;

  const Icon = toast.kind === 'success' ? CheckCircle2
    : toast.kind === 'error' ? AlertCircle
    : Info;

  return (
    <div className="relative flex items-start gap-3 p-3 sm:p-4 shadow-lg overflow-hidden"
      style={{
        background: C.paperLite,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${accent}`,
        color: C.ink,
        minWidth: 280,
      }}>
      <Icon size={16} style={{ color: accent, flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className="text-sm font-mono uppercase tracking-[0.1em] mb-0.5" style={{ color: accent, fontWeight: 600, fontSize: 11 }}>
            {toast.title}
          </div>
        )}
        <div className="text-sm" style={{ color: C.ink }}>{toast.message}</div>
        {toast.action && (
          <button onClick={() => { toast.action.onClick(); onClose(); }}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-1"
            style={{ background: accent, color: C.paper }}>
            <Undo2 size={11} /> {toast.action.label}
          </button>
        )}
      </div>
      <button onClick={onClose} className="flex-shrink-0">
        <X size={14} style={{ color: C.muted }} />
      </button>
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 h-[2px]" style={{
          background: accent,
          width: progress + '%',
          opacity: 0.4,
          transition: 'width 50ms linear',
        }} />
      )}
    </div>
  );
}
