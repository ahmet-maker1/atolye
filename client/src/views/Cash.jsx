import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Plus, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, tl, auth } from '../lib/api';
import { C, Card, KPI, SectionLabel } from '../components/ui';
import { useToast } from '../components/Toast';

const CATEGORIES_IN  = ['Satış', 'Servis tahsilatı', 'Diğer gelir'];
const CATEGORIES_OUT = ['Kira', 'Elektrik', 'Su', 'İnternet', 'Personel', 'Cihaz alımı', 'Parça', 'Vergi', 'Diğer gider'];

export default function Cash() {
  const [summary, setSummary] = useState(null);
  const [flow, setFlow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState('hepsi');
  const [showForm, setShowForm] = useState(false);
  const user = auth.getUser();
  const canEdit = user && (user.role === 'Admin' || user.role === 'Kasiyer');

  const load = async () => {
    try {
      const [s, f] = await Promise.all([api.cashSummary(), api.cashList({ limit: 100 })]);
      setSummary(s);
      setFlow(f);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (err) return <div className="p-6" style={{ color: C.bad }}>Hata: {err}</div>;
  if (loading || !summary) return <div className="p-6 text-xs font-mono" style={{ color: C.muted }}>yükleniyor...</div>;

  const filtered = filter === 'hepsi' ? flow : flow.filter(f => f.type === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] tracking-[0.25em] uppercase font-mono mb-2" style={{ color: C.muted }}>
            — KASA / FİNANSAL AKIŞ
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif" style={{ fontWeight: 400, letterSpacing: '-0.03em', color: C.ink }}>
            Kasa hareketleri
          </h1>
        </div>
        <div className="flex items-end gap-3">
          <div className="text-right">
            <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>Güncel bakiye</div>
            <div className="text-3xl sm:text-4xl font-serif" style={{ color: summary.balance >= 0 ? C.ink : C.bad }}>
              {tl(summary.balance)}
            </div>
          </div>
          {canEdit && (
            <button onClick={() => setShowForm(true)}
              className="px-3 py-2 text-xs inline-flex items-center gap-2 font-mono"
              style={{ background: C.ink, color: C.paper }}>
              <Plus size={14} /> HAREKET
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPI label="Bugün Net" value={tl(summary.todayNet)}
          sub={`Gelir ${tl(summary.todayIn)} · Gider ${tl(summary.todayOut)}`} accent />
        <KPI label="Toplam Gelir" value={tl(summary.totalIn)} sub="tüm zamanlar" />
        <KPI label="Toplam Gider" value={tl(summary.totalOut)} sub="tüm zamanlar" />
        <KPI label="Net" value={tl(summary.balance)} sub="gelir − gider" />
      </div>

      {/* 30-day chart */}
      <Card>
        <SectionLabel num="01" label="Son 30 gün — gelir / gider" />
        {summary.byDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={summary.byDay.map(d => ({ d: d.d.slice(5), gelir: d.gelir, gider: d.gider }))}>
              <defs>
                <linearGradient id="gGelir" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.ok} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={C.ok} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGider" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.bad} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={C.bad} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={C.line} strokeDasharray="2 4" />
              <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 10, fontFamily: 'JetBrains Mono' }}
                tickFormatter={v => v >= 1000 ? (v/1000)+'k' : v} />
              <Tooltip contentStyle={{ background: C.ink, border: 'none', color: C.paper, fontSize: 12, fontFamily: 'JetBrains Mono' }}
                formatter={v => tl(v)} />
              <Area type="monotone" dataKey="gelir" stroke={C.ok} strokeWidth={2} fill="url(#gGelir)" />
              <Area type="monotone" dataKey="gider" stroke={C.bad} strokeWidth={2} fill="url(#gGider)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[240px] flex items-center justify-center text-sm" style={{ color: C.muted }}>
            Henüz kasa hareketi yok.
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionLabel num="02" label="Son hareketler" right={
            <div className="flex gap-1 text-[10px] tracking-[0.15em] uppercase font-mono">
              {['hepsi', 'in', 'out'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-2 py-0.5"
                  style={{
                    background: filter === f ? C.ink : 'transparent',
                    color: filter === f ? C.paper : C.muted,
                  }}>
                  {f === 'in' ? 'gelir' : f === 'out' ? 'gider' : f}
                </button>
              ))}
            </div>
          } />
          <div>
            {filtered.length === 0 && (
              <div className="py-10 text-center text-sm" style={{ color: C.muted }}>Kayıt yok.</div>
            )}
            {filtered.slice(0, 30).map(f => (
              <div key={f.id} className="flex items-center justify-between py-2.5 border-b gap-3"
                style={{ borderColor: C.line }}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                    style={{ background: f.type === 'in' ? C.pillOk : C.pillBad }}>
                    {f.type === 'in' ? (
                      <ArrowUpRight size={14} style={{ color: C.ok }} />
                    ) : (
                      <ArrowDownRight size={14} style={{ color: C.bad }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm truncate" style={{ color: C.ink }}>
                      {f.note || f.category || '—'}
                    </div>
                    <div className="text-[10px] font-mono truncate" style={{ color: C.muted }}>
                      {f.category} · {new Date(f.occurred_at).toLocaleDateString('tr-TR')} · {f.user_name || '—'}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-mono" style={{ color: f.type === 'in' ? C.ok : C.bad }}>
                    {f.type === 'in' ? '+ ' : '− '}{tl(f.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel num="03" label="Kategori dağılımı" />
          <CategoryBreakdown flow={flow} />
        </Card>
      </div>

      {showForm && canEdit && (
        <CashForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}

function CategoryBreakdown({ flow }) {
  const catMap = {};
  flow.forEach(f => {
    const key = f.category || '—';
    if (!catMap[key]) catMap[key] = { cat: key, in: 0, out: 0 };
    if (f.type === 'in') catMap[key].in += Number(f.amount);
    else catMap[key].out += Number(f.amount);
  });
  const categories = Object.values(catMap).sort((a, b) => (b.in + b.out) - (a.in + a.out)).slice(0, 8);

  if (!categories.length) {
    return <div className="text-xs py-6 text-center" style={{ color: C.muted }}>Veri yok</div>;
  }

  return (
    <div className="space-y-1.5">
      {categories.map(c => (
        <div key={c.cat} className="flex items-center justify-between text-xs gap-2">
          <span className="truncate" style={{ color: C.ink }}>{c.cat}</span>
          <span className="font-mono flex-shrink-0" style={{ color: c.out > c.in ? C.bad : C.ok }}>
            {c.in > 0 && `+${tl(c.in)}`}
            {c.in > 0 && c.out > 0 && ' / '}
            {c.out > 0 && `−${tl(c.out)}`}
          </span>
        </div>
      ))}
    </div>
  );
}

function CashForm({ onClose, onSaved }) {
  const [type, setType] = useState('out');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const { push } = useToast();

  const cats = type === 'in' ? CATEGORIES_IN : CATEGORIES_OUT;

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n <= 0) {
      setErr('Tutar 0\'dan büyük olmalı');
      return;
    }
    setSaving(true); setErr(null);
    try {
      const u = auth.getUser();
      await api.cashCreate({
        type,
        amount: n,
        category: category || (type === 'in' ? 'Diğer gelir' : 'Diğer gider'),
        note,
        created_by: u?.id || null,
      });
      push({ kind: 'success', message: `${type === 'in' ? 'Gelir' : 'Gider'} kaydedildi: ${new Intl.NumberFormat('tr-TR').format(n)}₺` });
      onSaved();
    } catch (ex) {
      setErr(ex.message);
      setSaving(false);
    }
  };

  const inputStyle = { borderColor: C.line, color: C.ink, background: C.paperLite };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'var(--modal-overlay)' }} onClick={onClose}>
      <div className="w-full max-w-md mt-4 sm:mt-12" style={{ background: C.paper }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b" style={{ borderColor: C.line }}>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>§ 01 / YENİ HAREKET</div>
            <h2 className="text-xl sm:text-2xl font-serif mt-0.5" style={{ color: C.ink }}>Kasa hareketi ekle</h2>
          </div>
          <button onClick={onClose}><X size={20} style={{ color: C.ink }} /></button>
        </div>

        <form onSubmit={submit} className="p-4 sm:p-5 space-y-3">
          {/* Tip seçimi */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setType('in'); setCategory(''); }}
              className="py-3 text-sm font-mono inline-flex items-center justify-center gap-2"
              style={{
                background: type === 'in' ? C.ok : C.paperLite,
                color: type === 'in' ? C.paper : C.ink,
                border: `1px solid ${type === 'in' ? C.ok : C.line}`,
              }}>
              <ArrowUpRight size={14} /> GELİR
            </button>
            <button type="button" onClick={() => { setType('out'); setCategory(''); }}
              className="py-3 text-sm font-mono inline-flex items-center justify-center gap-2"
              style={{
                background: type === 'out' ? C.bad : C.paperLite,
                color: type === 'out' ? C.paper : C.ink,
                border: `1px solid ${type === 'out' ? C.bad : C.line}`,
              }}>
              <ArrowDownRight size={14} /> GİDER
            </button>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
              Tutar (₺) <span style={{ color: C.accent }}>*</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              required
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-base border outline-none font-mono"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
              Kategori
            </label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border outline-none" style={inputStyle}>
              <option value="">— seçin —</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
              Açıklama
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Kasım kira ödemesi, vs."
              className="w-full px-3 py-2 text-sm border outline-none"
              style={inputStyle}
            />
          </div>

          {err && <div className="text-sm p-3" style={{ background: C.pillBad, color: C.bad }}>{err}</div>}

          <div className="flex gap-2 pt-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 text-xs font-mono border"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
              VAZGEÇ
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 text-xs font-mono disabled:opacity-50"
              style={{ background: type === 'in' ? C.ok : C.bad, color: C.paper }}>
              {saving ? 'KAYDEDİLİYOR...' : 'KAYDET'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
