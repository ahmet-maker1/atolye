import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, Hash, HardDrive, Cpu, Monitor,
  Battery, MapPin, Palette, Tag, Calendar, Plus, Equal, TrendingUp,
  ShoppingCart, FilePlus, Wrench, Edit3, Printer, Camera, Receipt, Trash2,
  FileText, Download
} from 'lucide-react';
import { api, tl, auth } from '../lib/api';
import { C, Card, SectionLabel, StatusPill, FakeQR, FakeBarcode, phoneColor } from '../components/ui';
import ActionModal from '../components/ActionModal';
import DeviceEditModal from '../components/DeviceEditModal';
import DeviceNoteModal from '../components/DeviceNoteModal';
import PhotoUpload from '../components/PhotoUpload';
import PrintableSticker, { printStickers, downloadStickerAsPng, loadStickerConfig } from '../components/PrintableSticker';
import { useToast } from '../components/Toast';

const eventMeta = {
  purchase: { label: 'ALIŞ',              icon: ArrowDownRight },
  expense:  { label: 'MASRAF',            icon: Receipt },
  service:  { label: 'SERVİS — PARÇA',    icon: Wrench },
  labor:    { label: 'SERVİS — İŞÇİLİK',  icon: Wrench },
  sale:     { label: 'SATIŞ',             icon: ArrowUpRight },
  note:     { label: 'NOT',               icon: FileText },
};

