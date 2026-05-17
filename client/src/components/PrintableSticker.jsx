import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { toPng } from 'html-to-image';

// ─── Varsayılan sticker konfigürasyonu ────────────────────────
export const DEFAULT_STICKER_CONFIG = {
  shopName:      'ATÖLYE.CO',
  tagline:       '',                  // örn: "0532 123 45 67"
  showQR:        true,
  showBarcode:   true,
  showIMEI:      true,
  showBrandModel: true,
  showSpecs:     true,                // renk · hafıza · batarya
  showShelf:     true,
  showCode:      true,
  showPrice:     false,               // sell_price varsa
  showDate:      false,               // alındığı tarih
  showWarranty:  true,                // garanti bitiş tarihi varsa göster
};

// LocalStorage'dan config yükle (yoksa varsayılan döner)
export function loadStickerConfig() {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_STICKER_CONFIG };
  try {
    const raw = localStorage.getItem('atolye_sticker_config');
    if (!raw) return { ...DEFAULT_STICKER_CONFIG };
    const parsed = JSON.parse(raw);
    // Yeni alanlar eklenirse default ile birleştir (geri uyum)
    return { ...DEFAULT_STICKER_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_STICKER_CONFIG };
  }
}

export function saveStickerConfig(cfg) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem('atolye_sticker_config', JSON.stringify(cfg)); } catch {}
}

/**
 * Yazıcıdan çıkacak gerçek boyutlu etiket. Tüm ölçüler `mm` cinsinden.
 *
 * Props:
 *   device  — { code, brand, model, color, storage, battery, shelf, imei, sell_price, purchase_date }
 *   qrUrl   — QR'a gömülecek URL
 *   size    — '60x40' | '50x30' | '40x25'
 *   config  — DEFAULT_STICKER_CONFIG yapısında, hangi alanların gösterileceği
 */
