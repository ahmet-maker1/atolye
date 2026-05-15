import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, FilePlus, Wrench } from 'lucide-react';
import { api, tl, auth } from '../lib/api';
import { C } from './ui';

const CONFIG = {
  sale: {
    title: 'Satış yap',
    section: '§ 02 / SATIŞ',
    icon: ShoppingCart,
    accent: C.accent,
    confirmLabel: 'SATIŞI TAMAMLA',
    amountLabel: 'Satış fiyatı (₺)',
    cpLabel: 'Müşteri',
    cpRole: 'müşteri',
    noteDefault: 'Nakit satış',
    type: 'sale',
  },
  expense: {
    title: 'Masraf ekle',
    section: '§ 03 / MASRAF',
    icon: FilePlus,
    accent: C.warn,
    confirmLabel: 'MASRAFI EKLE',
    amountLabel: 'Masraf tutarı (₺)',
    cpLabel: null,
    noteDefault: '',
    type: 'expense',
  },
  service: {
    title: 'Servise al',
    section: '§ 04 / SERVİS',
    icon: Wrench,
    accent: C.warn,
    confirmLabel: 'SERVİSE AL',
    amountLabel: 'Parça + işçilik (₺)',
    cpLabel: null,
    noteDefault: '',
    type: 'service',
  },
};

export default function ActionModal({ device, type, onClose, onDone }) {
  const cfg = CONFIG[type];
  const Icon = cfg.icon;
  const [amount, setAmount] = useState('');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [note, setNote] = useState(cfg.noteDefault);
  const [people, setPeople] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (cfg.cpRole) {
      api.customersList({ role: cfg.cpRole })
        .then(list => {
          // "her ikisi" rolündekileri de ekle
          api.customersList({ role: 'her ikisi' }).then(extra => {
            setPeople([...list, ...extra]);
          }).catch(() => setPeople(list));
        })
        .catch(() => {});
    }
  }, [type]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const user = auth.get();
      await api.txCreate({
        device_id: device.id,
        type: cfg.type,
        amount: Number(amount),
        counterparty_id: counterpartyId || null,
        note: note || null,
        created_by: user?.id || null,
      });
      onDone();
    } catch (ex) {
      setErr(ex.message);
      setSaving(false);
    }
  };

  const totalCost = Number(device.buy_price) + Number(device.expenses);
  const newCost = type === 'expense' || type === 'service'
    ? totalCost + Number(amount || 0)
    : totalCost;
  const projectedProfit = type === 'sale' && amount
    ? Number(amount) - totalCost
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'var(--modal-overlay)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg mt-8" style={{ background: C.paper }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: C.line }}>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>
              {cfg.section}
            </div>
            <h2 className="text-2xl font-serif mt-0.5 inline-flex items-center gap-2" style={{ color: C.ink }}>
              <Icon size={20} style={{ color: cfg.accent }} /> {cfg.title}
            </h2>
          </div>
          <button onClick={onClose}><X size={20} style={{ color: C.ink }} /></button>
        </div>

        <div className="px-5 py-3 text-xs font-mono border-b flex items-center gap-2"
          style={{ color: C.muted, borderColor: C.line, background: C.paperDeep }}>
          <span style={{ color: C.accent }}>{device.code}</span>
          <span>·</span>
          <span style={{ color: C.ink }}>{device.brand} {device.model}</span>
          <span>·</span>
          <span>{device.imei}</span>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1"
              style={{ color: C.muted }}>
              {cfg.amountLabel} <span style={{ color: C.accent }}>*</span>
            </label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              required min="0" step="100" autoFocus
              className="w-full px-3 py-3 text-2xl font-serif border outline-none"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}
              placeholder="0" />
          </div>

          {cfg.cpLabel && (
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1"
                style={{ color: C.muted }}>
                {cfg.cpLabel}
              </label>
              <select value={counterpartyId} onChange={e => setCounterpartyId(e.target.value)}
                className="w-full px-3 py-2 text-sm border outline-none"
                style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
                <option value="">— seçin —</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
              <div className="text-[10px] mt-1" style={{ color: C.muted }}>
                Kayıtlı değilse önce Cari kartlar sayfasından ekleyin.
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1"
              style={{ color: C.muted }}>
              Açıklama
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              rows="2"
              className="w-full px-3 py-2 text-sm border outline-none font-mono"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}
              placeholder={type === 'service' ? 'Ekran değişimi, batarya...' : type === 'expense' ? 'Ekran koruma, aksesuar...' : 'Garanti 3 ay, nakit...'} />
          </div>

          {/* Impact preview */}
          <div className="p-3 border" style={{ borderColor: C.line, background: C.paperDeep }}>
            <div className="text-[9px] uppercase tracking-[0.18em] font-mono mb-2" style={{ color: C.muted }}>
              işlem sonrası durum
            </div>
            {type === 'sale' ? (
              <div className="space-y-1">
                <Row k="Mevcut maliyet" v={tl(totalCost)} />
                <Row k="Satış fiyatı" v={amount ? tl(amount) : '—'} bold />
                <Row k="Kâr"
                  v={projectedProfit !== null ? (projectedProfit >= 0 ? '+ ' : '') + tl(projectedProfit) : '—'}
                  color={projectedProfit >= 0 ? C.ok : C.bad} bold />
              </div>
            ) : (
              <div className="space-y-1">
                <Row k="Mevcut maliyet" v={tl(totalCost)} />
                <Row k="Eklenen" v={amount ? '+ ' + tl(amount) : '—'} color={C.warn} />
                <Row k="Yeni maliyet" v={tl(newCost)} bold />
              </div>
            )}
          </div>

          {err && (
            <div className="text-sm p-3" style={{ background: C.pillBad, color: C.bad }}>{err}</div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 text-xs font-mono border"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
              VAZGEÇ
            </button>
            <button type="submit" disabled={saving || !amount}
              className="flex-1 py-3 text-xs font-mono disabled:opacity-50"
              style={{ background: cfg.accent, color: C.paper }}>
              {saving ? 'KAYDEDİLİYOR...' : cfg.confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Row({ k, v, color, bold }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: C.muted }}>{k}</span>
      <span className="font-mono" style={{
        color: color || C.ink,
        fontWeight: bold ? 600 : 400,
      }}>{v}</span>
    </div>
  );
}
