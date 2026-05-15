import React, { useState, useEffect } from 'react';
import { X, Camera } from 'lucide-react';
import { api } from '../lib/api';
import { C } from './ui';
import BarcodeScanner from './BarcodeScanner';

// ─── Stable Input component (defined OUTSIDE the parent) ──────
// Eğer parent fonksiyonun içinde tanımlanırsa, her render'da
// yeni bir component referansı oluşur ve React her tuş vuruşunda
// input'u unmount + remount eder → odak kaybolur, tek karakter yazılır.
function Input({ label, k, type = 'text', required, form, up, ...props }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
        {label} {required && <span style={{ color: C.accent }}>*</span>}
      </label>
      <input
        type={type}
        value={form[k]}
        onChange={(e) => up(k, e.target.value)}
        required={required}
        className="w-full px-3 py-2 text-sm border outline-none focus:border-stone-800"
        style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}
        {...props}
      />
    </div>
  );
}

export default function DeviceForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    imei: '', brand: '', model: '', color: '', storage: '', ram: '',
    battery: 100, screen: '', condition: 'A temiz', shelf: '',
    buy_price: 0, supplier_id: '', note: ''
  });
  const [suppliers, setSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    api.customersList({ role: 'tedarikçi' }).then(setSuppliers).catch(() => {});
  }, []);

  const up = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      await api.deviceCreate({
        ...form,
        battery: Number(form.battery),
        buy_price: Number(form.buy_price),
        supplier_id: form.supplier_id || null,
      });
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'var(--modal-overlay)' }}
      onClick={onClose}>
      <div className="w-full max-w-2xl mt-8" style={{ background: C.paper }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: C.line }}>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>
              § 01 / YENİ CİHAZ
            </div>
            <h2 className="text-2xl font-serif" style={{ color: C.ink }}>Cihaz kaydı oluştur</h2>
          </div>
          <button onClick={onClose}><X size={20} style={{ color: C.ink }} /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* IMEI input — sağında kamera butonu */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                IMEI <span style={{ color: C.accent }}>*</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.imei}
                  onChange={e => up('imei', e.target.value.replace(/\D/g, '').slice(0, 15))}
                  required
                  placeholder="15 hane"
                  className="flex-1 min-w-0 px-3 py-2 text-sm border outline-none font-mono"
                  style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}
                />
                <button
                  type="button"
                  onClick={() => setScanning(true)}
                  title="Kamera ile tara"
                  className="px-3 py-2 border inline-flex items-center justify-center"
                  style={{ borderColor: C.line, background: C.ink, color: C.paper }}>
                  <Camera size={14} />
                </button>
              </div>
              {form.imei && form.imei.length > 0 && form.imei.length !== 15 && (
                <div className="text-[10px] mt-1 font-mono" style={{ color: C.warn }}>
                  {form.imei.length}/15 hane
                </div>
              )}
            </div>
            <Input form={form} up={up} label="Marka" k="brand" required placeholder="iPhone / Samsung / ..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input form={form} up={up} label="Model" k="model" required placeholder="14 Pro / S24 Ultra" />
            <Input form={form} up={up} label="Renk" k="color" placeholder="Midnight / Titanium Black" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Input form={form} up={up} label="Hafıza" k="storage" placeholder="256GB" />
            <Input form={form} up={up} label="RAM" k="ram" placeholder="8GB" />
            <Input form={form} up={up} label="Ekran" k="screen" placeholder="6.7&quot;" />
            <Input form={form} up={up} label="Batarya %" k="battery" type="number" min="0" max="100" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                Kondisyon
              </label>
              <select value={form.condition} onChange={e => up('condition', e.target.value)}
                className="w-full px-3 py-2 text-sm border outline-none"
                style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
                <option>A+ kusursuz</option>
                <option>A+ kutulu</option>
                <option>A temiz</option>
                <option>B kullanım izleri</option>
                <option>B ekran çatlak</option>
                <option>C anakart arızalı</option>
              </select>
            </div>
            <Input form={form} up={up} label="Raf" k="shelf" placeholder="V-01 / R-05" />
          </div>

          <div className="pt-3 border-t" style={{ borderColor: C.line }}>
            <div className="text-[10px] uppercase tracking-[0.2em] font-mono mb-3" style={{ color: C.muted }}>
              — ALIŞ BİLGİLERİ
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Input form={form} up={up} label="Alış Fiyatı (₺)" k="buy_price" type="number" min="0" step="100" />
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                  Tedarikçi
                </label>
                <select value={form.supplier_id} onChange={e => up('supplier_id', e.target.value)}
                  className="w-full px-3 py-2 text-sm border outline-none"
                  style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
                  <option value="">— seçin —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
              Not
            </label>
            <textarea value={form.note} onChange={e => up('note', e.target.value)}
              rows="2"
              className="w-full px-3 py-2 text-sm border outline-none"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }} />
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
              style={{ background: C.accent, color: C.paper }}>
              {saving ? 'KAYDEDİLİYOR...' : 'KAYDET & QR OLUŞTUR'}
            </button>
          </div>
        </form>
      </div>

      <BarcodeScanner
        isOpen={scanning}
        onClose={() => setScanning(false)}
        onResult={(text) => {
          // Sadece rakamları al, 15 haneye kırp
          const cleaned = String(text).replace(/\D/g, '').slice(0, 15);
          up('imei', cleaned);
          setScanning(false);
        }}
        title="IMEI'yi tara"
        hint="Telefonun arkasındaki barkodu çerçeveye al"
        accept={(text) => /^\d{15}$/.test(String(text).replace(/\D/g, ''))}
      />
    </div>
  );
}
