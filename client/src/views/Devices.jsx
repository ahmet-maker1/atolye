import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Barcode, ScanLine, Battery, Trash2 } from 'lucide-react';
import { api, tl, auth } from '../lib/api';
import { C, StatusPill, PhoneThumb } from '../components/ui';
import DeviceForm from '../components/DeviceForm';
import BarcodeScanner from '../components/BarcodeScanner';
import { useToast } from '../components/Toast';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [filter, setFilter] = useState('hepsi');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [scanMode, setScanMode] = useState(null); // 'imei' | 'qr' | null
  const navigate = useNavigate();
  const { push } = useToast();
  const user = auth.getUser();
  const isAdmin = user?.role === 'Admin';

  const load = async () => {
    setLoading(true);
    try {
      const rows = await api.devicesList({ status: filter === 'hepsi' ? '' : filter, q: query });
      setDevices(rows);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleDelete = async (e, device) => {
    e.stopPropagation();
    if (!confirm(`${device.code} (${device.brand} ${device.model}) silinecek. Emin misin?\n\n30 saniye içinde geri alabilirsin.`)) return;
    try {
      await api.deviceDelete(device.id);
      // Optimistically remove from list
      setDevices(ds => ds.filter(d => d.id !== device.id));
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
              push({ kind: 'success', title: 'Geri alındı', message: `${device.code} tekrar listende.` });
              load();
            } catch (ex) {
              push({ kind: 'error', message: ex.message });
            }
          }
        }
      });
    } catch (ex) {
      push({ kind: 'error', title: 'Hata', message: ex.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] tracking-[0.25em] uppercase font-mono mb-2" style={{ color: C.muted }}>
            — ENVANTER / TÜM CİHAZLAR
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif" style={{ fontWeight: 400, letterSpacing: '-0.03em', color: C.ink }}>
            Cihaz kayıtları
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setScanMode('imei')}
            className="px-3 py-2 text-xs inline-flex items-center gap-2 border font-mono"
            style={{ borderColor: C.line, background: C.paperLite, color: C.ink }}>
            <Barcode size={14} /> <span className="hidden sm:inline">BARKOD</span>
          </button>
          <button onClick={() => setScanMode('qr')}
            className="px-3 py-2 text-xs inline-flex items-center gap-2 border font-mono"
            style={{ borderColor: C.line, background: C.paperLite, color: C.ink }}>
            <ScanLine size={14} /> <span className="hidden sm:inline">QR OKUT</span>
          </button>
          <button onClick={() => setShowForm(true)}
            className="px-3 py-2 text-xs inline-flex items-center gap-2 font-mono"
            style={{ background: C.ink, color: C.paper }}>
            <Plus size={14} /> YENİ CİHAZ
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1 border-y py-2.5 flex-wrap" style={{ borderColor: C.line }}>
        <Search size={14} style={{ color: C.muted }} className="ml-1" />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="IMEI, ID, marka veya model ara..."
          className="bg-transparent flex-1 min-w-[140px] text-sm outline-none font-mono px-2"
          style={{ color: C.ink }} />
        <div className="flex gap-1 text-[10px] tracking-[0.15em] uppercase font-mono overflow-x-auto">
          {['hepsi', 'stokta', 'satıldı', 'serviste', 'arızalı'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-2.5 py-1 whitespace-nowrap"
              style={{
                background: filter === f ? C.ink : 'transparent',
                color: filter === f ? C.paper : C.muted
              }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="py-6 text-center text-xs font-mono" style={{ color: C.muted }}>yükleniyor...</div>}
      {!loading && devices.length === 0 && (
        <div className="py-12 text-center">
          <div className="text-sm mb-3" style={{ color: C.muted }}>Hiç cihaz bulunamadı.</div>
          <button onClick={() => setShowForm(true)}
            className="px-3 py-2 text-xs inline-flex items-center gap-2 font-mono"
            style={{ background: C.ink, color: C.paper }}>
            <Plus size={14} /> İLK CİHAZI EKLE
          </button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block">
        {devices.length > 0 && (
          <div className="grid grid-cols-12 gap-3 text-[10px] uppercase tracking-[0.15em] pb-2 border-b font-mono"
            style={{ color: C.muted, borderColor: C.line }}>
            <div className="col-span-1">Cihaz</div>
            <div className="col-span-2">ID / IMEI</div>
            <div className="col-span-2">Model</div>
            <div className="col-span-2">Özellikler</div>
            <div className="col-span-1 text-center">Bat.</div>
            <div className="col-span-1">Raf</div>
            <div className="col-span-1">Durum</div>
            <div className="col-span-1 text-right">Maliyet</div>
            <div className="col-span-1 text-right">Satış</div>
          </div>
        )}
        {devices.map(d => {
          const totalCost = Number(d.buy_price) + Number(d.expenses);
          const profit = d.sell_price > 0 ? d.sell_price - totalCost : null;
          return (
            <div key={d.id} onClick={() => navigate(`/devices/${d.id}`)}
              className="group grid grid-cols-12 gap-3 py-3 border-b cursor-pointer hover:bg-black/5 transition-colors items-center"
              style={{ borderColor: C.line }}>
              <div className="col-span-1 flex items-center gap-2">
                {d.image_urls?.[0] ? (
                  <img src={d.image_urls[0]} alt="" className="w-10 h-10 object-cover" />
                ) : (
                  <PhoneThumb color={d.color} size={48} />
                )}
              </div>
              <div className="col-span-2">
                <div className="text-xs font-mono" style={{ color: C.accent, fontWeight: 600 }}>{d.code}</div>
                <div className="text-[10px] font-mono" style={{ color: C.muted }}>{d.imei}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm" style={{ color: C.ink, fontWeight: 500 }}>{d.brand} {d.model}</div>
                <div className="text-[11px]" style={{ color: C.muted }}>{d.color}</div>
              </div>
              <div className="col-span-2 text-[11px] font-mono" style={{ color: C.inkSoft }}>
                {d.storage} · {d.ram} · {d.screen}<br />
                <span style={{ color: C.muted }}>{d.condition || '—'}</span>
              </div>
              <div className="col-span-1 text-center">
                <div className="inline-flex items-center gap-1 text-[11px] font-mono"
                  style={{ color: d.battery > 90 ? C.ok : d.battery > 80 ? C.warn : C.bad }}>
                  <Battery size={11} /> {d.battery || '?'}%
                </div>
              </div>
              <div className="col-span-1 text-[10px] font-mono" style={{ color: C.inkSoft }}>
                {d.shelf && <span className="px-1.5 py-0.5" style={{ background: C.paperDeep }}>{d.shelf}</span>}
              </div>
              <div className="col-span-1"><StatusPill s={d.status} /></div>
              <div className="col-span-1 text-right">
                <div className="text-xs font-mono" style={{ color: C.muted }}>{tl(totalCost)}</div>
              </div>
              <div className="col-span-1 text-right flex items-center justify-end gap-2">
                <div className="text-sm font-mono" style={{
                  color: d.sell_price > 0 ? (profit > 0 ? C.accent : C.bad) : C.muted
                }}>
                  {d.sell_price > 0 ? tl(d.sell_price) : '—'}
                </div>
                <button onClick={(e) => handleDelete(e, d)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  title="Sil"
                  style={{ display: isAdmin ? 'inline-flex' : 'none' }}>
                  <Trash2 size={13} style={{ color: C.bad }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {devices.map(d => {
          const totalCost = Number(d.buy_price) + Number(d.expenses);
          const profit = d.sell_price > 0 ? d.sell_price - totalCost : null;
          return (
            <div key={d.id} onClick={() => navigate(`/devices/${d.id}`)}
              className="border p-3 cursor-pointer transition-colors active:opacity-70"
              style={{ borderColor: C.line, background: C.paperLite }}>
              <div className="flex items-start gap-3">
                {d.image_urls?.[0] ? (
                  <img src={d.image_urls[0]} alt="" className="w-14 h-14 object-cover flex-shrink-0" />
                ) : (
                  <PhoneThumb color={d.color} size={56} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono" style={{ color: C.accent, fontWeight: 600 }}>{d.code}</div>
                      <div className="text-sm truncate" style={{ color: C.ink, fontWeight: 500 }}>
                        {d.brand} {d.model}
                      </div>
                      <div className="text-[10px] font-mono" style={{ color: C.muted }}>
                        {d.imei}
                      </div>
                    </div>
                    <StatusPill s={d.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                    <div style={{ color: C.muted }}>
                      {d.storage} · {d.battery || '?'}% · {d.shelf || '—'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ color: C.muted }}>{tl(totalCost)}</span>
                      <span style={{ color: C.muted }}>→</span>
                      <span style={{ color: d.sell_price > 0 ? C.accent : C.muted }}>
                        {d.sell_price > 0 ? tl(d.sell_price) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && <DeviceForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}

      {/* IMEI scanner — bulunca o cihazın detayına git */}
      <BarcodeScanner
        isOpen={scanMode === 'imei'}
        onClose={() => setScanMode(null)}
        title="IMEI ile cihaz ara"
        hint="Cihazın arkasındaki barkodu tara"
        accept={(text) => /^\d{8,17}$/.test(String(text).replace(/\D/g, ''))}
        onResult={async (text) => {
          setScanMode(null);
          const imei = String(text).replace(/\D/g, '');
          try {
            const list = await api.devicesList({ q: imei });
            const match = list.find(d => d.imei === imei) || list[0];
            if (match) {
              push({ kind: 'success', message: `${match.brand} ${match.model} bulundu` });
              navigate(`/devices/${match.id}`);
            } else {
              push({ kind: 'warn', title: 'Bulunamadı', message: `IMEI ${imei} kayıtlı değil. Yeni cihaz olarak ekleyebilirsin.`, duration: 6000 });
              setQuery(imei);
            }
          } catch (e) {
            push({ kind: 'error', message: e.message });
          }
        }}
      />

      {/* QR scanner — cihazın detayına git */}
      <BarcodeScanner
        isOpen={scanMode === 'qr'}
        onClose={() => setScanMode(null)}
        title="QR oku"
        hint="Cihazın stikerındaki QR'ı tara"
        onResult={async (text) => {
          setScanMode(null);
          // QR ya tam URL (https://.../qr/<token>) ya da düz token olabilir
          let token = String(text);
          const m = token.match(/\/qr\/([a-zA-Z0-9]+)/);
          if (m) token = m[1];
          try {
            const dev = await api.deviceByQR(token);
            push({ kind: 'success', message: `${dev.brand} ${dev.model} açılıyor` });
            navigate(`/devices/${dev.id}`);
          } catch (e) {
            push({ kind: 'error', title: 'QR okunamadı', message: e.message || 'Geçersiz QR' });
          }
        }}
      />
    </div>
  );
}
