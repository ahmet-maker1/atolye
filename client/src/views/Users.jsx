import React, { useState, useEffect } from 'react';
import { Shield, Wallet, Wrench, Plus, X, Check } from 'lucide-react';
import { api } from '../lib/api';
import { C, Card, SectionLabel, RolePill } from '../components/ui';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.usersList().then(setUsers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const byRole = (r) => users.filter(u => u.role === r);

  const toggleActive = async (u) => {
    await api.userUpdate(u.id, { active: u.active ? 0 : 1 });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] tracking-[0.25em] uppercase font-mono mb-2" style={{ color: C.muted }}>
            — PERSONEL / YETKİLER
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif" style={{ fontWeight: 400, letterSpacing: '-0.03em', color: C.ink }}>
            Kullanıcılar
          </h1>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-3 py-2 text-xs inline-flex items-center gap-2 font-mono"
          style={{ background: C.ink, color: C.paper }}>
          <Plus size={14} /> YENİ KULLANICI
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <RoleCard role="Admin" icon={Shield} users={byRole('Admin')}
          desc="Tam yetki: kullanıcı yönetimi, finans raporları, sistem ayarları." />
        <RoleCard role="Kasiyer" icon={Wallet} users={byRole('Kasiyer')}
          desc="Satış & alış işlemleri, müşteri kartları, günlük kasa raporu." />
        <RoleCard role="Teknisyen" icon={Wrench} users={byRole('Teknisyen')}
          desc="Servis iş emirleri, parça-işçilik girişi, arıza tanıları." />
      </div>

      <Card>
        <SectionLabel num="01" label="Tüm personel" />
        {loading && <div className="py-6 text-center text-xs font-mono" style={{ color: C.muted }}>yükleniyor...</div>}

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="grid grid-cols-12 gap-3 text-[10px] uppercase tracking-[0.15em] pb-2 border-b font-mono"
            style={{ color: C.muted, borderColor: C.line }}>
            <div className="col-span-1">Kod</div>
            <div className="col-span-3">İsim</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Rol</div>
            <div className="col-span-2">Son aktif</div>
            <div className="col-span-1 text-right">Durum</div>
          </div>
          {users.map(u => (
            <div key={u.id} className="grid grid-cols-12 gap-3 py-3 border-b items-center"
              style={{ borderColor: C.line }}>
              <div className="col-span-1 text-[11px] font-mono" style={{ color: C.accent }}>{u.code}</div>
              <div className="col-span-3 text-sm" style={{ color: C.ink }}>{u.name}</div>
              <div className="col-span-3 text-[11px] font-mono" style={{ color: C.inkSoft }}>{u.email}</div>
              <div className="col-span-2"><RolePill r={u.role} /></div>
              <div className="col-span-2 text-[11px] font-mono" style={{ color: C.muted }}>
                {u.last_seen ? new Date(u.last_seen).toLocaleDateString('tr-TR') : '—'}
              </div>
              <div className="col-span-1 text-right">
                <button onClick={() => toggleActive(u)}
                  className="text-[9px] font-mono px-2 py-0.5"
                  style={{
                    background: u.active ? C.pillOk : C.pillBad,
                    color: u.active ? C.ok : C.bad,
                  }}>
                  {u.active ? 'aktif' : 'pasif'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {users.map(u => (
            <div key={u.id} className="border p-3" style={{ borderColor: C.line }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono" style={{ color: C.accent }}>{u.code}</div>
                  <div className="text-sm" style={{ color: C.ink, fontWeight: 500 }}>{u.name}</div>
                  <div className="text-[10px] font-mono truncate" style={{ color: C.inkSoft }}>{u.email}</div>
                </div>
                <RolePill r={u.role} />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t" style={{ borderColor: C.line }}>
                <span style={{ color: C.muted }}>
                  {u.last_seen ? new Date(u.last_seen).toLocaleDateString('tr-TR') : 'hiç'}
                </span>
                <button onClick={() => toggleActive(u)}
                  className="text-[9px] font-mono px-2 py-0.5"
                  style={{
                    background: u.active ? C.pillOk : C.pillBad,
                    color: u.active ? C.ok : C.bad,
                  }}>
                  {u.active ? 'aktif' : 'pasif'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {showForm && <UserForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function RoleCard({ role, icon: Icon, users, desc }) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 flex items-center justify-center"
          style={{ background: C.ink }}>
          <Icon size={18} style={{ color: C.paper }} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-mono" style={{ color: C.muted }}>Rol</div>
          <div className="text-xl font-serif" style={{ color: C.ink, fontWeight: 500 }}>{role}</div>
        </div>
      </div>
      <div className="text-xs mb-3" style={{ color: C.inkSoft }}>{desc}</div>
      <div className="pt-3 border-t" style={{ borderColor: C.line }}>
        <div className="text-[10px] uppercase tracking-[0.15em] font-mono mb-2" style={{ color: C.muted }}>
          {users.length} personel
        </div>
        <div className="space-y-1">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between text-xs">
              <span style={{ color: C.ink }}>{u.name}</span>
              <span className="font-mono" style={{ color: u.active ? C.ok : C.muted }}>
                {u.active ? '●' : '○'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function UserForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Kasiyer' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try { await api.userCreate(form); onSaved(); }
    catch (ex) { setErr(ex.message); setSaving(false); }
  };

  const up = (k, v) => setForm({ ...form, [k]: v });
  const inputStyle = { borderColor: C.line, color: C.ink, background: C.paperLite };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'var(--modal-overlay)' }} onClick={onClose}>
      <div className="w-full max-w-md mt-4 sm:mt-12" style={{ background: C.paper }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b" style={{ borderColor: C.line }}>
          <h2 className="text-xl sm:text-2xl font-serif" style={{ color: C.ink }}>Yeni kullanıcı</h2>
          <button onClick={onClose}><X size={20} style={{ color: C.ink }} /></button>
        </div>
        <form onSubmit={submit} className="p-4 sm:p-5 space-y-3">
          <Field label="İsim *" k="name" form={form} up={up} required style={inputStyle} />
          <Field label="Email" k="email" type="email" form={form} up={up} style={inputStyle} />
          <Field label="Parola *" k="password" type="password" form={form} up={up} required style={inputStyle} />
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
              Rol *
            </label>
            <select value={form.role} onChange={e => up('role', e.target.value)}
              className="w-full px-3 py-2 text-sm border outline-none" style={inputStyle}>
              <option>Admin</option>
              <option>Kasiyer</option>
              <option>Teknisyen</option>
            </select>
          </div>
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

function Field({ label, k, type = 'text', form, up, required, style }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
        {label}
      </label>
      <input type={type} value={form[k]} onChange={e => up(k, e.target.value)}
        required={required}
        className="w-full px-3 py-2 text-sm border outline-none"
        style={style || { borderColor: C.line, color: C.ink, background: C.paperLite }} />
    </div>
  );
}
