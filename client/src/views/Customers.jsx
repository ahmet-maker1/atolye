import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Phone, Mail, MapPin, X, UserCircle2 } from 'lucide-react';
import { api, tl } from '../lib/api';
import { C, Card, RolePill } from '../components/ui';

export default function Customers() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('hepsi');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'hepsi') params.role = filter;
      if (query) params.q = query;
      const rows = await api.customersList(params);
      setList(rows);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] tracking-[0.25em] uppercase font-mono mb-2" style={{ color: C.muted }}>
            — CARİ KARTLAR
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif" style={{ fontWeight: 400, letterSpacing: '-0.03em', color: C.ink }}>
            Tedarikçi &amp; müşteri
          </h1>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-3 py-2 text-xs inline-flex items-center gap-2 font-mono"
          style={{ background: C.ink, color: C.paper }}>
          <Plus size={14} /> YENİ CARİ
        </button>
      </div>

      <div className="flex items-center gap-1 border-y py-2.5 flex-wrap" style={{ borderColor: C.line }}>
        <Search size={14} style={{ color: C.muted }} className="mr-2 ml-1" />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="İsim, telefon, email ara..."
          className="bg-transparent flex-1 min-w-[140px] text-sm outline-none font-mono"
          style={{ color: C.ink }} />
        <div className="flex gap-1 text-[10px] tracking-[0.15em] uppercase font-mono overflow-x-auto">
          {['hepsi', 'tedarikçi', 'müşteri', 'her ikisi'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-2.5 py-1 whitespace-nowrap"
              style={{
                background: filter === f ? C.ink : 'transparent',
                color: filter === f ? C.paper : C.muted,
              }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="py-6 text-center text-xs font-mono" style={{ color: C.muted }}>yükleniyor...</div>}
      {!loading && list.length === 0 && (
        <div className="py-12 text-center text-sm" style={{ color: C.muted }}>
          Cari bulunamadı.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {list.map(c => (
          <Card key={c.id} pad={false}>
            <div onClick={() => navigate(`/customers/${c.id}`)}
              className="p-4 sm:p-5 space-y-3 cursor-pointer hover:bg-black/5 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.accent }}>
                    {c.code}
                  </div>
                  <div className="text-xl font-serif mt-1" style={{ color: C.ink, fontWeight: 500 }}>
                    {c.name}
                  </div>
                </div>
                <RolePill r={c.role} />
              </div>

              <div className="space-y-1 text-xs font-mono" style={{ color: C.inkSoft }}>
                {c.phone && <div className="flex items-center gap-2"><Phone size={11} style={{ color: C.muted }} /> {c.phone}</div>}
                {c.email && <div className="flex items-center gap-2"><Mail size={11} style={{ color: C.muted }} /> {c.email}</div>}
                {c.city && <div className="flex items-center gap-2"><MapPin size={11} style={{ color: C.muted }} /> {c.city}</div>}
              </div>

              <div className="flex justify-between pt-3 border-t" style={{ borderColor: C.line }}>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.15em] font-mono" style={{ color: C.muted }}>Alım</div>
                  <div className="text-sm font-mono" style={{ color: C.ink }}>{c.total_bought || 0}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.15em] font-mono" style={{ color: C.muted }}>Satış</div>
                  <div className="text-sm font-mono" style={{ color: C.ink }}>{c.total_sold || 0}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-[0.15em] font-mono" style={{ color: C.muted }}>Bakiye</div>
                  <div className="text-sm font-mono" style={{
                    color: c.balance > 0 ? C.ok : c.balance < 0 ? C.bad : C.ink
                  }}>
                    {c.balance >= 0 ? '+' : ''}{tl(c.balance)}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showForm && <CustomerForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function CustomerForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', role: 'müşteri', city: '', note: '', balance: 0,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      await api.customerCreate({ ...form, balance: Number(form.balance) });
      onSaved();
    } catch (ex) { setErr(ex.message); setSaving(false); }
  };

  const up = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'var(--modal-overlay)' }} onClick={onClose}>
      <div className="w-full max-w-lg mt-8" style={{ background: C.paper }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: C.line }}>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>§ 01 / YENİ CARİ</div>
            <h2 className="text-2xl font-serif mt-0.5" style={{ color: C.ink }}>Cari kart ekle</h2>
          </div>
          <button onClick={onClose}><X size={20} style={{ color: C.ink }} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <FormRow label="İsim *" k="name" form={form} up={up} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormRow label="Telefon" k="phone" form={form} up={up} />
            <FormRow label="Email" k="email" type="email" form={form} up={up} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                Rol
              </label>
              <select value={form.role} onChange={e => up('role', e.target.value)}
                className="w-full px-3 py-2 text-sm border outline-none"
                style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
                <option value="müşteri">müşteri</option>
                <option value="tedarikçi">tedarikçi</option>
                <option value="her ikisi">her ikisi</option>
              </select>
            </div>
            <FormRow label="Şehir" k="city" form={form} up={up} />
          </div>
          <FormRow label="Açılış bakiyesi (₺)" k="balance" type="number" form={form} up={up} />
          {err && <div className="text-sm p-3" style={{ background: C.pillBad, color: C.bad }}>{err}</div>}
          <div className="flex gap-2 pt-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-mono border"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>VAZGEÇ</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-mono disabled:opacity-50"
              style={{ background: C.accent, color: C.paper }}>
              {saving ? 'KAYDEDİLİYOR...' : 'KAYDET'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormRow({ label, k, type = 'text', form, up, required, ...props }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
        {label}
      </label>
      <input type={type} value={form[k]} onChange={e => up(k, e.target.value)}
        required={required}
        className="w-full px-3 py-2 text-sm border outline-none"
        style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}
        {...props} />
    </div>
  );
}
