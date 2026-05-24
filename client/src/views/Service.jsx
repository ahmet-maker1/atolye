import React, { useState, useEffect } from 'react';
import { Wrench, Plus, X, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { api, tl, auth } from '../lib/api';
import { C, Card, SectionLabel, StatusPill } from '../components/ui';

export default function Service() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('hepsi');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter === 'hepsi' ? {} : { status: filter };
      setTickets(await api.servicesList(params));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter]);

  const pendingCount = tickets.filter(t => t.status === 'beklemede').length;
  const workingCount = tickets.filter(t => t.status === 'işlemde').length;
  const readyCount   = tickets.filter(t => t.status === 'hazır').length;

  const updateStatus = async (id, newStatus) => {
    const data = { status: newStatus };
    if (newStatus === 'teslim edildi') data.completed_at = new Date().toISOString();
    await api.serviceUpdate(id, data);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] tracking-[0.25em] uppercase font-mono mb-2" style={{ color: C.muted }}>
            — TEKNİK SERVİS / İŞ EMİRLERİ
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif" style={{ fontWeight: 400, letterSpacing: '-0.03em', color: C.ink }}>
            Servis kuyruğu
          </h1>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-3 py-2 text-xs inline-flex items-center gap-2 font-mono"
          style={{ background: C.ink, color: C.paper }}>
          <Plus size={14} /> YENİ İŞ EMRİ
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <div className="text-[10px] tracking-[0.2em] uppercase font-mono mb-2" style={{ color: C.muted }}>
            Beklemede
          </div>
          <div className="text-3xl sm:text-4xl font-serif" style={{ color: C.muted }}>{pendingCount}</div>
          <div className="text-xs mt-1 hidden sm:block" style={{ color: C.muted }}>parça bekleyen</div>
        </Card>
        <Card>
          <div className="text-[10px] tracking-[0.2em] uppercase font-mono mb-2" style={{ color: C.muted }}>
            İşlemde
          </div>
          <div className="text-3xl sm:text-4xl font-serif" style={{ color: C.warn }}>{workingCount}</div>
          <div className="text-xs mt-1 hidden sm:block" style={{ color: C.muted }}>teknisyende</div>
        </Card>
        <Card>
          <div className="text-[10px] tracking-[0.2em] uppercase font-mono mb-2" style={{ color: C.muted }}>
            Hazır
          </div>
          <div className="text-3xl sm:text-4xl font-serif" style={{ color: C.ok }}>{readyCount}</div>
          <div className="text-xs mt-1 hidden sm:block" style={{ color: C.muted }}>teslim için hazır</div>
        </Card>
      </div>

      <div className="flex gap-1 text-[10px] tracking-[0.15em] uppercase font-mono overflow-x-auto pb-1">
        {['hepsi', 'beklemede', 'işlemde', 'hazır', 'teslim edildi'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-2.5 py-1 whitespace-nowrap"
            style={{
              background: filter === f ? C.ink : 'transparent',
              color: filter === f ? C.paper : C.muted,
              border: filter !== f ? `1px solid ${C.line}` : 'none',
            }}>
            {f}
          </button>
        ))}
      </div>

      {loading && <div className="py-6 text-center text-xs font-mono" style={{ color: C.muted }}>yükleniyor...</div>}
      {!loading && tickets.length === 0 && (
        <div className="py-12 text-center text-sm" style={{ color: C.muted }}>İş emri yok.</div>
      )}

      {/* Desktop table */}
      {tickets.length > 0 && (
        <div className="hidden md:block">
          <div className="grid grid-cols-12 gap-3 text-[10px] uppercase tracking-[0.15em] pb-2 border-b font-mono"
            style={{ color: C.muted, borderColor: C.line }}>
            <div className="col-span-2">İş Emri</div>
            <div className="col-span-3">Cihaz / Müşteri</div>
            <div className="col-span-3">Arıza</div>
            <div className="col-span-1">Teknisyen</div>
            <div className="col-span-1 text-right">Parça</div>
            <div className="col-span-1 text-right">İşçilik</div>
            <div className="col-span-1 text-right">Durum</div>
          </div>
          {tickets.map(t => (
            <div key={t.id} className="grid grid-cols-12 gap-3 py-4 border-b items-center"
              style={{ borderColor: C.line }}>
              <div className="col-span-2">
                <div className="text-sm font-mono" style={{ color: C.accent, fontWeight: 600 }}>{t.code}</div>
                <div className="text-[10px] font-mono" style={{ color: C.muted }}>
                  {new Date(t.received_at).toLocaleDateString('tr-TR')}
                </div>
              </div>
              <div className="col-span-3">
                <div className="text-sm" style={{ color: C.ink }}>
                  {t.device_code ? `${t.brand} ${t.model}` : t.external_device_info}
                </div>
                <div className="text-[11px] font-mono" style={{ color: C.muted }}>
                  {t.device_code || 'harici'} · {t.customer_name || t.external_customer || '—'}
                </div>
              </div>
              <div className="col-span-3 text-sm" style={{ color: C.inkSoft }}>{t.issue}</div>
              <div className="col-span-1 text-[11px] font-mono" style={{ color: C.muted }}>
                {t.technician_name || '—'}
              </div>
              <div className="col-span-1 text-right text-sm font-mono" style={{ color: C.warn }}>
                {t.parts_cost > 0 ? tl(t.parts_cost) : '—'}
              </div>
              <div className="col-span-1 text-right text-sm font-mono" style={{ color: C.warn }}>
                {t.labor_cost > 0 ? tl(t.labor_cost) : '—'}
              </div>
              <div className="col-span-1 text-right space-y-1">
                <StatusPill s={t.status} />
                <ActionButton t={t} updateStatus={updateStatus} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {tickets.map(t => (
          <div key={t.id} className="border p-3 space-y-2"
            style={{ borderColor: C.line, background: C.paperLite }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono" style={{ color: C.accent, fontWeight: 600 }}>{t.code}</div>
                <div className="text-sm truncate" style={{ color: C.ink, fontWeight: 500 }}>
                  {t.device_code ? `${t.brand} ${t.model}` : t.external_device_info}
                </div>
                <div className="text-[10px] font-mono" style={{ color: C.muted }}>
                  {t.customer_name || t.external_customer || '—'} · {new Date(t.received_at).toLocaleDateString('tr-TR')}
                </div>
              </div>
              <StatusPill s={t.status} />
            </div>

            <div className="text-sm" style={{ color: C.inkSoft }}>{t.issue}</div>

            <div className="flex items-center justify-between text-[11px] font-mono">
              <span style={{ color: C.muted }}>
                {t.technician_name || '—'}
              </span>
              <div className="flex gap-3">
                {t.parts_cost > 0 && <span style={{ color: C.warn }}>P: {tl(t.parts_cost)}</span>}
                {t.labor_cost > 0 && <span style={{ color: C.warn }}>İ: {tl(t.labor_cost)}</span>}
              </div>
            </div>

            <ActionButton t={t} updateStatus={updateStatus} fullWidth />
          </div>
        ))}
      </div>

      {showForm && <ServiceForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function ActionButton({ t, updateStatus, fullWidth }) {
  const cls = `${fullWidth ? 'w-full' : 'block w-full'} text-[9px] font-mono px-1.5 py-0.5`;
  if (t.status === 'beklemede') {
    return <button onClick={() => updateStatus(t.id, 'işlemde')} className={cls}
      style={{ background: C.warn, color: C.paper }}>→ başla</button>;
  }
  if (t.status === 'işlemde') {
    return <button onClick={() => updateStatus(t.id, 'hazır')} className={cls}
      style={{ background: C.ok, color: C.paper }}>→ hazır</button>;
  }
  if (t.status === 'hazır') {
    return <button onClick={() => updateStatus(t.id, 'teslim edildi')} className={cls}
      style={{ background: C.ink, color: C.paper }}>→ teslim</button>;
  }
  return null;
}

function ServiceForm({ onClose, onSaved }) {
  const [mode, setMode] = useState('external');
  const [form, setForm] = useState({
    device_id: '', external_device_info: '', external_customer: '',
    issue: '', parts_cost: 0, labor_cost: 0, technician_id: '', note: ''
  });
  const [devices, setDevices] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.devicesList().then(setDevices).catch(() => {});
    api.usersList().then(users => setTechnicians(users.filter(u => u.role === 'Teknisyen' && u.active))).catch(() => {});
  }, []);

  const up = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const user = auth.get();
      const payload = {
        ...form,
        parts_cost: Number(form.parts_cost),
        labor_cost: Number(form.labor_cost),
        device_id: mode === 'internal' ? form.device_id : null,
        external_device_info: mode === 'external' ? form.external_device_info : null,
        external_customer: mode === 'external' ? form.external_customer : null,
        technician_id: form.technician_id || null,
        created_by: user?.id || null,
      };
      await api.serviceCreate(payload);
      onSaved();
    } catch (ex) { setErr(ex.message); setSaving(false); }
  };

  const inputStyle = { borderColor: C.line, color: C.ink, background: C.paperLite };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'var(--modal-overlay)' }} onClick={onClose}>
      <div className="w-full max-w-xl mt-4 sm:mt-8" style={{ background: C.paper }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b" style={{ borderColor: C.line }}>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>§ 01 / YENİ İŞ EMRİ</div>
            <h2 className="text-xl sm:text-2xl font-serif mt-0.5" style={{ color: C.ink }}>Servise al</h2>
          </div>
          <button onClick={onClose}><X size={20} style={{ color: C.ink }} /></button>
        </div>

        <form onSubmit={submit} className="p-4 sm:p-5 space-y-3">
          <div className="flex gap-1 text-[10px] tracking-[0.15em] uppercase font-mono border"
            style={{ borderColor: C.line }}>
            {[['external', 'harici müşteri'], ['internal', 'envanter cihazı']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setMode(v)}
                className="flex-1 py-2"
                style={{ background: mode === v ? C.ink : 'transparent', color: mode === v ? C.paper : C.muted }}>
                {l}
              </button>
            ))}
          </div>

          {mode === 'internal' ? (
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                Envanterden cihaz seç *
              </label>
              <select required value={form.device_id} onChange={e => up('device_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border outline-none" style={inputStyle}>
                <option value="">— seçin —</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.code} · {d.brand} {d.model} · {d.imei}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                  Cihaz bilgisi *
                </label>
                <input required value={form.external_device_info} onChange={e => up('external_device_info', e.target.value)}
                  placeholder="Samsung S23 · 256GB · IMEI 123..."
                  className="w-full px-3 py-2 text-sm border outline-none font-mono" style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                  Müşteri adı
                </label>
                <input value={form.external_customer} onChange={e => up('external_customer', e.target.value)}
                  placeholder="Ad soyad"
                  className="w-full px-3 py-2 text-sm border outline-none" style={inputStyle} />
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
              Arıza *
            </label>
            <textarea required value={form.issue} onChange={e => up('issue', e.target.value)}
              rows="2"
              className="w-full px-3 py-2 text-sm border outline-none" style={inputStyle} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                Parça (₺)
              </label>
              <input type="number" min="0" step="10" value={form.parts_cost} onChange={e => up('parts_cost', e.target.value)}
                className="w-full px-3 py-2 text-sm border outline-none font-mono" style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                İşçilik (₺)
              </label>
              <input type="number" min="0" step="10" value={form.labor_cost} onChange={e => up('labor_cost', e.target.value)}
                className="w-full px-3 py-2 text-sm border outline-none font-mono" style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                Teknisyen
              </label>
              <select value={form.technician_id} onChange={e => up('technician_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border outline-none" style={inputStyle}>
                <option value="">—</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {err && <div className="text-sm p-3" style={{ background: C.pillBad, color: C.bad }}>{err}</div>}

          <div className="flex gap-2 pt-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-mono border"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>VAZGEÇ</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-mono disabled:opacity-50"
              style={{ background: C.accent, color: C.paper }}>
              {saving ? 'KAYDEDİLİYOR...' : 'OLUŞTUR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
