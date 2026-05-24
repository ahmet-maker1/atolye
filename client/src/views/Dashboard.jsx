import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Search, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { api, tl } from '../lib/api';
import { C, Card, KPI, SectionLabel, StatusPill, PhoneThumb } from '../components/ui';
import BarcodeScanner from '../components/BarcodeScanner';
import { useToast } from '../components/Toast';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [quickSearch, setQuickSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const navigate = useNavigate();
  const { push } = useToast();

  useEffect(() => {
    api.dashboard().then(setData).catch(e => setErr(e.message));
  }, []);

  useEffect(() => {
    if (quickSearch.length < 3) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      api.devicesList({ q: quickSearch }).then(r => setSearchResults(r.slice(0, 5))).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [quickSearch]);

  if (err) return <div className="p-6 text-red-700">Hata: {err}</div>;
  if (!data) return <div className="p-6 text-sm font-mono" style={{ color: C.muted }}>yükleniyor...</div>;

  const { kpi, weekly, brandDistribution, statusDistribution, recentDevices } = data;

  const weeklyChart = weekly.map(w => {
    const profit = data.weeklyProfit?.find(p => p.d === w.d);
    return { d: w.d.slice(5), ciro: w.ciro, kar: profit?.kar || 0 };
  });

  // Status distribution colors are theme-aware
  const statusColors = [C.ok, C.ink, C.warn, C.bad];
  const statusData = statusDistribution.map((s, i) => ({ ...s, color: statusColors[i] }));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="text-[10px] tracking-[0.25em] uppercase font-mono mb-2" style={{ color: C.muted }}>
            — GENEL BAKIŞ / {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[56px] leading-[0.95] font-serif" style={{ fontWeight: 400, letterSpacing: '-0.03em', color: C.ink }}>
            Hoş geldin. <span style={{ color: C.accent, fontStyle: 'italic' }}>bugün {kpi.servicePending + kpi.serviceReady}</span> iş bekliyor.
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>Kasa bakiyesi</div>
          <div className="text-2xl sm:text-3xl font-serif" style={{ color: C.ink }}>{tl(kpi.balance)}</div>
        </div>
      </div>

      {/* Quick IMEI search */}
      <div className="relative">
        <div className="flex items-stretch border-2" style={{ borderColor: C.ink, background: C.paperLite }}>
          <button
            type="button"
            onClick={() => setScanning(true)}
            title="Kamera ile barkodu tara"
            className="px-3 sm:px-4 flex items-center border-r hover:bg-black/5 transition-colors"
            style={{ borderColor: C.line, cursor: 'pointer' }}>
            <ScanLine size={18} style={{ color: C.accent }} />
          </button>
          <input value={quickSearch} onChange={e => setQuickSearch(e.target.value)}
            placeholder="HIZLI IMEI SORGUSU..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults[0]) {
                navigate(`/devices/${searchResults[0].id}`);
              }
            }}
            className="flex-1 min-w-0 bg-transparent px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base outline-none font-mono"
            style={{ color: C.ink }} />
          <button
            type="button"
            onClick={() => searchResults[0] && navigate(`/devices/${searchResults[0].id}`)}
            disabled={!searchResults[0]}
            className="px-3 sm:px-6 flex items-center gap-2 text-xs uppercase tracking-[0.15em] font-mono disabled:opacity-40"
            style={{ background: C.ink, color: C.paper }}>
            <Search size={14} /> <span className="hidden sm:inline">sorgula</span>
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 border shadow-lg"
            style={{ borderColor: C.line, background: C.paperLite }}>
            {searchResults.map(m => (
              <div key={m.id} onClick={() => navigate(`/devices/${m.id}`)}
                className="flex items-center gap-3 px-4 py-3 border-b cursor-pointer hover:bg-black/5"
                style={{ borderColor: C.line }}>
                <PhoneThumb color={m.color} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: C.ink }}>{m.brand} {m.model}</div>
                  <div className="text-[10px] font-mono truncate" style={{ color: C.muted }}>{m.code} · {m.imei}</div>
                </div>
                <StatusPill s={m.status} />
                <ChevronRight size={14} style={{ color: C.muted }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPIs — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPI label="Toplam Cihaz"
          value={kpi.deviceCount}
          sub={`${kpi.inStock} stokta · ${kpi.sold} satıldı`} />
        <KPI label="Bugünkü Net"
          value={tl(kpi.todayNet)}
          sub={`+${tl(kpi.todayIn)} / -${tl(kpi.todayOut)}`}
          accent />
        <KPI label="Servis Kuyruğu"
          value={kpi.serviceQueue}
          sub={`${kpi.servicePending} bekleyen · ${kpi.serviceReady} hazır`} />
        <KPI label="Envanter Değeri"
          value={tl(kpi.inventoryValue)}
          sub={`${kpi.inStock} cihaz`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionLabel num="01" label="Haftalık ciro & kâr" right={
            <div className="flex gap-3 text-[10px] uppercase tracking-[0.15em] font-mono" style={{ color: C.muted }}>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2" style={{ background: C.ink }} />ciro</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2" style={{ background: C.accent }} />kâr</span>
            </div>
          } />
          {weeklyChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyChart} barGap={2}>
                <CartesianGrid vertical={false} stroke={C.line} strokeDasharray="2 4" />
                <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={v => v >= 1000 ? (v/1000)+'k' : v} />
                <Tooltip contentStyle={{ background: C.ink, border: 'none', color: C.paper, fontSize: 12, fontFamily: 'JetBrains Mono' }} formatter={v => tl(v)} />
                <Bar dataKey="ciro" fill={C.ink} />
                <Bar dataKey="kar" fill={C.accent} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs" style={{ color: C.muted }}>Henüz satış yok.</div>
          )}
        </Card>

        <Card>
          <SectionLabel num="02" label="Envanter durumu" />
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusData.filter(s => s.value > 0)} dataKey="value" cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={2} stroke="none">
                {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {statusData.map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2" style={{ background: s.color }} />
                  <span style={{ color: C.ink }}>{s.name}</span>
                </span>
                <span className="font-mono" style={{ color: C.muted }}>{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <SectionLabel num="03" label="Marka dağılımı" />
          {brandDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={brandDistribution} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: C.ink, fontSize: 11 }} width={60} />
                <Bar dataKey="adet">
                  {brandDistribution.map((_, i) => <Cell key={i} fill={i === 0 ? C.accent : C.ink} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs" style={{ color: C.muted }}>Veri yok</div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <SectionLabel num="04" label="Son hareketler" right={
            <button onClick={() => navigate('/devices')} className="text-[10px] tracking-[0.15em] uppercase flex items-center gap-1 font-mono" style={{ color: C.accent }}>
              tümü <ChevronRight size={12} />
            </button>
          } />
          <div className="space-y-0">
            {recentDevices.length === 0 && (
              <div className="py-8 text-center text-xs" style={{ color: C.muted }}>Henüz cihaz yok.</div>
            )}
            {recentDevices.map((d, i) => (
              <div key={d.id} onClick={() => navigate(`/devices/${d.id}`)}
                className="flex items-center justify-between py-2.5 border-b last:border-0 cursor-pointer hover:bg-black/5 px-1 -mx-1 transition-colors"
                style={{ borderColor: C.line }}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] w-6 font-mono flex-shrink-0" style={{ color: C.muted }}>{String(i + 1).padStart(2, '0')}</span>
                  {d.image_urls?.[0] ? (
                    <img src={d.image_urls[0]} alt="" className="w-9 h-9 object-cover flex-shrink-0" />
                  ) : (
                    <PhoneThumb color={d.color} size={36} />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm truncate" style={{ color: C.ink, fontWeight: 500 }}>{d.brand} {d.model}</div>
                    <div className="text-[11px] font-mono truncate" style={{ color: C.muted }}>{d.code} · {d.imei}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                  <StatusPill s={d.status} />
                  <div className="text-right min-w-[70px]">
                    <div className="text-sm font-mono" style={{ color: d.status === 'satıldı' ? C.ok : C.ink }}>
                      {d.status === 'satıldı' ? tl(d.sell_price) : tl(d.buy_price)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* IMEI barkod scanner */}
      <BarcodeScanner
        isOpen={scanning}
        onClose={() => setScanning(false)}
        title="IMEI ile cihaz ara"
        hint="Telefonun arkasındaki barkodu tara"
        onResult={async (text) => {
          setScanning(false);
          const imei = String(text).replace(/\D/g, '');
          if (imei.length < 8) {
            push({ kind: 'warn', message: `Okunan: "${text}" — IMEI değil. Tekrar dene.` });
            return;
          }
          try {
            const list = await api.devicesList({ q: imei });
            const match = list.find(d => d.imei === imei) || list[0];
            if (match) {
              push({ kind: 'success', message: `${match.brand} ${match.model} bulundu` });
              navigate(`/devices/${match.id}`);
            } else {
              push({ kind: 'warn', title: 'Bulunamadı', message: `IMEI ${imei} kayıtlı değil.`, duration: 6000 });
              setQuickSearch(imei);
            }
          } catch (e) {
            push({ kind: 'error', message: e.message });
          }
        }}
      />
    </div>
  );
}
