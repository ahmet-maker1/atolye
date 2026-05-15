import React, { useState, useEffect } from 'react';
import { Download, Database, HardDrive, Sun, Moon, Image as ImageIcon, Info } from 'lucide-react';
import { api, fmtBytes } from '../lib/api';
import { C, Card, SectionLabel, useTheme } from '../components/ui';
import { useToast } from '../components/Toast';

export default function Settings() {
  const [info, setInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const { theme, setTheme } = useTheme();
  const { push } = useToast();

  const load = () => api.backupInfo().then(setInfo).catch(() => {});
  useEffect(() => { load(); }, []);

  const downloadBackup = async () => {
    setDownloading(true);
    try {
      api.backupDownload();
      push({ kind: 'success', title: 'İndiriliyor', message: 'Yedek dosyası hazırlanıyor — birazdan inecek.' });
    } catch (e) {
      push({ kind: 'error', title: 'Hata', message: e.message });
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] tracking-[0.25em] uppercase font-mono mb-2" style={{ color: C.muted }}>
          — AYARLAR / SİSTEM
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif" style={{ fontWeight: 400, letterSpacing: '-0.03em', color: C.ink }}>
          Sistem ayarları
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Backup */}
        <Card>
          <SectionLabel num="01" label="Yedekleme" />
          <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
            Tüm veritabanı + cihaz fotoğrafları tek bir <span className="font-mono">.zip</span> dosyası olarak iner.
            Yedeği güvenli bir yere (USB, Drive, Dropbox) kopyala.
          </p>

          {info && (
            <div className="border space-y-0 mb-4" style={{ borderColor: C.line, background: C.paperDeep }}>
              <Row icon={Database} label="Veritabanı" value={fmtBytes(info.db_size)} />
              <Row icon={ImageIcon} label="Fotoğraflar" value={`${info.uploads_count} dosya · ${fmtBytes(info.uploads_size)}`} />
              <Row icon={HardDrive} label="Toplam yedek boyutu" value={fmtBytes(info.total_size)} bold />
            </div>
          )}

          <button onClick={downloadBackup} disabled={downloading}
            className="w-full py-3 text-xs inline-flex items-center justify-center gap-2 font-mono disabled:opacity-50"
            style={{ background: C.accent, color: '#fff' }}>
            <Download size={14} />
            {downloading ? 'HAZIRLANIYOR...' : 'YEDEK ALMA & İNDİR'}
          </button>

          <div className="mt-4 p-3 text-[11px]" style={{ background: C.pillWarn, color: C.warn }}>
            <div className="flex items-start gap-2">
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-1 font-mono uppercase tracking-[0.1em]">Geri yükleme</strong>
                Yedek dosyasındaki <span className="font-mono">YEDEK-OKU.txt</span>'de geri yükleme adımları var.
                Geri yükleme manuel yapılır (güvenlik için).
              </div>
            </div>
          </div>
        </Card>

        {/* Theme */}
        <Card>
          <SectionLabel num="02" label="Görünüm" />
          <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
            Açık veya koyu tema seç. Tercih cihazına kaydedilir.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setTheme('light')}
              className="p-4 text-left transition-colors"
              style={{
                background: theme === 'light' ? C.ink : C.paperDeep,
                color: theme === 'light' ? C.paper : C.ink,
                border: `1px solid ${theme === 'light' ? C.ink : C.line}`,
              }}>
              <Sun size={20} className="mb-2" />
              <div className="text-sm font-serif" style={{ fontWeight: 500 }}>Açık tema</div>
              <div className="text-[10px] uppercase tracking-[0.15em] font-mono mt-1 opacity-60">krem · charcoal</div>
              {theme === 'light' && <div className="text-[10px] uppercase tracking-[0.15em] font-mono mt-2" style={{ color: C.accent }}>● aktif</div>}
            </button>

            <button onClick={() => setTheme('dark')}
              className="p-4 text-left transition-colors"
              style={{
                background: theme === 'dark' ? C.ink : C.paperDeep,
                color: theme === 'dark' ? C.paper : C.ink,
                border: `1px solid ${theme === 'dark' ? C.ink : C.line}`,
              }}>
              <Moon size={20} className="mb-2" />
              <div className="text-sm font-serif" style={{ fontWeight: 500 }}>Koyu tema</div>
              <div className="text-[10px] uppercase tracking-[0.15em] font-mono mt-1 opacity-60">deep · cream</div>
              {theme === 'dark' && <div className="text-[10px] uppercase tracking-[0.15em] font-mono mt-2" style={{ color: C.accent }}>● aktif</div>}
            </button>
          </div>
        </Card>

        {/* System info */}
        <Card className="lg:col-span-2">
          <SectionLabel num="03" label="Sistem bilgileri" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <Info2 label="Veritabanı türü" value="SQLite (better-sqlite3)" />
            <Info2 label="WAL modu" value="aktif (paralel okuma)" />
            <Info2 label="Sürüm" value="Atölye.co v1.1" />
            <Info2 label="DB konumu" value={info?.db_path || '—'} mono />
            <Info2 label="Foto klasörü" value="server/uploads/" mono />
            <Info2 label="Tema" value={theme === 'dark' ? 'Koyu' : 'Açık'} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, bold }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b last:border-0" style={{ borderColor: C.line }}>
      <span className="flex items-center gap-2 text-xs font-mono" style={{ color: C.muted }}>
        <Icon size={12} /> {label}
      </span>
      <span className="text-sm font-mono" style={{ color: C.ink, fontWeight: bold ? 600 : 400 }}>
        {value}
      </span>
    </div>
  );
}

function Info2({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-1" style={{ color: C.muted }}>
        {label}
      </div>
      <div className={mono ? 'font-mono text-xs break-all' : 'text-sm'} style={{ color: C.ink }}>
        {value}
      </div>
    </div>
  );
}
