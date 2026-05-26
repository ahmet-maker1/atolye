import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { C } from './ui';

/**
 * BTK IMEI sorgulama yardımcı modal'ı.
 * e-Devlet iframe'i kabul etmiyor (X-Frame-Options DENY) — bu yüzden
 * popup pencere açıyoruz. Kullanıcı popup'ı manuel kapatır, modal
 * sistem içinde kalır.
 */
export default function BtkSorguModal({ imei, onClose }) {
  const [copied, setCopied] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const popupRef = useRef(null);

  // E-Devlet'in resmi IMEI sorgulama URL'i.
  // Doğrudan IMEI ile pre-fill desteklemiyor — sadece sayfaya götürür.
  const BTK_URL = 'https://www.turkiye.gov.tr/imei-sorgulama';

  const openPopup = () => {
    // Eski popup açıksa odakla, açma yenisi
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }
    const w = 1000, h = 720;
    const left = (window.screen.width - w) / 2;
    const top  = (window.screen.height - h) / 2;
    const features = `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    const popup = window.open(BTK_URL, 'btk-sorgu', features);
    if (popup) {
      popupRef.current = popup;
      setPopupOpen(true);
      popup.focus();
      // Popup kapanınca state'i güncelle
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          setPopupOpen(false);
          clearInterval(checkClosed);
        }
      }, 500);
    } else {
      // Tarayıcı popup'ı engelledi
      alert('Tarayıcı popup engellendi. Lütfen bu site için izin ver veya yeni sekmede aç.');
    }
  };

  const copyImei = async () => {
    try {
      await navigator.clipboard.writeText(imei);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      // Clipboard izni yoksa textarea fallback
      const ta = document.createElement('textarea');
      ta.value = imei;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
      document.body.removeChild(ta);
    }
  };

  // Modal kapanırken popup'ı kapatma — bırak kullanıcı yönetsin
  useEffect(() => {
    return () => {
      // intentionally do nothing; popup hayatta kalsın
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'var(--modal-overlay)' }} onClick={onClose}>
      <div className="w-full max-w-lg mt-8" style={{ background: C.paper }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: C.line }}>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>
              § B / BTK SORGUSU
            </div>
            <h2 className="text-2xl font-serif mt-0.5 inline-flex items-center gap-2" style={{ color: C.ink }}>
              <ShieldCheck size={20} style={{ color: C.accent }} /> IMEI doğrulama
            </h2>
          </div>
          <button onClick={onClose}><X size={20} style={{ color: C.ink }} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* IMEI gösterimi + kopyala */}
          <div className="p-3 border" style={{ background: C.paperDeep, borderColor: C.line }}>
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-1" style={{ color: C.muted }}>
              Sorgulanacak IMEI
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xl font-mono" style={{ color: C.ink, letterSpacing: '0.05em' }}>
                {imei}
              </div>
              <button onClick={copyImei}
                className="px-3 py-2 text-[10px] font-mono inline-flex items-center gap-1.5"
                style={{ background: copied ? C.ok : C.ink, color: C.paper }}>
                {copied ? <><Check size={11} /> KOPYALANDI</> : <><Copy size={11} /> KOPYALA</>}
              </button>
            </div>
          </div>

          {/* Adım adım talimat */}
          <div className="space-y-2 text-sm" style={{ color: C.inkSoft }}>
            <Step n="1" text="Aşağıdaki butona bas, e-Devlet sayfası küçük pencerede açılır." />
            <Step n="2" text="Açılan sayfada e-Devlet şifrenle giriş yap." />
            <Step n="3" text='IMEI alanına yapıştır (yukarıdaki "KOPYALA" butonu kullan).' />
            <Step n="4" text="Sonucu gör — kayıtlı / kayıtsız / kara liste." />
            <Step n="5" text="Pencereyi kapat, ana sayfaya geri dön." />
          </div>

          {/* Açıklama notu */}
          <div className="p-3 text-[11px] inline-flex items-start gap-2"
            style={{ background: C.pillWarn, color: C.warn, border: `1px solid ${C.warn}` }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              BTK ile doğrudan API bağlantımız yok. Sorgu için e-Devlet sayfasını
              ayrı pencerede açarız. Sonuç sistemimize otomatik yansımaz —
              kontrol ettikten sonra istersen cihazın notuna kaydedebilirsin.
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose}
              className="flex-1 py-3 text-xs font-mono border"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
              KAPAT
            </button>
            <button onClick={openPopup}
              className="flex-1 py-3 text-xs font-mono inline-flex items-center justify-center gap-2"
              style={{ background: C.accent, color: '#fff' }}>
              <ExternalLink size={13} />
              {popupOpen ? 'PENCEREYİ ÖNE AL' : `E-DEVLET'TE AÇ`}
            </button>
          </div>
        </div>
      </div>
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