export default function PrintableSticker({
  device,
  qrUrl,
  size = '60x40',
  config = DEFAULT_STICKER_CONFIG,
}) {
  const cfg = { ...DEFAULT_STICKER_CONFIG, ...config };

  // Sayfa boyutuna göre ölçüler
  const sizes = {
    '60x40': { w: 60, h: 40, qrPx: 88,  barH: 30, padding: 2,    titlePt: 8,  bodyPt: 6,   imeiPt: 5.5, shopPt: 6 },
    '50x30': { w: 50, h: 30, qrPx: 70,  barH: 22, padding: 1.5,  titlePt: 7,  bodyPt: 5.5, imeiPt: 5,   shopPt: 5 },
    '40x25': { w: 40, h: 25, qrPx: 56,  barH: 18, padding: 1,    titlePt: 6,  bodyPt: 5,   imeiPt: 4.5, shopPt: 4.5 },
    '40x17': { w: 40, h: 17, qrPx: 44,  barH: 12, padding: 0.8,  titlePt: 5,  bodyPt: 4,   imeiPt: 4,   shopPt: 4 },
  };
  const s = sizes[size] || sizes['60x40'];

  // Specs satırı (görünür ise)
  const specsParts = [];
  if (cfg.showSpecs) {
    if (device.color)   specsParts.push(device.color);
    if (device.storage) specsParts.push(device.storage);
    if (device.battery) specsParts.push(`${device.battery}%`);
  }
  const specsLine = specsParts.join(' · ');

  // Footer satırı (raf · kod · fiyat · tarih)
  const footerParts = [];
  if (cfg.showCode && device.code)   footerParts.push(device.code);
  if (cfg.showShelf && device.shelf) footerParts.push(`RAF ${device.shelf}`);
  if (cfg.showPrice && device.sell_price > 0) {
    footerParts.push(`₺${new Intl.NumberFormat('tr-TR').format(device.sell_price)}`);
  }
  if (cfg.showDate && device.purchase_date) {
    footerParts.push(new Date(device.purchase_date).toLocaleDateString('tr-TR'));
  }
  if (cfg.showWarranty && device.warranty_end) {
    footerParts.push(`GAR. ${new Date(device.warranty_end).toLocaleDateString('tr-TR')}`);
  }
  const footerLine = footerParts.join(' · ');

  return (
    <div className="atolye-sticker" style={{
      width: `${s.w}mm`,
      height: `${s.h}mm`,
      padding: `${s.padding}mm`,
      boxSizing: 'border-box',
      display: 'flex',
      gap: `${s.padding}mm`,
      background: '#fff',
      color: '#000',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      pageBreakAfter: 'always',
      breakAfter: 'page',
      overflow: 'hidden',
    }}>
      {/* Sol kolon: QR (+ küçük dükkan etiketi) */}
      {cfg.showQR && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexShrink: 0,
        }}>
          <QRCodeSVG
            value={qrUrl}
            size={s.qrPx}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#000000"
            style={{ display: 'block' }}
          />
          {cfg.showCode && device.code && (
            <div style={{
              fontSize: `${s.bodyPt}pt`,
              fontWeight: 700,
              marginTop: '0.5mm',
              letterSpacing: '0.05em',
              fontFamily: 'monospace',
            }}>
              {device.code}
            </div>
          )}
        </div>
      )}

      {/* Sağ kolon: bilgi + barkod */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        <div>
          {/* Dükkan adı */}
          {cfg.shopName && (
            <div style={{
              fontSize: `${s.shopPt}pt`,
              letterSpacing: '0.15em',
              color: '#C8421C',
              fontWeight: 700,
              marginBottom: '0.3mm',
              textTransform: 'uppercase',
            }}>
              {cfg.shopName}
            </div>
          )}

          {/* Marka + model */}
          {cfg.showBrandModel && (
            <div style={{
              fontSize: `${s.titlePt}pt`,
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: '0.3mm',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {device.brand} {device.model}
            </div>
          )}

          {/* Özellikler satırı */}
          {specsLine && (
            <div style={{
              fontSize: `${s.bodyPt}pt`,
              lineHeight: 1.2,
              color: '#222',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {specsLine}
            </div>
          )}

          {/* Slogan / tagline (telefon vs.) */}
          {cfg.tagline && (
            <div style={{
              fontSize: `${s.bodyPt - 0.5}pt`,
              color: '#555',
              marginTop: '0.3mm',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {cfg.tagline}
            </div>
          )}

          {/* Alt satır: kod · raf · fiyat · tarih */}
          {footerLine && !cfg.showQR /* QR varsa kod zaten sol altta */ && (
            <div style={{
              fontSize: `${s.bodyPt - 0.5}pt`,
              fontFamily: 'monospace',
              color: '#444',
              marginTop: '0.3mm',
            }}>
              {footerLine}
            </div>
          )}
          {footerLine && cfg.showQR && (
            <div style={{
              fontSize: `${s.bodyPt - 0.5}pt`,
              fontFamily: 'monospace',
              color: '#444',
              marginTop: '0.3mm',
            }}>
              {/* QR alanı zaten kod gösteriyor — burada kalanı göster */}
              {footerParts.filter(p => !device.code || !p.includes(device.code)).join(' · ')}
            </div>
          )}
        </div>

        {/* Barkod */}
        {cfg.showBarcode && device.imei && (
          <div style={{ marginTop: '0.5mm' }}>
            <div style={{ lineHeight: 0 }}>
              <Barcode
                value={String(device.imei)}
                format="CODE128"
                width={
                  size === '40x17' ? 1.1 :
                  size === '40x25' ? 1.4 :
                  size === '50x30' ? 1.7 : 2
                }
                height={s.barH}
                displayValue={false}
                background="#FFFFFF"
                lineColor="#000000"
                margin={0}
              />
            </div>
            {cfg.showIMEI && (
              <div style={{
                fontSize: `${s.imeiPt}pt`,
                fontFamily: 'monospace',
                textAlign: 'center',
                letterSpacing: '0.02em',
                marginTop: '0.2mm',
              }}>
                {device.imei}
              </div>
            )}
          </div>
        )}
        {/* Barkod yok ama IMEI varsa, IMEI'yi tek başına göster */}
        {!cfg.showBarcode && cfg.showIMEI && device.imei && (
          <div style={{
            fontSize: `${s.imeiPt + 1}pt`,
            fontFamily: 'monospace',
            textAlign: 'center',
            marginTop: '1mm',
            fontWeight: 600,
          }}>
            IMEI: {device.imei}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Yazdırma helper'ı — @page boyutunu dinamik enjekte eder, window.print() çağırır.
 */
export function printStickers(size = '60x40') {
  const dims = {
    '60x40': '60mm 40mm',
    '50x30': '50mm 30mm',
    '40x25': '40mm 25mm',
    '40x17': '40mm 17mm',
  };
  const pageSize = dims[size] || dims['60x40'];

  const old = document.getElementById('atolye-print-style');
  if (old) old.remove();

  const styleEl = document.createElement('style');
  styleEl.id = 'atolye-print-style';
  styleEl.textContent = `
    @media print {
      @page {
        size: ${pageSize};
        margin: 0;
      }
    }
  `;
  document.head.appendChild(styleEl);

  requestAnimationFrame(() => {
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        const el = document.getElementById('atolye-print-style');
        if (el) el.remove();
      }, 1000);
    }, 50);
  });
}

/**
 * Sticker DOM element'ini PNG olarak indirir.
 * Niimbot ve diğer app-tabanlı yazıcılar için.
 *
 * el       — .atolye-sticker class'lı div (PrintableSticker render edilmiş hali)
 * filename — örn. "DVC-00001.png"
 */
export async function downloadStickerAsPng(el, filename) {
  if (!el) throw new Error('Sticker element bulunamadı');
  const dataUrl = await toPng(el, {
    pixelRatio: 4,           // ~600-900 piksel — Niimbot 203 DPI için fazlasıyla yeter
    backgroundColor: '#ffffff',
    cacheBust: true,
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Birden fazla sticker'ı sırayla PNG olarak indirir.
 * Tarayıcılar arka arkaya indirme yapınca uyarı verebilir — kullanıcı izin vermeli.
 */
export async function downloadStickersAsPng(elements, baseNames) {
  for (let i = 0; i < elements.length; i++) {
    await downloadStickerAsPng(elements[i], `${baseNames[i]}.png`);
    await new Promise(r => setTimeout(r, 400));  // tarayıcı download throttling
  }
}
