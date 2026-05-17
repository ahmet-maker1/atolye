import React, { useEffect, useState } from 'react';
import {
  Activity, AlertCircle, Trash2, UserCheck, UserX, FilePlus, Edit3, RotateCcw, Eye, Filter, X
} from 'lucide-react';
import { api } from '../lib/api';
import { C, Card, SectionLabel, KPI } from '../components/ui';

const ACTION_META = {
  create:        { label: 'Oluştur',         color: '#3B7A3E', icon: FilePlus },
  update:        { label: 'Güncelle',        color: '#B5791F', icon: Edit3 },
  delete:        { label: 'Sil',             color: '#A62F22', icon: Trash2 },
  restore:       { label: 'Geri al',         color: '#3B7A3E', icon: RotateCcw },
  login:         { label: 'Giriş',           color: '#3B7A3E', icon: UserCheck },
  login_failed:  { label: 'Başarısız giriş', color: '#A62F22', icon: UserX },
};

const ENTITY_LABELS = {
  device:      'Cihaz',
  transaction: 'İşlem',
  service:     'Servis',
  cash:        'Kasa',
  user:        'Personel',
  auth:        'Kimlik',
};

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ entity: '', action: '', q: '', limit: 200 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v));
      const [list, st] = await Promise.all([api.auditList(params), api.auditStats()]);
      setRows(list);
      setStats(st);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters]);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div>
        <div className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: C.muted }}>
          § 07 / GÜVENLİK
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif mt-1" style={{ color: C.ink }}>
          Sistem Logu
        </h1>
        <p className="text-sm mt-1" style={{ color: C.inkSoft }}>
          Sistemdeki her yaratma, güncelleme, silme ve giriş denemesi burada kayıtlıdır.
        </p>
      </div>

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPI label="Son 24 saat (toplam)" value={stats.total_24h} />
          <KPI label="Başarısız giriş (24s)" value={stats.failed_logins_24h} valueColor={stats.failed_logins_24h > 3 ? C.bad : undefined} />
          <KPI label="Silme işlemi (24s)" value={stats.deletes_24h} valueColor={stats.deletes_24h > 0 ? C.warn : undefined} />
          <KPI label="Toplam kayıt (gösterilen)" value={rows.length} />
        </div>
      )}

      {/* Filtreler */}
      <Card>
        <SectionLabel num="F" label="Filtreler" right={
          (filters.entity || filters.action || filters.q) ? (
            <button onClick={() => setFilters({ entity: '', action: '', q: '', limit: 200 })}
              className="px-2 py-1 text-[10px] inline-flex items-center gap-1 font-mono" style={{ color: C.muted }}>
              <X size={11} /> TEMİZLE
            </button>
          ) : null
        } />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>Modül</label>
            <select value={filters.entity} onChange={e => setFilters({ ...filters, entity: e.target.value })}
              className="w-full px-3 py-2 text-sm border outline-none"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
              <option value="">— hepsi —</option>
              <option value="device">Cihaz</option>
              <option value="transaction">İşlem</option>
              <option value="service">Servis</option>
              <option value="cash">Kasa</option>
              <option value="user">Personel</option>
              <option value="auth">Kimlik (giriş)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>Eylem</label>
            <select value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 text-sm border outline-none"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }}>
              <option value="">— hepsi —</option>
              <option value="create">Oluştur</option>
              <option value="update">Güncelle</option>
              <option value="delete">Sil</option>
              <option value="restore">Geri al</option>
              <option value="login">Giriş</option>
              <option value="login_failed">Başarısız giriş</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase tracking-[0.15em] font-mono mb-1" style={{ color: C.muted }}>Arama (kullanıcı / hedef)</label>
            <input value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })}
              placeholder="DVC-00001, Selin, iPhone 14..."
              className="w-full px-3 py-2 text-sm border outline-none"
              style={{ borderColor: C.line, color: C.ink, background: C.paperLite }} />
          </div>
        </div>
      </Card>

      {/* Hata */}
      {err && (
        <div className="p-4 border inline-flex items-center gap-2" style={{ background: C.pillBad, color: C.bad, borderColor: C.bad }}>
          <AlertCircle size={16} /> {err}
        </div>
      )}

      {/* Liste */}
      <Card>
        <SectionLabel num="L" label={`Kayıtlar (${rows.length})`} />

        {loading && <div className="text-center py-8 text-sm font-mono" style={{ color: C.muted }}>Yükleniyor...</div>}

        {!loading && rows.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: C.muted }}>Kayıt bulunamadı.</div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.15em] font-mono" style={{ color: C.muted, borderBottom: `1px solid ${C.line}` }}>
                  <th className="text-left py-2 pr-2">Zaman</th>
                  <th className="text-left py-2 pr-2">Kullanıcı</th>
                  <th className="text-left py-2 pr-2">Eylem</th>
                  <th className="text-left py-2 pr-2">Modül</th>
                  <th className="text-left py-2 pr-2">Hedef</th>
                  <th className="text-left py-2 pr-2">IP</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const meta = ACTION_META[r.action] || { label: r.action, color: C.muted, icon: Activity };
                  const Icon = meta.icon;
                  const isOpen = expanded === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr className="border-b" style={{ borderColor: C.line }}>
                        <td className="py-2 pr-2 font-mono text-xs whitespace-nowrap" style={{ color: C.inkSoft }}>
                          {new Date(r.created_at + 'Z').toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'medium' })}
                        </td>
                        <td className="py-2 pr-2">
                          <div className="text-xs" style={{ color: C.ink, fontWeight: 500 }}>{r.user_name || 'sistem'}</div>
                          {r.user_role && <div className="text-[10px] font-mono" style={{ color: C.muted }}>{r.user_role}</div>}
                        </td>
                        <td className="py-2 pr-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.1em]"
                            style={{ background: 'rgba(0,0,0,0.04)', color: meta.color }}>
                            <Icon size={10} /> {meta.label}
                          </span>
                        </td>
                        <td className="py-2 pr-2 text-xs font-mono" style={{ color: C.muted }}>
                          {ENTITY_LABELS[r.entity] || r.entity}
                        </td>
                        <td className="py-2 pr-2 text-xs" style={{ color: C.ink }}>
                          {r.entity_label || (r.entity_id ? `#${r.entity_id}` : '—')}
                        </td>
                        <td className="py-2 pr-2 text-[10px] font-mono" style={{ color: C.muted }}>
                          {r.ip || '—'}
                        </td>
                        <td className="py-2 pr-2">
                          {r.changes && (
                            <button onClick={() => setExpanded(isOpen ? null : r.id)} title="Detay">
                              <Eye size={14} style={{ color: C.muted }} />
                            </button>
                          )}
                        </td>
                      </tr>
                      {isOpen && r.changes && (
                        <tr style={{ background: C.paperDeep }}>
                          <td colSpan={7} className="p-3">
                            <pre className="text-[10px] font-mono whitespace-pre-wrap break-all" style={{ color: C.inkSoft }}>
                              {JSON.stringify(r.changes, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
