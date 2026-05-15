import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, Phone, Mail, MapPin,
  Package, Wrench, Receipt, ExternalLink, ShoppingCart, FileText,
  TrendingUp, TrendingDown
} from 'lucide-react';
import { api, tl, tlSigned } from '../lib/api';
import { C, Card, KPI, SectionLabel, StatusPill, RolePill, PhoneThumb } from '../components/ui';

const KIND_META = {
  purchase: { label: 'CİHAZ ALIMI',   icon: ArrowDownRight, color: 'ok' },
  sale:     { label: 'CİHAZ SATIŞI',  icon: ArrowUpRight,   color: 'accent' },
  service:  { label: 'SERVİS',        icon: Wrench,         color: 'warn' },
  expense:  { label: 'MASRAF',        icon: Receipt,        color: 'warn' },
  payment:  { label: 'ÖDEME',         icon: Receipt,        color: 'ok' },
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState('akış');

  useEffect(() => {
    api.customer(id).then(setData).catch(e => setErr(e.message));
  }, [id]);

  if (err) return <div className="p-6" style={{ color: C.bad }}>Hata: {err}</div>;
  if (!data) return <div className="p-6 text-sm font-mono" style={{ color: C.muted }}>yükleniyor...</div>;

  const { stats, devices_bought, devices_sold, services, ledger } = data;
  const balance = Number(data.balance || 0);
  const balanceLabel = balance > 0 ? 'Bizden alacaklı' : balance < 0 ? 'Bize borçlu' : 'Sıfır';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-4 text-[10px] tracking-[0.2em] uppercase font-mono flex-wrap" style={{ color: C.muted }}>
        <button onClick={() => navigate('/customers')} className="inline-flex items-center gap-1.5" style={{ color: C.ink }}>
          <ArrowLeft size={12} /> cariler
        </button>
        <span>/</span>
        <span style={{ color: C.accent }}>{data.code}</span>
      </div>

      {/* Hero */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-mono mb-2 flex-wrap" style={{ color: C.muted }}>
            <span style={{ color: C.accent }}>{data.code}</span>
            <span>·</span>
            <RolePill r={data.role} />
            {data.city && <><span>·</span><span style={{ color: C.muted }}>{data.city}</span></>}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[52px] leading-[0.95] font-serif" style={{
            fontWeight: 400, letterSpacing: '-0.03em', color: C.ink
          }}>
            {data.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-3 text-sm" style={{ color: C.inkSoft }}>
            {data.phone && (
              <a href={`tel:${data.phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                <Phone size={13} style={{ color: C.muted }} /> {data.phone}
              </a>
            )}
            {data.email && (
              <a href={`mailto:${data.email}`} className="inline-flex items-center gap-1.5 hover:underline">
                <Mail size={13} style={{ color: C.muted }} /> {data.email}
              </a>
            )}
          </div>
        </div>

        {/* Bakiye kutusu */}
        <div className="text-right">
          <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>
            Bakiye
          </div>
          <div className="text-3xl sm:text-4xl font-serif" style={{
            color: balance > 0 ? C.ok : balance < 0 ? C.bad : C.muted
          }}>
            {tlSigned(balance)}
          </div>
          <div className="text-[10px] tracking-[0.15em] uppercase font-mono mt-1" style={{
            color: balance > 0 ? C.ok : balance < 0 ? C.bad : C.muted
          }}>
            {balanceLabel}
          </div>
        </div>
      </div>

      {/* KPI'lar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPI label="Cihaz alımı"
          value={stats.total_bought_count}
          sub={tl(stats.total_bought_amount)} />
        <KPI label="Cihaz satışı"
          value={stats.total_sold_count}
          sub={tl(stats.total_sold_amount)}
          accent />
        <KPI label="Bu cariden kâr"
          value={tl(stats.total_profit_from)}
          sub={stats.total_sold_count ? `${stats.total_sold_count} satıştan` : '—'} />
        <KPI label="Servis"
          value={stats.total_services}
          sub={`${stats.open_services} açık`} />
      </div>

      {/* Note (varsa) */}
      {data.note && (
        <Card>
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-2" style={{ color: C.muted }}>
            NOT
          </div>
          <div className="text-sm" style={{ color: C.inkSoft }}>{data.note}</div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b overflow-x-auto" style={{ borderColor: C.line }}>
        {[
          { id: 'akış',      label: 'Hareket akışı', count: ledger.length },
          { id: 'alımlar',   label: 'Alımlar',        count: devices_bought.length },
          { id: 'satışlar',  label: 'Satışlar',       count: devices_sold.length },
          { id: 'servisler', label: 'Servisler',      count: services.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="pb-2 text-xs tracking-[0.2em] uppercase relative font-mono whitespace-nowrap"
            style={{ color: tab === t.id ? C.ink : C.muted }}>
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 text-[9px]" style={{ color: tab === t.id ? C.accent : C.muted }}>
                ({t.count})
              </span>
            )}
            {tab === t.id && <span className="absolute bottom-[-1px] left-0 right-0 h-[2px]" style={{ background: C.accent }} />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'akış'      && <LedgerTab ledger={ledger} navigate={navigate} balance={balance} />}
      {tab === 'alımlar'   && <DeviceListTab devices={devices_bought} navigate={navigate} kind="bought" />}
      {tab === 'satışlar'  && <DeviceListTab devices={devices_sold}   navigate={navigate} kind="sold" />}
      {tab === 'servisler' && <ServicesTab services={services} navigate={navigate} />}
    </div>
  );
}

// ─── LEDGER (birleşik hareket akışı) ────────────────────────────
function LedgerTab({ ledger, navigate, balance }) {
  if (!ledger.length) {
    return (
      <div className="py-12 text-center text-sm font-serif italic" style={{ color: C.muted }}>
        Hareket yok.
      </div>
    );
  }

  return (
    <div>
      {/* Desktop tablo başlık */}
      <div className="hidden md:grid grid-cols-12 gap-4 text-[10px] uppercase tracking-[0.18em] pb-2 border-b font-mono"
        style={{ color: C.muted, borderColor: C.ink }}>
        <div className="col-span-2">Tarih</div>
        <div className="col-span-2">Tür</div>
        <div className="col-span-4">Açıklama</div>
        <div className="col-span-2 text-right">Tutar</div>
        <div className="col-span-2 text-right">Bakiye</div>
      </div>

      {ledger.map((e, i) => {
        const meta = KIND_META[e.kind] || KIND_META.purchase;
        const Icon = meta.icon;
        const colorMap = { ok: C.ok, accent: C.accent, warn: C.warn, bad: C.bad };
        const bgMap    = { ok: C.pillOk, accent: C.pillBad, warn: C.pillWarn, bad: C.pillBad };
        const eventColor = colorMap[meta.color] || C.ink;
        const eventBg = bgMap[meta.color] || C.paperDeep;
        const date = e.date ? new Date(e.date) : null;

        return (
          <React.Fragment key={i}>
            {/* Desktop satır */}
            <div className="hidden md:grid grid-cols-12 gap-4 py-3 border-b items-start"
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
                <div className="text-sm" style={{ color: C.ink }}>{e.label}</div>
                {e.device && (
                  <button onClick={() => e.device_id && navigate(`/devices/${e.device_id}`)}
                    className="text-[11px] mt-0.5 font-mono inline-flex items-center gap-1 hover:underline"
                    style={{ color: C.muted, cursor: e.device_id ? 'pointer' : 'default' }}>
                    {e.device}
                    {e.device_id && <ExternalLink size={10} />}
                  </button>
                )}
                {e.ticket_code && (
                  <div className="text-[11px] mt-0.5 font-mono" style={{ color: C.muted }}>
                    İş emri: {e.ticket_code}
                  </div>
                )}
                {e.note && !e.device && (
                  <div className="text-[11px] mt-0.5 italic" style={{ color: C.muted }}>{e.note}</div>
                )}
              </div>
              <div className="col-span-2 text-right">
                <div className="text-sm font-mono" style={{
                  color: e.direction === 'in' ? C.ok : C.bad
                }}>
                  {e.direction === 'in' ? '+ ' : '− '}{tl(e.amount)}
                </div>
                {e.user_name && (
                  <div className="text-[10px] font-mono mt-0.5" style={{ color: C.muted }}>{e.user_name}</div>
                )}
              </div>
              <div className="col-span-2 text-right">
                <div className="text-sm font-mono" style={{
                  color: e.running_balance_after > 0 ? C.ok : e.running_balance_after < 0 ? C.bad : C.muted
                }}>
                  {tlSigned(e.running_balance_after)}
                </div>
              </div>
            </div>

            {/* Mobile kart */}
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
              <div className="text-sm" style={{ color: C.ink }}>{e.label}</div>
              {e.device && (
                <button onClick={() => e.device_id && navigate(`/devices/${e.device_id}`)}
                  className="text-[11px] font-mono inline-flex items-center gap-1"
                  style={{ color: C.muted }}>
                  {e.device} {e.device_id && <ExternalLink size={10} />}
                </button>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono" style={{ color: e.direction === 'in' ? C.ok : C.bad }}>
                  {e.direction === 'in' ? '+ ' : '− '}{tl(e.amount)}
                </span>
                <span className="text-xs font-mono" style={{
                  color: e.running_balance_after > 0 ? C.ok : e.running_balance_after < 0 ? C.bad : C.muted
                }}>
                  bakiye: {tlSigned(e.running_balance_after)}
                </span>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── DEVICE LIST (alımlar veya satışlar) ────────────────────────
function DeviceListTab({ devices, navigate, kind }) {
  if (!devices.length) {
    return (
      <div className="py-12 text-center text-sm font-serif italic" style={{ color: C.muted }}>
        {kind === 'bought' ? 'Bu cariden alınmış cihaz yok.' : 'Bu cariye satılmış cihaz yok.'}
      </div>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="grid grid-cols-12 gap-3 text-[10px] uppercase tracking-[0.15em] pb-2 border-b font-mono"
          style={{ color: C.muted, borderColor: C.line }}>
          <div className="col-span-1">Cihaz</div>
          <div className="col-span-2">ID / IMEI</div>
          <div className="col-span-3">Model</div>
          <div className="col-span-2">Durum</div>
          <div className="col-span-2 text-right">{kind === 'bought' ? 'Alış' : 'Satış'}</div>
          <div className="col-span-2 text-right">{kind === 'bought' ? 'Şu an' : 'Kâr'}</div>
        </div>
        {devices.map(d => (
          <div key={d.id} onClick={() => navigate(`/devices/${d.id}`)}
            className="grid grid-cols-12 gap-3 py-3 border-b cursor-pointer hover:bg-black/5 items-center transition-colors"
            style={{ borderColor: C.line }}>
            <div className="col-span-1">
              {d.image_urls?.[0] ? (
                <img src={d.image_urls[0]} alt="" className="w-10 h-10 object-cover" />
              ) : (
                <PhoneThumb color={d.color} size={40} />
              )}
            </div>
            <div className="col-span-2">
              <div className="text-xs font-mono" style={{ color: C.accent, fontWeight: 600 }}>{d.code}</div>
              <div className="text-[10px] font-mono" style={{ color: C.muted }}>{d.imei}</div>
            </div>
            <div className="col-span-3">
              <div className="text-sm" style={{ color: C.ink, fontWeight: 500 }}>{d.brand} {d.model}</div>
              <div className="text-[11px]" style={{ color: C.muted }}>{d.color} · {d.storage}</div>
            </div>
            <div className="col-span-2"><StatusPill s={d.status} /></div>
            <div className="col-span-2 text-right text-sm font-mono" style={{ color: C.ink }}>
              {tl(kind === 'bought' ? d.buy_price : d.sell_price)}
            </div>
            <div className="col-span-2 text-right">
              {kind === 'sold' ? (
                <span className="text-sm font-mono" style={{ color: d.profit > 0 ? C.ok : C.bad }}>
                  {d.profit !== null ? tlSigned(d.profit) : '—'}
                </span>
              ) : (
                <span className="text-xs font-mono" style={{ color: C.muted }}>
                  {d.status === 'satıldı' ? `Sat: ${tl(d.sell_price)}` : 'Stokta'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {devices.map(d => (
          <div key={d.id} onClick={() => navigate(`/devices/${d.id}`)}
            className="border p-3 cursor-pointer active:opacity-70"
            style={{ borderColor: C.line, background: C.paperLite }}>
            <div className="flex items-start gap-3">
              {d.image_urls?.[0] ? (
                <img src={d.image_urls[0]} alt="" className="w-14 h-14 object-cover flex-shrink-0" />
              ) : (
                <PhoneThumb color={d.color} size={56} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono" style={{ color: C.accent, fontWeight: 600 }}>{d.code}</div>
                    <div className="text-sm truncate" style={{ color: C.ink, fontWeight: 500 }}>
                      {d.brand} {d.model}
                    </div>
                  </div>
                  <StatusPill s={d.status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                  <span style={{ color: C.muted }}>
                    {tl(kind === 'bought' ? d.buy_price : d.sell_price)}
                  </span>
                  {kind === 'sold' && d.profit !== null && (
                    <span style={{ color: d.profit > 0 ? C.ok : C.bad }}>
                      {tlSigned(d.profit)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── SERVICES ────────────────────────────────────────────────────
function ServicesTab({ services, navigate }) {
  if (!services.length) {
    return (
      <div className="py-12 text-center text-sm font-serif italic" style={{ color: C.muted }}>
        Servis kaydı yok.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {services.map(s => (
        <Card key={s.id}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-mono" style={{ color: C.accent, fontWeight: 600 }}>{s.code}</span>
                <StatusPill s={s.status} />
              </div>
              <div className="text-sm" style={{ color: C.ink, fontWeight: 500 }}>
                {s.device_code ? `${s.device_brand} ${s.device_model}` : (s.external_device_info || '—')}
              </div>
              <div className="text-xs mt-1" style={{ color: C.inkSoft }}>{s.issue}</div>
              <div className="text-[10px] mt-2 font-mono" style={{ color: C.muted }}>
                {new Date(s.received_at).toLocaleDateString('tr-TR')}
                {s.technician_name && ` · ${s.technician_name}`}
              </div>
            </div>
            <div className="text-right">
              {s.parts_cost > 0 && (
                <div className="text-xs font-mono" style={{ color: C.warn }}>parça: {tl(s.parts_cost)}</div>
              )}
              {s.labor_cost > 0 && (
                <div className="text-xs font-mono" style={{ color: C.warn }}>işçilik: {tl(s.labor_cost)}</div>
              )}
              {(s.parts_cost > 0 || s.labor_cost > 0) && (
                <div className="text-base font-serif mt-1 pt-1 border-t" style={{ color: C.ink, borderColor: C.line }}>
                  {tl((s.parts_cost || 0) + (s.labor_cost || 0))}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
