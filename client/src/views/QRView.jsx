import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Hash, HardDrive, Cpu, Monitor, Battery, MapPin, Palette, Tag, Calendar } from 'lucide-react';
import { api, tl } from '../lib/api';
import { C, StatusPill, phoneColor } from '../components/ui';

export default function QRView() {
  const { token } = useParams();
  const [device, setDevice] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.deviceByQR(token).then(setDevice).catch(e => setErr(e.message));
  }, [token]);

  if (err) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: C.paper }}>
      <div className="max-w-sm text-center">
        <div className="text-2xl font-serif mb-2" style={{ color: C.bad }}>Cihaz bulunamadı</div>
        <div className="text-sm" style={{ color: C.muted }}>{err}</div>
      </div>
    </div>
  );

  if (!device) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: C.paper }}>
      <div className="text-sm font-mono" style={{ color: C.muted }}>yükleniyor...</div>
    </div>
  );

  const totalCost = Number(device.buy_price) + Number(device.expenses);

  return (
    <div className="min-h-screen" style={{ background: C.paper }}>
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="text-center pt-4">
          <div className="text-[10px] tracking-[0.3em] uppercase font-mono" style={{ color: C.accent, fontWeight: 600 }}>
            ATÖLYE.CO
          </div>
          <div className="text-[9px] tracking-[0.2em] uppercase font-mono mt-1" style={{ color: C.muted }}>
            Cihaz Dosyası — QR Görüntüleme
          </div>
        </div>

        {/* Phone visual or photo */}
        <div className="flex justify-center py-4">
          {device.image_urls && device.image_urls.length > 0 ? (
            <div className="w-full max-w-xs aspect-square overflow-hidden" style={{ background: C.paperDeep, border: `1px solid ${C.line}` }}>
              <img src={device.image_urls[0]} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="relative" style={{
              width: 140, height: 280,
              background: phoneColor(device.color),
              borderRadius: 22,
              border: '1px solid rgba(0,0,0,0.2)',
              boxShadow: '0 16px 40px -16px rgba(0,0,0,0.3)',
            }}>
              <div className="absolute" style={{
                top: 10, left: '50%', transform: 'translateX(-50%)',
                width: 60, height: 18, borderRadius: 9, background: '#0a0a0a',
              }} />
              <div className="absolute" style={{
                inset: 6, top: 38, borderRadius: 16, background: 'rgba(0,0,0,0.15)',
              }} />
            </div>
          )}
        </div>

        {/* Additional photo thumbnails */}
        {device.image_urls && device.image_urls.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {device.image_urls.slice(1, 5).map((src, i) => (
              <div key={i} className="aspect-square overflow-hidden" style={{ background: C.paperDeep, border: `1px solid ${C.line}` }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Title */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-[10px] tracking-[0.2em] uppercase font-mono mb-2"
            style={{ color: C.muted }}>
            <span style={{ color: C.accent }}>{device.code}</span>
            <span>·</span>
            <StatusPill s={device.status} />
          </div>
          <h1 className="text-3xl font-serif leading-tight" style={{ color: C.ink, fontWeight: 400, letterSpacing: '-0.02em' }}>
            {device.brand} <em style={{ color: C.accent }}>{device.model}</em>
          </h1>
          <div className="text-sm font-serif italic mt-1" style={{ color: C.inkSoft }}>
            {device.color} · {device.storage} · {device.condition}
          </div>
        </div>

        {/* Specs */}
        <div className="border" style={{ background: C.paperLite, borderColor: C.line }}>
          {[
            ['IMEI', device.imei, Hash],
            ['Hafıza', device.storage, HardDrive],
            ['RAM', device.ram, Cpu],
            ['Ekran', device.screen, Monitor],
            ['Batarya', (device.battery || 0) + '%', Battery],
            ['Raf', device.shelf || '—', MapPin],
            ['Renk', device.color, Palette],
            ['Kondisyon', device.condition, Tag],
            ['Alındı', device.purchase_date, Calendar],
          ].map(([k, v, Icon]) => (
            <div key={k} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0"
              style={{ borderColor: C.line }}>
              <div className="flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase font-mono"
                style={{ color: C.muted }}>
                <Icon size={11} /> {k}
              </div>
              <div className="text-xs font-mono" style={{ color: C.ink }}>{v || '—'}</div>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="border p-4 space-y-2" style={{ background: C.paperLite, borderColor: C.line }}>
          <div className="text-[10px] tracking-[0.18em] uppercase font-mono mb-2" style={{ color: C.muted }}>
            FİNANSAL ÖZET
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: C.muted }}>Toplam maliyet</span>
            <span className="font-mono" style={{ color: C.ink }}>{tl(totalCost)}</span>
          </div>
          {device.sell_price > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span style={{ color: C.muted }}>Satış fiyatı</span>
                <span className="font-mono" style={{ color: C.accent, fontWeight: 600 }}>{tl(device.sell_price)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t" style={{ borderColor: C.line }}>
                <span className="text-sm" style={{ color: C.ink, fontWeight: 600 }}>Kâr</span>
                <span className="text-base font-serif" style={{
                  color: device.sell_price - totalCost > 0 ? C.ok : C.bad,
                }}>
                  {device.sell_price - totalCost > 0 ? '+ ' : ''}{tl(device.sell_price - totalCost)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Note */}
        {device.note && (
          <div className="border p-4" style={{ background: C.pillWarn, borderColor: C.warn, borderStyle: 'dashed' }}>
            <div className="text-[10px] tracking-[0.18em] uppercase font-mono mb-1" style={{ color: C.warn, fontWeight: 600 }}>
              ⚠ NOT
            </div>
            <div className="text-sm" style={{ color: C.inkSoft }}>{device.note}</div>
          </div>
        )}

        <div className="text-center pt-4 pb-8 text-[9px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>
          atölye.co · cihaz envanter sistemi
        </div>
      </div>
    </div>
  );
}
