import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { api, auth } from '../lib/api';
import { C } from '../components/ui';

export default function Login() {
  const [email, setEmail] = useState(import.meta.env.DEV ? 'admin@atolye.co' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'admin' : '');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      await api.login(email, password); // token'ı kendi içinde set eder
      navigate('/');
    } catch (ex) {
      setErr(ex.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: C.paper }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-[10px] tracking-[0.3em] uppercase font-mono" style={{ color: C.accent, fontWeight: 600 }}>
            ATÖLYE.CO
          </div>
          <h1 className="text-4xl font-serif mt-2" style={{ color: C.ink, fontWeight: 400, letterSpacing: '-0.02em' }}>
            Giriş <em style={{ color: C.accent }}>yap</em>
          </h1>
          <div className="text-xs mt-1" style={{ color: C.muted }}>
            Smartphone envanter & satış sistemi
          </div>
        </div>

        <div className="border p-6" style={{ background: C.paperLite, borderColor: C.line }}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] font-mono mb-1" style={{ color: C.muted }}>
                Email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-3 py-2.5 text-sm border outline-none font-mono"
                style={{ borderColor: C.line, color: C.ink, background: C.paperLite }} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] font-mono mb-1" style={{ color: C.muted }}>
                Parola
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-3 py-2.5 text-sm border outline-none font-mono"
                style={{ borderColor: C.line, color: C.ink, background: C.paperLite }} />
            </div>
            {err && <div className="text-sm p-3" style={{ background: C.pillBad, color: C.bad }}>{err}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-3 text-xs font-mono inline-flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: C.ink, color: C.paper }}>
              <LogIn size={13} /> {loading ? 'GİRİLİYOR...' : 'GİRİŞ YAP'}
            </button>
          </form>
        </div>

        {import.meta.env.DEV && (
          <div className="mt-6 p-4 border" style={{ borderColor: C.line, borderStyle: 'dashed' }}>
            <div className="text-[10px] tracking-[0.18em] uppercase font-mono mb-2" style={{ color: C.muted }}>
              GELİŞTİRME DEFAULT'U
            </div>
            <div className="space-y-1 text-[11px] font-mono" style={{ color: C.inkSoft }}>
              <div>admin@atolye.co · admin · <span style={{ color: C.muted }}>Admin</span></div>
            </div>
            <div className="mt-2 text-[10px]" style={{ color: C.muted }}>
              Production'a çıkmadan değiştir.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
