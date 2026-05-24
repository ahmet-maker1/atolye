import React, { useState, useRef } from 'react';
import { Upload, X, ImagePlus, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { C } from './ui';
import { useToast } from './Toast';

export default function PhotoUpload({ deviceId, photos = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const fileRef = useRef();
  const { push } = useToast();

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const res = await api.uploadPhotos(deviceId, Array.from(files));
      onChange?.(res.image_urls);
      push({ kind: 'success', title: 'Yüklendi', message: `${res.added.length} fotoğraf eklendi.` });
    } catch (e) {
      push({ kind: 'error', title: 'Hata', message: e.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (idx) => {
    if (!confirm('Bu fotoğraf silinecek. Emin misin?')) return;
    try {
      const res = await api.deletePhoto(deviceId, idx);
      onChange?.(res.image_urls);
      push({ kind: 'success', message: 'Fotoğraf silindi.' });
    } catch (e) {
      push({ kind: 'error', title: 'Hata', message: e.message });
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((src, i) => (
          <div key={i} className="relative aspect-square group" style={{ background: C.paperDeep }}>
            <img src={src} alt="" onClick={() => setLightboxIdx(i)}
              className="w-full h-full object-cover cursor-zoom-in"
              style={{ border: `1px solid ${C.line}` }} />
            <button onClick={() => handleDelete(i)}
              className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: C.bad, color: '#fff' }}
              title="Sil">
              <X size={12} />
            </button>
          </div>
        ))}

        <label className="aspect-square flex flex-col items-center justify-center cursor-pointer transition-colors"
          style={{
            border: `1px dashed ${C.muted}`,
            background: uploading ? C.paperDeep : 'transparent',
            color: C.muted,
          }}>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)}
            disabled={uploading} className="hidden" />
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <div className="text-[10px] uppercase tracking-[0.15em] font-mono mt-2">yükleniyor</div>
            </>
          ) : (
            <>
              <ImagePlus size={20} />
              <div className="text-[10px] uppercase tracking-[0.15em] font-mono mt-2">ekle</div>
            </>
          )}
        </label>
      </div>

      {photos.length === 0 && !uploading && (
        <div className="text-[11px] mt-2 font-mono" style={{ color: C.muted }}>
          jpeg / png / webp · max 8 MB · birden fazla seçebilirsin
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setLightboxIdx(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
            <X size={20} />
          </button>
          <img src={photos[lightboxIdx]} alt="" className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()} />
          {photos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {photos.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: i === lightboxIdx ? '#fff' : 'rgba(255,255,255,0.4)' }} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
