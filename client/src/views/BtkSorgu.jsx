import React, { useState, useRef } from 'react';
import { ShieldCheck, ExternalLink, Copy, Check, AlertCircle, Search, Hash } from 'lucide-react';
import { C, Card, SectionLabel } from '../components/ui';
import BarcodeScanner from '../components/BarcodeScanner';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';

const BTK_URL = 'https://www.turkiye.gov.tr/imei-sorgulama';

export default function BtkSorgu() {
  const [imei, setImei] = useState('');
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [foundDevice, setFoundDevice] = useState(null);
  const popupRef = useRef(null);
  const navigate = useNavigate();
  const { push } = useToast();

  const openPopup = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }
    const w = 1000, h = 720;
    const left = (window.screen.width - w) / 2;
    const top  = (window.screen.height - h) / 2;
    const popup = window.open(BTK_URL, 'btk-sorgu', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
    if (popup) {
      popupRef.current = popup;
      setPopupOpen(true);
      popup.focus();
      const t = setInterval(() => { if (popup.closed) { setPopupOpen(false); clearInterval(t); } }, 500);
    } else {
      push({ kind: 'error', message: 'Tarayıcı popup engelledi. Bu site için izin ver.' });
    }
  };

  const copyImei = async () => {
    if (!imei) return;
    try {
      await navigator.clipboard.writeText(imei);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = imei;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
      document.body.removeChild(ta);
    }
  };

  // Sistemde bu IMEI'ye ait cihaz var mı? Bilgilendirme amaçlı.
  const checkLocal = async () => {
    if (!imei || imei.length < 8) return;
    try {
      const list = await api.devicesList({ q: imei });
      const match = list.find(d => d.imei === imei);
      setFoundDevice(match || null);
    } catch (_) {
      setFoundDevice(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Başlık */}
      <div>
        <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>
          § B / BTK
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif mt-1" style={{ color: C.ink }}>
          IMEI Sorgu (e-Devlet)
        </h1>
        <p className="text-sm mt-1" style={{ color: C.inkSoft }}>
          BTK kayıt durumunu ve kara liste kontrolünü resmi e-Devlet sayfası üzerinden yap.
        </p>
      </div>

      <Card>
        <SectionLabel num="01" label="IMEI gir" />

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
              IMEI numarası (15 hane)
            </label>
            <div className="flex items-stretch border-2" style={{ borderColor: C.ink, background: C.paperLite }}>
              <Hash size={18} style={{ color: C.muted }} className="ml-3 self-center" />
              <input
                value={imei}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 15);
                  setImei(v);
                  setFoundDevice(null);
                }}
                onBlur={checkLocal}
                placeholder="123456789012345"
                className="flex-1 min-w-0 bg-transparent px-3 py-3 text-base outline-none font-mono"
                style={{ color: C.ink, letterSpacing: '0.05em' }}
              />
              <button onClick={() => setScanning(true)} title="Kamera ile tara"
                className="px-4 inline-flex items-center justify-center border-l"
                style={{ borderColor: C.line, background: C.ink, color: C.paper }}>
                <Search size={14} /> <span className="ml-1.5 text-xs font-mono">TARA</span>
              </button>
            </div>
            {imei.length > 0 && imei.length !== 15 && (
              <div className="text-[10px] font-mono mt-1" style={{ color: C.warn }}>
                {imei.length}/15 hane — IMEI tam değil
              </div>
            )}
          </div>

          {/* Sistemde varsa bilgilendirme */}
          {foundDevice && (
            <div className="p-3 border inline-flex items-center justify-between gap-3"
              style={{ background: C.pillOk, color: C.ok, border: `1px solid ${C.ok}` }}>
              <div className="text-sm">
                ✓ Bu IMEI <b>{foundDevice.code} · {foundDevice.brand} {foundDevice.model}</b> olarak sistemde kayıtlı.
              </div>
              <button onClick={() => navigate(`/devices/${foundDevice.id}`)}
                className="px-3 py-1.5 text-[10px] font-mono"
                style={{ background: C.ok, color: '#fff' }}>
                CİHAZA GİT
              </button>
            </div>
          )}

          {/* Butonlar */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={copyImei} disabled={!imei}
              className="py-3 text-xs font-mono inline-flex items-center justify-center gap-2 border disabled:opacity-40"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
              {copied ? <><Check size={13} /> KOPYALANDI</> : <><Copy size={13} /> KOPYALA</>}
            </button>
            <button onClick={openPopup}
              className="py-3 text-xs font-mono inline-flex items-center justify-center gap-2"
              style={{ background: C.accent, color: '#fff' }}>
              <ExternalLink size={13} />
              {popupOpen ? 'PENCEREYİ ÖNE AL' : 'E-DEVLET\'TE AÇ'}
            </button>
          </div>
        </div>
      </Card>

      {/* Talimat */}
      <Card>
        <SectionLabel num="02" label="Nasıl çalışır" />
        <div className="space-y-2 text-sm" style={{ color: C.inkSoft }}>
          <Step n="1" text="IMEI alanına numarayı yaz veya kameradan tara." />
          <Step n="2" text='"KOPYALA" tıkla — IMEI clipboard\'a alınır.' />
          <Step n="3" text='"E-DEVLET\'TE AÇ" tıkla — küçük pencere açılır.' />
          <Step n="4" text="Açılan sayfada e-Devlet şifrenle giriş yap." />
          <Step n="5" text="IMEI alanına yapıştır, sorgula." />
          <Step n="6" text="Pencereyi kapat → sistemde kal." />
        </div>

        <div className="mt-4 p-3 text-[11px] inline-flex items-start gap-2"
          style={{ background: C.pillWarn, color: C.warn, border: `1px solid ${C.warn}` }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            BTK ile resmi API bağlantısı yok. Sorgu sonucu sisteme otomatik kaydedilmez —
            kontrol ettikten sonra cihazın notuna manuel ekleyebilirsin.
          </div>
        </div>
      </Card>

      {/* Kamera tarayıcı */}
      <BarcodeScanner
        isOpen={scanning}
        onClose={() => setScanning(false)}
        title="IMEI'yi tara"
        hint="Telefonun arkasındaki barkodu çerçeveye al"
        accept={(text) => /^\d{8,17}$/.test(String(text).replace(/\D/g, ''))}
        onResult={(text) => {
          const cleaned = String(text).replace(/\D/g, '').slice(0, 15);
          setImei(cleaned);
          setScanning(false);
        }}
      />
    </div>
  );
}

function Step({ n, text }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] font-mono w-6 h-6 inline-flex items-center justify-center flex-shrink-0"
        style={{ background: C.ink, color: C.paper }}>
        {n}
      </span>
      <span className="leading-snug">{text}</span>
    </div>
  );
}
