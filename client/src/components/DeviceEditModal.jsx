import React, { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';
import { C } from './ui';

// Stable Input (parent function dışında — focus bug yok)
function Input({ label, k, type = 'text', form, up, ...props }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
        {label}
      </label>
      <input
        type={type}
        value={form[k] ?? ''}
        onChange={(e) => up(k, e.target.value)}
        className="w-full px-3 py-2 text-sm border outline-none"
        style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}
        {...props}
      />
    </div>
  );
}

/**
 * Mevcut cihazı düzenlemek için modal.
 * IMEI ve cihaz kodu değiştirilemez (kimlik).
 */
export default function DeviceEditModal({ device, onClose, onSaved }) {
  const [form, setForm] = useState({
    brand: device.brand || '',
    model: device.model || '',
    color: device.color || '',
    storage: device.storage || '',
    ram: device.ram || '',
    battery: device.battery ?? 100,
    screen: device.screen || '',
    condition: device.condition || 'A temiz',
    shelf: device.shelf || '',
    warranty_end: device.warranty_end || '',
    supplier_name: device.supplier_name || '',
    customer_name: device.customer_name || '',
    note: device.note || '',
    buy_price: device.buy_price || 0,
    sell_price: device.sell_price || 0,
    // Mevcut kondisyon "Sıfır / Kutulu" ise toggle otomatik açık gelir
    is_new: device.condition === 'Sıfır / Kutulu',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const up = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const payload = {
        ...form,
        battery:       form.is_new ? 100 : Number(form.battery),
        condition:     form.is_new ? 'Sıfır / Kutulu' : form.condition,
        buy_price:     Number(form.buy_price),
        sell_price:    Number(form.sell_price),
        warranty_end:  form.warranty_end || null,
        supplier_name: form.supplier_name?.trim() || null,
        customer_name: form.customer_name?.trim() || null,
        is_new: undefined, // UI-only flag, backend görmez
      };
      await api.deviceUpdate(device.id, payload);
      onSaved();
    } catch (ex) {
      setErr(ex.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'var(--modal-overlay)' }} onClick={onClose}>
      <div className="w-full max-w-2xl mt-4 sm:mt-8" style={{ background: C.paper }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between p-4 sm:p-5 border-b" style={{ borderColor: C.line }}>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>
              § 02 / DÜZENLE
            </div>
            <h2 className="text-2xl font-serif mt-0.5" style={{ color: C.ink }}>Cihazı düzenle</h2>
            <div className="text-[11px] font-mono mt-1" style={{ color: C.muted }}>
              <span style={{ color: C.accent }}>{device.code}</span> · IMEI {device.imei} (değiştirilemez)
            </div>
          </div>
          <button onClick={onClose}><X size={20} style={{ color: C.ink }} /></button>
        </div>

        <form onSubmit={submit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Cihaz türü — sıfır mı, ikinci el mi */}
          <div className="p-3 border" style={{ background: C.paperDeep, borderColor: C.line }}>
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-2" style={{ color: C.muted }}>
              Cihaz türü
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm"
                style={{
                  background: !form.is_new ? C.ink : C.paperLite,
                  color: !form.is_new ? C.paper : C.ink,
                  border: `1px solid ${C.line}`,
                }}>
                <input type="radio" name="is_new_edit" checked={!form.is_new} onChange={() => up('is_new', false)} className="sr-only" />
                İkinci el
              </label>
              <label className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm"
                style={{
                  background: form.is_new ? C.accent : C.paperLite,
                  color: form.is_new ? '#fff' : C.ink,
                  border: `1px solid ${C.line}`,
                }}>
                <input type="radio" name="is_new_edit" checked={form.is_new} onChange={() => up('is_new', true)} className="sr-only" />
                ⚡ Sıfır cihaz
              </label>
            </div>
            {form.is_new && (
              <div className="text-[10px] mt-2 font-mono" style={{ color: C.muted }}>
                ⓘ Batarya %100 ve kondisyon "Sıfır / Kutulu" otomatik atanır.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input form={form} up={up} label="Marka" k="brand" />
            <Input form={form} up={up} label="Model" k="model" />
            <Input form={form} up={up} label="Renk" k="color" />
            <Input form={form} up={up} label="Hafıza" k="storage" />
            <Input form={form} up={up} label="RAM" k="ram" />
            <Input form={form} up={up} label="Ekran" k="screen" />
            {!form.is_new && (
              <Input form={form} up={up} label="Batarya %" k="battery" type="number" min="0" max="100" />
            )}
            <Input form={form} up={up} label="Raf" k="shelf" />
            {!form.is_new && (
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                  Durum (kondisyon)
                </label>
                <select value={form.condition} onChange={e => up('condition', e.target.value)}
                  className="w-full px-3 py-2 text-sm border outline-none"
                  style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
                  <option>A temiz</option>
                  <option>B kullanım izleri</option>
                  <option>B ekran çatlak</option>
                  <option>C anakart arızalı</option>
                </select>
              </div>
            )}
            <Input form={form} up={up} label="Garanti bitiş tarihi" k="warranty_end" type="date" />
          </div>

          <div className="pt-3 border-t" style={{ borderColor: C.line }}>
            <div className="text-[10px] uppercase tracking-[0.2em] font-mono mb-3" style={{ color: C.muted }}>
              — FİYAT & KİŞİLER
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Input form={form} up={up} label="Alış fiyatı (₺)" k="buy_price" type="number" min="0" step="100" />
              <Input form={form} up={up} label="Satış fiyatı (₺)" k="sell_price" type="number" min="0" step="100" />
              <Input form={form} up={up} label="Tedarikçi / Aldığım kişi" k="supplier_name" placeholder="Ad soyad" />
              <Input form={form} up={up} label="Müşteri / Sattığım kişi" k="customer_name" placeholder="Ad soyad" />
            </div>
            <div className="text-[10px] mt-2" style={{ color: C.muted }}>
              ⓘ Fiyatları manuel değiştirirsen kasa hareketleri otomatik güncellenmez. Düzeltme için kasa sayfasından elle hareket ekle.
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
              Not
            </label>
            <textarea value={form.note} onChange={e => up('note', e.target.value)}
              rows="3"
              className="w-full px-3 py-2 text-sm border outline-none"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }} />
          </div>

          {err && <div className="text-sm p-3" style={{ background: C.pillBad, color: C.bad }}>{err}</div>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 text-xs font-mono border"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
              VAZGEÇ
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 text-xs font-mono disabled:opacity-50"
              style={{ background: C.ink, color: C.paper }}>
              {saving ? 'KAYDEDİLİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
