import React, { useState, useEffect, useMemo } from 'react';
import { Printer, Check, Settings as SettingsIcon, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { C, Card, SectionLabel, PhoneThumb, StatusPill } from '../components/ui';
import PrintableSticker, {
  printStickers,
  DEFAULT_STICKER_CONFIG,
  loadStickerConfig,
  saveStickerConfig,
} from '../components/PrintableSticker';
import { useToast } from '../components/Toast';

const SIZES = [
  { id: '60x40', label: '60×40 mm', desc: 'standart termal etiket' },
  { id: '50x30', label: '50×30 mm', desc: 'orta boy' },
  { id: '40x25', label: '40×25 mm', desc: 'minimal' },
];

// Düzenlenebilir alanlar (toggle'larla)
const FIELDS = [
  { k: 'showQR',         label: 'QR kod' },
  { k: 'showBarcode',    label: 'Barkod' },
  { k: 'showIMEI',       label: 'IMEI numarası' },
  { k: 'showBrandModel', label: 'Marka & Model' },
  { k: 'showSpecs',      label: 'Özellikler (renk, hafıza, batarya)' },
  { k: 'showCode',       label: 'Cihaz ID (DVC-...)' },
  { k: 'showShelf',      label: 'Raf bilgisi' },
  { k: 'showPrice',      label: 'Satış fiyatı (varsa)' },
  { k: 'showDate',       label: 'Alındığı tarih' },
];

export default function QR() {
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [size, setSize] = useState('60x40');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [config, setConfig] = useState(loadStickerConfig);
  const [editorOpen, setEditorOpen] = useState(false);
  const { push } = useToast();

  // Config değiştikçe localStorage'a kaydet
  useEffect(() => { saveStickerConfig(config); }, [config]);

  useEffect(() => {
    api.devicesList().then(rows => {
      setDevices(rows);
      if (rows.length && !selected) setSelected(rows[0]);
    }).catch(() => {});
  }, []);

  const filtered = query
    ? devices.filter(d =>
        d.code.toLowerCase().includes(query.toLowerCase()) ||
        d.imei.includes(query) ||
        (d.brand + ' ' + d.model).toLowerCase().includes(query.toLowerCase())
      )
    : devices;

  const qrUrl = (d) =>
    d && typeof window !== 'undefined' ? `${window.location.origin}/qr/${d.qr_token}` : '';

  const selectedQrUrl = selected ? qrUrl(selected) : '';

  const bulkDevices = useMemo(
    () => devices.filter(d => selectedIds.has(d.id)),
    [devices, selectedIds]
  );

  const toggleId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(filtered.map(d => d.id)));
  const clearAll = () => setSelectedIds(new Set());

  const updateConfig = (k, v) => setConfig(c => ({ ...c, [k]: v }));
  const resetConfig = () => {
    setConfig({ ...DEFAULT_STICKER_CONFIG });
    push({ kind: 'success', message: 'Sticker ayarları varsayılana döndürüldü.' });
  };

  const printOne = () => {
    if (!selected) return;
    printStickers(size);
  };

  const printBulk = () => {
    if (bulkDevices.length === 0) {
      push({ kind: 'warn', message: 'Önce yazdırılacak cihazları seç.' });
      return;
    }
    push({ kind: 'success', title: 'Yazdırılıyor', message: `${bulkDevices.length} etiket gönderildi.` });
    printStickers(size);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] tracking-[0.25em] uppercase font-mono mb-2" style={{ color: C.muted }}>
            — QR KOD & BARKOD ÜRETİCİ
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif" style={{ fontWeight: 400, letterSpacing: '-0.03em', color: C.ink }}>
            Sticker yazıcı
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditorOpen(!editorOpen)}
            className="px-3 py-2 text-xs inline-flex items-center gap-2 border font-mono"
            style={{
              borderColor: C.line,
              background: editorOpen ? C.ink : C.paperLite,
              color: editorOpen ? C.paper : C.ink,
            }}>
            <SettingsIcon size={13} /> DÜZENLE
          </button>
          <button onClick={() => { setBulkMode(!bulkMode); clearAll(); }}
            className="px-3 py-2 text-xs inline-flex items-center gap-2 border font-mono"
            style={{
              borderColor: C.line,
              background: bulkMode ? C.ink : C.paperLite,
              color: bulkMode ? C.paper : C.ink,
            }}>
            {bulkMode ? '✓ TOPLU' : 'TOPLU'}
          </button>
        </div>
      </div>

      {/* Sticker düzenleyici (DÜZENLE açıkken) */}
      {editorOpen && (
        <Card>
          <SectionLabel num="✎" label="Sticker düzenle" right={
            <button onClick={resetConfig}
              className="text-[10px] font-mono inline-flex items-center gap-1.5 px-2 py-1"
              style={{ background: C.paperDeep, color: C.muted }}>
              <RotateCcw size={11} /> SIFIRLA
            </button>
          } />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sol: metin alanları */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                  Dükkan adı / üst yazı
                </label>
                <input
                  type="text"
                  value={config.shopName}
                  onChange={(e) => updateConfig('shopName', e.target.value)}
                  placeholder="ATÖLYE.CO"
                  maxLength={30}
                  className="w-full px-3 py-2 text-sm border outline-none font-mono"
                  style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}
                />
                <div className="text-[10px] mt-1" style={{ color: C.muted }}>
                  Sticker'ın üstünde vermilion renkli olarak çıkar. Boş bırakılırsa gösterilmez.
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                  Alt yazı (telefon, slogan)
                </label>
                <input
                  type="text"
                  value={config.tagline}
                  onChange={(e) => updateConfig('tagline', e.target.value)}
                  placeholder="0532 123 45 67"
                  maxLength={40}
                  className="w-full px-3 py-2 text-sm border outline-none"
                  style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}
                />
                <div className="text-[10px] mt-1" style={{ color: C.muted }}>
                  Örn: telefon numarası, "Garanti 6 ay", "ikinci el · servis"
                </div>
              </div>
            </div>

            {/* Sağ: alan toggle'ları */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] font-mono mb-2" style={{ color: C.muted }}>
                Görünecek alanlar
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
                {FIELDS.map(f => (
                  <label key={f.k} className="flex items-center gap-2 cursor-pointer text-sm py-1"
                    style={{ color: C.ink }}>
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center border"
                      style={{
                        borderColor: config[f.k] ? C.accent : C.line,
                        background: config[f.k] ? C.accent : 'transparent',
                      }}>
                      {config[f.k] && <Check size={12} color="#fff" strokeWidth={3} />}
                    </span>
                    <input type="checkbox" checked={config[f.k]}
                      onChange={(e) => updateConfig(f.k, e.target.checked)}
                      className="sr-only" />
                    <span className="text-xs">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 text-[11px] flex items-start gap-2"
            style={{ background: C.pillMuted, color: C.inkSoft }}>
            <span style={{ color: C.muted }}>ⓘ</span>
            <span>
              Ayarlar bu tarayıcıya kaydedilir, her seferinde tekrar girmen gerekmez.
              Yazdırılan etiket, aşağıdaki önizlemeyle <strong>tam aynı</strong> olur.
              Etiket boyutu küçükse bazı alanlar kırpılabilir — fazla alan açma.
            </span>
          </div>
        </Card>
      )}

      {/* Boyut seçimi */}
      <Card>
        <SectionLabel num="00" label="Etiket boyutu" />
        <div className="grid grid-cols-3 gap-2">
          {SIZES.map(opt => (
            <button key={opt.id} onClick={() => setSize(opt.id)}
              className="p-3 text-left transition-colors"
              style={{
                background: size === opt.id ? C.ink : C.paperDeep,
                color: size === opt.id ? C.paper : C.ink,
                border: `1px solid ${size === opt.id ? C.ink : C.line}`,
              }}>
              <div className="text-sm font-mono" style={{ fontWeight: 600 }}>{opt.label}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Device picker */}
        <Card className="lg:col-span-2" pad={false}>
          <div className="p-4 border-b space-y-2" style={{ borderColor: C.line }}>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Cihaz ara (ID, IMEI, model)..."
              className="w-full px-3 py-2 text-sm border outline-none font-mono"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }} />
            {bulkMode && (
              <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: C.muted }}>
                <span>{selectedIds.size} seçili</span>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="underline">tümünü seç</button>
                  <button onClick={clearAll} className="underline">temizle</button>
                </div>
              </div>
            )}
          </div>
          <div className="max-h-[400px] lg:max-h-[600px] overflow-y-auto">
            {filtered.map(d => {
              const checked = selectedIds.has(d.id);
              return (
                <button key={d.id}
                  onClick={() => bulkMode ? toggleId(d.id) : setSelected(d)}
                  className="w-full flex items-center gap-3 p-3 border-b text-left transition-colors"
                  style={{
                    borderColor: C.line,
                    background:
                      (bulkMode && checked) ? C.pillOk :
                      (!bulkMode && selected?.id === d.id) ? C.paperDeep :
                      'transparent',
                  }}>
                  {bulkMode && (
                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center border"
                      style={{
                        borderColor: checked ? C.ok : C.line,
                        background: checked ? C.ok : 'transparent',
                      }}>
                      {checked && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                  )}
                  <PhoneThumb color={d.color} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: C.ink }}>{d.brand} {d.model}</div>
                    <div className="text-[10px] font-mono truncate" style={{ color: C.muted }}>
                      {d.code} · {d.imei}
                    </div>
                  </div>
                  {!bulkMode && <StatusPill s={d.status} />}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Preview */}
        <div className="lg:col-span-3 space-y-4">
          {bulkMode ? (
            <Card>
              <SectionLabel num="01" label="Toplu yazdırma" right={
                <span className="text-[10px] font-mono" style={{ color: C.muted }}>
                  boyut: <strong style={{ color: C.ink }}>{size}</strong>
                </span>
              } />

              {bulkDevices.length === 0 ? (
                <div className="py-12 text-center text-sm" style={{ color: C.muted }}>
                  Yazdırmak için cihazları işaretle.
                </div>
              ) : (
                <>
                  <div className="text-sm mb-3" style={{ color: C.inkSoft }}>
                    <strong style={{ color: C.ink }}>{bulkDevices.length} etiket</strong> yazıcıya gönderilecek.
                    Her cihaz ayrı sayfaya basılır.
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 max-h-[200px] overflow-y-auto">
                    {bulkDevices.map(d => (
                      <div key={d.id} className="text-[10px] font-mono p-1.5"
                        style={{ background: C.paperDeep, color: C.ink }}>
                        {d.code}
                      </div>
                    ))}
                  </div>
                  <button onClick={printBulk}
                    className="w-full py-3 text-xs font-mono inline-flex items-center justify-center gap-2"
                    style={{ background: C.accent, color: '#fff' }}>
                    <Printer size={13} /> {bulkDevices.length} ETİKETİ YAZDIR
                  </button>
                </>
              )}
            </Card>
          ) : selected ? (
            <Card>
              <SectionLabel num="01" label="Sticker önizleme" right={
                <button onClick={printOne}
                  className="px-3 py-1.5 text-[10px] font-mono inline-flex items-center gap-1.5"
                  style={{ background: C.ink, color: C.paper }}>
                  <Printer size={12} /> YAZDIR ({size})
                </button>
              } />

              {/* Gerçek boyutlu canlı önizleme */}
              <div className="flex justify-center p-4 sm:p-6 overflow-x-auto" style={{ background: C.paperDeep }}>
                <div className="flex-shrink-0" style={{
                  border: `1px dashed ${C.muted}`,
                  boxShadow: '0 8px 24px -6px rgba(0,0,0,0.15)',
                  // PrintableSticker mm cinsinden boyutu kendisi belirliyor
                }}>
                  <PrintableSticker
                    device={selected}
                    qrUrl={selectedQrUrl}
                    size={size}
                    config={config}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] font-mono" style={{ color: C.muted }}>QR URL</div>
                  <div className="font-mono truncate mt-1" style={{ color: C.ink }} title={selectedQrUrl}>
                    /qr/{selected.qr_token.slice(0, 16)}...
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] font-mono" style={{ color: C.muted }}>IMEI</div>
                  <div className="font-mono mt-1" style={{ color: C.ink }}>{selected.imei}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] font-mono" style={{ color: C.muted }}>Cihaz ID</div>
                  <div className="font-mono mt-1" style={{ color: C.accent }}>{selected.code}</div>
                </div>
              </div>

              <div className="mt-4 p-3" style={{ background: C.paperDeep }}>
                <div className="text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
                  QR'A GÖMÜLEN URL
                </div>
                <div className="text-xs font-mono break-all" style={{ color: C.ink }}>
                  {selectedQrUrl}
                </div>
                <div className="text-[10px] mt-2" style={{ color: C.muted }}>
                  Telefon kamerasıyla taradığında bu sayfaya gider. Canlıda otomatik domain kullanılır.
                </div>
              </div>
            </Card>
          ) : (
            <div className="py-20 text-center text-sm" style={{ color: C.muted }}>
              Önce soldan bir cihaz seç.
            </div>
          )}
        </div>
      </div>

      {/* Yazdırılacak gerçek etiket(ler) — normal görünümde gizli */}
      <div className="print-area">
        {bulkMode
          ? bulkDevices.map(d => (
              <PrintableSticker key={d.id} device={d} qrUrl={qrUrl(d)} size={size} config={config} />
            ))
          : selected && (
              <PrintableSticker device={selected} qrUrl={selectedQrUrl} size={size} config={config} />
            )
        }
      </div>
    </div>
  );
}
