import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle, Keyboard, FlipHorizontal2, ZapOff, Zap } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { C } from './ui';

/**
 * Full-screen barcode/QR scanner.
 *
 * Props:
 *   isOpen     — modal görünür mü
 *   onClose    — vazgeç
 *   onResult   — (text) => başarılı tarama. Component otomatik kapanır.
 *   title      — başlık (örn. "IMEI'yi tara")
 *   hint       — orta alttaki yönlendirme metni
 *   accept     — okunan değeri kabul edersen true döndür. False döndürürsen tarayıcı taramaya devam eder.
 *                Örn. (text) => /^\d{15}$/.test(text)  ile sadece 15 haneli IMEI kabul edilir.
 *   manualEntry— "Elle gir" butonu göster (varsayılan true)
 */
export default function BarcodeScanner({
  isOpen,
  onClose,
  onResult,
  title = 'Barkod / QR oku',
  hint = 'Barkodu çerçevenin içine al',
  accept,
  manualEntry = true,
}) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);
  const [manualValue, setManualValue] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setStarting(true);
    setShowManual(false);
    setManualValue('');

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const start = async () => {
      try {
        // arka kamerayı tercih et (mobil için kritik), yoksa varsayılana düşer
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };
        const controls = await reader.decodeFromConstraints(
          constraints,
          videoRef.current,
          (result, err) => {
            if (!result) return;
            const text = result.getText();
            setLastSeen(text);
            // accept filtresi varsa ve geçmediyse tara devam etsin
            if (typeof accept === 'function' && !accept(text)) return;
            // başarılı tarama — titreşim + callback
            try { navigator.vibrate?.(120); } catch {}
            try { controls.stop(); } catch {}
            onResult(text);
          }
        );
        controlsRef.current = controls;
        setStarting(false);
      } catch (e) {
        setStarting(false);
        const msg =
          e?.name === 'NotAllowedError' ? 'Kamera erişimine izin verilmedi. Tarayıcı ayarlarından izin ver.' :
          e?.name === 'NotFoundError'   ? 'Cihazında uygun kamera bulunamadı.' :
          e?.name === 'NotReadableError'? 'Kamera başka bir uygulama tarafından kullanılıyor.' :
          (e?.message?.includes('Only secure') || e?.message?.includes('https'))
            ? 'Kamera kullanımı için HTTPS gerekli (canlıda otomatik aktif).'
            : (e?.message || 'Kamera başlatılamadı.');
        setError(msg);
      }
    };

    start();

    return () => {
      // cleanup: stream'i kapat
      try { controlsRef.current?.stop(); } catch {}
      try {
        const stream = videoRef.current?.srcObject;
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          videoRef.current.srcObject = null;
        }
      } catch {}
    };
  }, [isOpen, onResult, accept]);

  const handleManual = (e) => {
    e.preventDefault();
    if (!manualValue.trim()) return;
    if (typeof accept === 'function' && !accept(manualValue.trim())) {
      setError('Geçersiz değer. Lütfen kontrol et.');
      return;
    }
    onResult(manualValue.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-black/70 backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Camera size={16} />
          <span className="text-sm font-mono uppercase tracking-[0.15em]">{title}</span>
        </div>
        <button onClick={onClose} aria-label="Kapat" className="p-1">
          <X size={22} />
        </button>
      </header>

      {/* Video + overlay */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Targeting frame */}
        {!error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative" style={{ width: 'min(85vw, 380px)', height: 'min(50vh, 220px)' }}>
              {/* Karanlık dış maske */}
              <div className="absolute inset-0" style={{
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              }} />
              {/* 4 köşe bracket */}
              <Bracket pos="tl" />
              <Bracket pos="tr" />
              <Bracket pos="bl" />
              <Bracket pos="br" />
              {/* Tarama çizgisi */}
              <div className="absolute left-0 right-0 h-[2px] animate-scan" style={{
                background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)`,
                top: '50%',
                boxShadow: `0 0 8px ${C.accent}`,
              }} />
            </div>
          </div>
        )}

        {/* Hint text */}
        {!error && !starting && (
          <div className="absolute bottom-24 left-0 right-0 text-center px-4 pointer-events-none">
            <div className="inline-block px-3 py-2 text-xs font-mono uppercase tracking-[0.15em] bg-black/60">
              {hint}
            </div>
            {lastSeen && (
              <div className="mt-2 text-[10px] font-mono opacity-60 break-all">
                son okunan: {lastSeen.slice(0, 30)}{lastSeen.length > 30 ? '...' : ''}
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {starting && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              <div className="mt-3 text-xs font-mono uppercase tracking-[0.15em] opacity-70">Kamera başlatılıyor...</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 px-6">
            <div className="max-w-sm text-center">
              <AlertCircle size={32} className="mx-auto mb-3" style={{ color: C.bad }} />
              <div className="text-sm mb-4">{error}</div>
              {manualEntry && (
                <button onClick={() => { setError(null); setShowManual(true); }}
                  className="px-4 py-2 text-xs font-mono inline-flex items-center gap-2"
                  style={{ background: C.accent, color: '#fff' }}>
                  <Keyboard size={13} /> ELLE GİR
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer with manual entry */}
      {(showManual || (!error && manualEntry)) && (
        <footer className="bg-black/80 backdrop-blur-sm p-4 relative z-10">
          {showManual ? (
            <form onSubmit={handleManual} className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="IMEI / Kod"
                className="flex-1 px-3 py-2.5 text-sm font-mono outline-none bg-white/10 text-white placeholder-white/40"
                style={{ border: '1px solid rgba(255,255,255,0.2)' }}
              />
              <button type="submit"
                className="px-4 py-2.5 text-xs font-mono"
                style={{ background: C.accent, color: '#fff' }}>
                ONAYLA
              </button>
              <button type="button" onClick={() => setShowManual(false)}
                className="px-3 py-2.5 text-xs font-mono"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                ✕
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="w-full py-2.5 text-xs font-mono inline-flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
              <Keyboard size={13} /> ELLE GİR
            </button>
          )}
        </footer>
      )}
    </div>
  );
}

function Bracket({ pos }) {
  const base = 'absolute w-7 h-7 border-white';
  const map = {
    tl: 'top-0 left-0 border-t-2 border-l-2',
    tr: 'top-0 right-0 border-t-2 border-r-2',
    bl: 'bottom-0 left-0 border-b-2 border-l-2',
    br: 'bottom-0 right-0 border-b-2 border-r-2',
  };
  return <div className={`${base} ${map[pos]}`} />;
}