export default function DeviceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [device, setDevice] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState('geçmiş');
  const user = auth.getUser();
  const isAdmin = user?.role === 'Admin';
  const [action, setAction] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [stickerSize, setStickerSize] = useState(() => localStorage.getItem('atolye_sticker_size') || '60x40');

  const load = () => api.device(id).then(setDevice).catch(e => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  if (err) return <div className="p-6" style={{ color: C.bad }}>Hata: {err}</div>;
  if (!device) return <div className="p-6 text-sm font-mono" style={{ color: C.muted }}>yükleniyor...</div>;

  const totalCost = Number(device.buy_price) + Number(device.expenses);
  const profit = device.sell_price > 0 ? device.sell_price - totalCost : 0;
  const profitPct = totalCost > 0 && device.sell_price > 0 ? ((profit / totalCost) * 100).toFixed(1) : 0;

  const qrUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/qr/${device.qr_token}`
    : `/qr/${device.qr_token}`;

  const handleDelete = async () => {
    if (!confirm('Bu cihazı silmek istediğine emin misin?\n(30 saniye içinde geri alabilirsin)')) return;
    try {
      await api.deviceDelete(device.id);
      push({
        kind: 'warn',
        title: 'Silindi',
        message: `${device.code} silindi.`,
        duration: 30000,
        action: {
          label: 'GERİ AL',
          onClick: async () => {
            try {
              await api.deviceRestore(device.id);
              push({ kind: 'success', title: 'Geri alındı', message: `${device.code} tekrar kullanılabilir.` });
              navigate(`/devices/${device.id}`);
              load();
            } catch (e) {
              push({ kind: 'error', message: e.message });
            }
          }
        }
      });
      navigate('/devices');
    } catch (e) {
      push({ kind: 'error', title: 'Hata', message: e.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-4 text-[10px] tracking-[0.2em] uppercase font-mono flex-wrap" style={{ color: C.muted }}>
        <button onClick={() => navigate('/devices')} className="inline-flex items-center gap-1.5" style={{ color: C.ink }}>
          <ArrowLeft size={12} /> envanter
        </button>
        <span>/</span>
        <span className="hidden sm:inline">cihazlar</span>
        <span className="hidden sm:inline">/</span>
        <span style={{ color: C.accent }}>{device.code}</span>
      </div>

      {/* Hero — responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Photo + QR column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main photo: real photo if uploaded, else phone mockup */}
          <Card pad={false}>
            <div className="aspect-[4/5] flex items-center justify-center relative overflow-hidden"
              style={{ background: C.paperDeep }}>
              {device.image_urls.length > 0 ? (
                <img src={device.image_urls[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="relative" style={{
                  width: 180, height: 360,
                  background: phoneColor(device.color),
                  borderRadius: 28,
                  border: '1px solid rgba(0,0,0,0.2)',
                  boxShadow: '0 20px 60px -20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}>
                  <div className="absolute" style={{
                    top: 14, left: '50%', transform: 'translateX(-50%)',
                    width: 80, height: 24, borderRadius: 12, background: '#0a0a0a'
                  }} />
                  <div className="absolute" style={{
                    inset: 8, top: 50, borderRadius: 20,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid rgba(0,0,0,0.1)'
                  }} />
                </div>
              )}
              <div className="absolute top-4 left-4 text-[9px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>
                — {device.image_urls.length > 0 ? 'fotoğraf' : 'mockup'}
              </div>
            </div>
          </Card>

          {/* Photo thumbnails + upload */}
          <Card>
            <SectionLabel num="F" label="Fotoğraflar" right={
              <span className="text-[10px] tracking-[0.15em] uppercase font-mono" style={{ color: C.muted }}>
                {device.image_urls.length} / 10
              </span>
            } />
            <PhotoUpload
              deviceId={device.id}
              photos={device.image_urls}
              onChange={(urls) => setDevice(d => ({ ...d, image_urls: urls }))}
            />
          </Card>

          {/* QR & barcode */}
          <div className="grid grid-cols-2 gap-3">
            <Card pad={false}>
              <div className="p-3 flex flex-col items-center">
                <div className="text-[9px] tracking-[0.2em] uppercase font-mono mb-2" style={{ color: C.muted }}>QR</div>
                <FakeQR size={110} seed={device.qr_token} />
                <div className="text-[9px] mt-2 font-mono" style={{ color: C.muted }}>okut → detay</div>
              </div>
            </Card>
            <Card pad={false}>
              <div className="p-3 flex flex-col items-center h-full justify-between">
                <div className="text-[9px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>IMEI BARKODU</div>
                <FakeBarcode value={device.imei} width={140} height={54} />
                <div className="text-[10px] font-mono" style={{ color: C.ink }}>
                  {device.shelf || '—'} · {device.imei.slice(-6)}
                </div>
              </div>
            </Card>
          </div>

          {/* Etiket boyutu seçici */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>
              Etiket boyutu
            </label>
            <select
              value={stickerSize}
              onChange={(e) => {
                setStickerSize(e.target.value);
                localStorage.setItem('atolye_sticker_size', e.target.value);
              }}
              className="w-full px-3 py-2 text-sm border outline-none font-mono mb-2"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
              <option value="60x40">60 × 40 mm — standart termal</option>
              <option value="50x30">50 × 30 mm — orta boy</option>
              <option value="40x25">40 × 25 mm — kompakt</option>
              <option value="40x17">40 × 17 mm — dar / 2-up yazıcı</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => printStickers(stickerSize)}
              className="py-2.5 text-xs inline-flex items-center justify-center gap-2 border font-mono"
              style={{ borderColor: C.ink, color: C.ink, background: C.paperLite }}>
              <Printer size={13} /> YAZDIR
            </button>
            <button onClick={async () => {
              const el = document.querySelector('.print-area .atolye-sticker');
              if (!el) return push({ kind: 'error', message: 'Sticker hazır değil.' });
              try {
                await downloadStickerAsPng(el, `${device.code}-${device.imei.slice(-4)}-${stickerSize}.png`);
                push({ kind: 'success', message: 'PNG indirildi.' });
              } catch (e) {
                push({ kind: 'error', message: e.message });
              }
            }}
              className="py-2.5 text-xs inline-flex items-center justify-center gap-2 border font-mono"
              style={{ borderColor: C.ink, color: C.ink, background: C.paperLite }}>
              <Download size={13} /> PNG İNDİR
            </button>
          </div>
        </div>

        {/* Info column */}
        <div className="lg:col-span-3 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-mono mb-2 flex-wrap"
              style={{ color: C.muted }}>
              <span style={{ color: C.accent }}>{device.code}</span>
              <span>·</span>
              <StatusPill s={device.status} />
              {device.note && <><span>·</span><span style={{ color: C.warn }}>⚠ {device.note}</span></>}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[52px] leading-[0.95] mb-1 font-serif"
              style={{ fontWeight: 400, letterSpacing: '-0.03em', color: C.ink }}>
              {device.brand} <em style={{ color: C.accent }}>{device.model}</em>
            </h1>
            <div className="text-base font-serif italic" style={{ color: C.inkSoft }}>
              {device.color} · {device.storage} · {device.condition}
            </div>
          </div>

          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-4">
              {[
                ['IMEI', device.imei, Hash],
                ['Hafıza', device.storage || '—', HardDrive],
                ['RAM', device.ram || '—', Cpu],
                ['Ekran', device.screen || '—', Monitor],
                ['Batarya', (device.battery || 0) + '%', Battery],
                ['Raf', device.shelf || '—', MapPin],
                ['Renk', device.color || '—', Palette],
                ['Durum', device.condition || '—', Tag],
                ['Alındı', device.purchase_date, Calendar],
                ['Garanti', device.warranty_end ? new Date(device.warranty_end).toLocaleDateString('tr-TR') : '—', Calendar],
              ].map(([k, v, Icon]) => (
                <div key={k}>
                  <div className="flex items-center gap-1.5 text-[9px] tracking-[0.18em] uppercase font-mono mb-1"
                    style={{ color: C.muted }}>
                    <Icon size={10} /> {k}
                  </div>
                  <div className="text-sm font-mono break-words" style={{ color: C.ink }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Tedarikçi / Müşteri kartı — sadece görüntüleme */}
          {(device.supplier_name || device.customer_name) && (
            <Card>
              <SectionLabel num="K" label="Kişiler" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {device.supplier_name && (
                  <div className="p-3"
                    style={{ background: C.paperDeep, border: `1px solid ${C.line}` }}>
                    <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-1" style={{ color: C.ok }}>
                      ↓ Aldığı kişi / tedarikçi
                    </div>
                    <div className="text-base font-serif" style={{ color: C.ink, fontWeight: 500 }}>
                      {device.supplier_name}
                    </div>
                  </div>
                )}
                {device.customer_name && (
                  <div className="p-3"
                    style={{ background: C.paperDeep, border: `1px solid ${C.line}` }}>
                    <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-1" style={{ color: C.accent }}>
                      ↑ Sattığı kişi / müşteri
                    </div>
                    <div className="text-base font-serif" style={{ color: C.ink, fontWeight: 500 }}>
                      {device.customer_name}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Maliyet merdiveni */}
          <Card>
            <SectionLabel num="K" label="Maliyet merdiveni" right={
              <span className="text-[10px] tracking-[0.15em] uppercase font-mono hidden sm:inline" style={{ color: C.muted }}>
                otomatik
              </span>
            } />
            <div className="space-y-1.5">
              <Row label="Alış fiyatı" icon={<ArrowDownRight size={13} style={{ color: C.muted }} />}
                value={tl(device.buy_price)} />
              <Row label="Masraflar" icon={<Plus size={13} style={{ color: C.muted }} />}
                value={device.expenses > 0 ? '+ ' + tl(device.expenses) : '—'}
                valueColor={device.expenses > 0 ? C.warn : C.muted} />
              <div className="flex items-center justify-between py-2 border-t border-b"
                style={{ borderColor: C.ink }}>
                <span className="flex items-center gap-2 text-sm" style={{ color: C.ink, fontWeight: 600 }}>
                  <Equal size={13} /> Toplam maliyet
                </span>
                <span className="text-lg font-serif" style={{ color: C.ink }}>{tl(totalCost)}</span>
              </div>
              <Row label={device.status === 'satıldı' ? 'Satış fiyatı' : 'Öngörülen satış'}
                icon={<ArrowUpRight size={13} style={{ color: C.muted }} />}
                value={device.sell_price > 0 ? tl(device.sell_price) : '—'} />
              <div className="flex items-center justify-between py-2 mt-1 px-3.5 flex-wrap gap-2"
                style={{ background: profit > 0 ? C.pillOk : profit < 0 ? C.pillBad : C.paperDeep }}>
                <span className="flex items-center gap-2 text-sm uppercase tracking-[0.15em] font-mono"
                  style={{ color: C.ink, fontWeight: 600 }}>
                  <TrendingUp size={13} /> {device.status === 'satıldı' ? 'Kâr' : 'Potansiyel kâr'}
                </span>
                <span className="text-xl sm:text-2xl font-serif"
                  style={{ color: profit > 0 ? C.ok : profit < 0 ? C.bad : C.muted }}>
                  {device.sell_price > 0 ? (profit >= 0 ? '+ ' : '') + tl(profit) : '—'}
                  {device.sell_price > 0 && totalCost > 0 && (
                    <span className="text-xs ml-2 font-mono">%{profitPct}</span>
                  )}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Actions — responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <button onClick={() => setAction('sale')} disabled={device.status === 'satıldı'}
          className="py-3 text-xs inline-flex items-center justify-center gap-2 disabled:opacity-40 font-mono"
          style={{ background: C.accent, color: '#fff' }}>
          <ShoppingCart size={14} /> SAT
        </button>
        <button onClick={() => setAction('expense')}
          className="py-3 text-xs inline-flex items-center justify-center gap-2 border font-mono"
          style={{ borderColor: C.ink, color: C.ink, background: C.paperLite }}>
          <FilePlus size={14} /> MASRAF
        </button>
        <button onClick={() => setAction('service')}
          className="py-3 text-xs inline-flex items-center justify-center gap-2 border font-mono"
          style={{ borderColor: C.ink, color: C.ink, background: C.paperLite }}>
          <Wrench size={14} /> SERVİS
        </button>
        <button onClick={() => setShowNote(true)}
          className="py-3 text-xs inline-flex items-center justify-center gap-2 border font-mono"
          style={{ borderColor: C.ink, color: C.ink, background: C.paperLite }}>
          <FileText size={14} /> NOT EKLE
        </button>
        <button onClick={() => setShowEdit(true)}
          className="py-3 text-xs inline-flex items-center justify-center gap-2 border font-mono"
          style={{ borderColor: C.ink, color: C.ink, background: C.paperLite }}>
          <Edit3 size={14} /> DÜZENLE
        </button>
        <button onClick={() => window.open(qrUrl, '_blank')}
          className="py-3 text-xs inline-flex items-center justify-center gap-2 border font-mono"
          style={{ borderColor: C.ink, color: C.ink, background: C.paperLite }}>
          <Printer size={14} /> QR LINK
        </button>
        {isAdmin && (
          <button onClick={handleDelete}
            className="py-3 text-xs inline-flex items-center justify-center gap-2 border font-mono col-span-2 sm:col-span-1"
            style={{ borderColor: C.bad, color: C.bad, background: 'transparent' }}>
            <Trash2 size={14} /> SİL
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b" style={{ borderColor: C.line }}>
        {['geçmiş', 'notlar'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="pb-2 text-xs tracking-[0.2em] uppercase relative font-mono"
            style={{ color: tab === t ? C.ink : C.muted }}>
            {t}
            {tab === t && <span className="absolute bottom-[-1px] left-0 right-0 h-[2px]" style={{ background: C.accent }} />}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {tab === 'geçmiş' && <Timeline history={device.history} />}
      {tab === 'notlar' && (
        <Card>
          <div className="text-sm" style={{ color: C.inkSoft }}>
            {device.note || <span style={{ color: C.muted, fontStyle: 'italic' }}>Henüz not yok.</span>}
          </div>
        </Card>
      )}

      {action && (
        <ActionModal
          device={device}
          type={action}
          onClose={() => setAction(null)}
          onDone={() => { setAction(null); load(); }}
        />
      )}

      {showEdit && (
        <DeviceEditModal
          device={device}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); push({ kind: 'success', message: 'Cihaz güncellendi.' }); }}
        />
      )}

      {showNote && (
        <DeviceNoteModal
          device={device}
          onClose={() => setShowNote(false)}
          onSaved={() => { setShowNote(false); load(); push({ kind: 'success', message: 'Not eklendi.' }); }}
        />
      )}

      {/* Yazıcıya gönderilecek etiket (normal görünümde gizli) */}
      <div className="print-area">
        <PrintableSticker device={device} qrUrl={qrUrl} size={stickerSize} config={loadStickerConfig()} />
      </div>
    </div>
  );
}

function Row({ label, icon, value, valueColor }) {
  return (
    <div className="flex items-center justify-between py-1.5 gap-2">
      <span className="flex items-center gap-2 text-sm" style={{ color: C.inkSoft }}>
        {icon} {label}
      </span>
      <span className="text-base font-mono" style={{ color: valueColor || C.ink }}>{value}</span>
    </div>
  );
}

function Timeline({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="py-12 text-center text-sm font-serif italic" style={{ color: C.muted }}>
        Henüz hareket yok.
      </div>
    );
  }

  let running = 0;
  return (
    <div>
      {/* Desktop table headers — hidden on mobile (cards instead) */}
      <div className="hidden md:grid grid-cols-12 gap-4 text-[10px] uppercase tracking-[0.18em] pb-2 border-b font-mono"
        style={{ color: C.muted, borderColor: C.ink }}>
        <div className="col-span-2">Tarih</div>
        <div className="col-span-2">Tür</div>
        <div className="col-span-4">Açıklama / Taraf</div>
        <div className="col-span-1">Personel</div>
        <div className="col-span-1 text-right">Tutar</div>
        <div className="col-span-2 text-right">Yürüyen</div>
      </div>

      {history.map((e) => {
        if (['purchase', 'expense', 'service', 'labor'].includes(e.type)) running += Number(e.amount);
        const meta = eventMeta[e.type] || eventMeta.note;
        const Icon = meta.icon;
        const date = e.performed_at ? new Date(e.performed_at) : null;
        const eventColor = e.type === 'sale' ? C.accent
          : e.type === 'purchase' ? C.ok
          : e.type === 'note' ? C.muted
          : C.warn;
        const eventBg = e.type === 'sale' ? C.pillBad
          : e.type === 'purchase' ? C.pillOk
          : e.type === 'note' ? C.paperDeep
          : C.pillWarn;

        return (
          <React.Fragment key={e.id}>
            {/* Desktop row */}
            <div className="hidden md:grid grid-cols-12 gap-4 py-4 border-b items-start"
              style={{ borderColor: C.line }}>
              <div className="col-span-2">
                <div className="text-sm font-mono" style={{ color: C.ink }}>
                  {date ? date.toLocaleDateString('tr-TR') : '—'}
                </div>
                <div className="text-[10px] font-mono" style={{ color: C.muted }}>
                  {date ? date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </div>
              <div className="col-span-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] font-mono"
                  style={{ background: eventBg, color: eventColor }}>
                  <Icon size={10} /> {meta.label}
                </span>
              </div>
              <div className="col-span-4">
                <div className="text-sm" style={{ color: C.ink }}>{e.note || '—'}</div>
                {e.counterparty_name && (
                  <div className="text-[11px] mt-0.5" style={{ color: C.muted }}>→ {e.counterparty_name}</div>
                )}
              </div>
              <div className="col-span-1 text-[11px] font-mono" style={{ color: C.muted }}>
                {e.user_name || '—'}
              </div>
              <div className="col-span-1 text-right">
                {e.amount > 0 ? (
                  <div className="text-sm font-mono" style={{
                    color: e.type === 'sale' ? C.ok : e.type === 'purchase' ? C.ink : C.warn
                  }}>
                    {e.type === 'sale' ? '−' : '+'} {tl(e.amount)}
                  </div>
                ) : (
                  <div className="text-sm font-mono" style={{ color: C.muted }}>—</div>
                )}
              </div>
              <div className="col-span-2 text-right">
                {e.type === 'sale' ? (
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.15em] font-mono" style={{ color: C.ok }}>kâr</div>
                    <div className="text-base font-serif" style={{ color: C.ok }}>
                      +{tl(Number(e.amount) - running)}
                    </div>
                  </div>
                ) : ['purchase', 'expense', 'service', 'labor'].includes(e.type) ? (
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.15em] font-mono" style={{ color: C.muted }}>maliyet</div>
                    <div className="text-base font-serif" style={{ color: C.ink }}>{tl(running)}</div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Mobile card */}
            <div className="md:hidden border-b py-3 space-y-1.5" style={{ borderColor: C.line }}>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] font-mono"
                  style={{ background: eventBg, color: eventColor }}>
                  <Icon size={10} /> {meta.label}
                </span>
                <div className="text-[10px] font-mono text-right" style={{ color: C.muted }}>
                  {date && date.toLocaleDateString('tr-TR')}
                </div>
              </div>
              {e.note && <div className="text-sm" style={{ color: C.ink }}>{e.note}</div>}
              {e.counterparty_name && (
                <div className="text-[11px]" style={{ color: C.muted }}>→ {e.counterparty_name}</div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono" style={{ color: C.muted }}>
                  {e.user_name || '—'}
                </span>
                {e.amount > 0 && (
                  <span className="text-sm font-mono" style={{
                    color: e.type === 'sale' ? C.ok : e.type === 'purchase' ? C.ink : C.warn
                  }}>
                    {e.type === 'sale' ? '−' : '+'} {tl(e.amount)}
                  </span>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
