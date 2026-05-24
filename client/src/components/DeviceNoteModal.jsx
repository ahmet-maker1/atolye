import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { api, auth } from '../lib/api';
import { C } from './ui';

/**
 * Cihaza zaman tüneline kısa not ekler.
 * Backend transactions.type='note', amount=0 olarak kaydeder.
 */
export default function DeviceNoteModal({ device, onClose, onSaved }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true); setErr(null);
    try {
      const user = auth.get();
      await api.txCreate({
        device_id: device.id,
        type: 'note',
        amount: 0,
        note: note.trim(),
        created_by: user?.id || null,
      });
      onSaved();
    } catch (ex) {
      setErr(ex.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'var(--modal-overlay)' }} onClick={onClose}>
      <div className="w-full max-w-md mt-8" style={{ background: C.paper }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between p-4 sm:p-5 border-b" style={{ borderColor: C.line }}>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>
              § N / NOT
            </div>
            <h2 className="text-2xl font-serif mt-0.5 inline-flex items-center gap-2" style={{ color: C.ink }}>
              <FileText size={20} style={{ color: C.accent }} /> Ekstra not ekle
            </h2>
            <div className="text-[11px] font-mono mt-1" style={{ color: C.muted }}>
              {device.brand} {device.model} · {device.code}
            </div>
          </div>
          <button onClick={onClose}><X size={20} style={{ color: C.ink }} /></button>
        </div>

        <form onSubmit={submit} className="p-4 sm:p-5 space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
              Not <span style={{ color: C.accent }}>*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              autoFocus
              rows="4"
              placeholder="Müşteri bir hafta sonra gelecek · Yedek parça sipariş edildi · Garanti talebi gönderildi..."
              className="w-full px-3 py-2 text-sm border outline-none"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}
            />
            <div className="text-[10px] mt-1" style={{ color: C.muted }}>
              Bu not cihazın zaman tünelinde tarih damgalı olarak görünür.
            </div>
          </div>

          {err && <div className="text-sm p-3" style={{ background: C.pillBad, color: C.bad }}>{err}</div>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 text-xs font-mono border"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
              VAZGEÇ
            </button>
            <button type="submit" disabled={saving || !note.trim()}
              className="flex-1 py-3 text-xs font-mono disabled:opacity-50"
              style={{ background: C.accent, color: '#fff' }}>
              {saving ? 'KAYDEDİLİYOR...' : 'NOTU KAYDET'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
