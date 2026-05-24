// Audit log helper — tüm CRUD'leri kim/ne/ne zaman olarak kaydeder.
// Asla request akışını bozmaz: hata olursa sessiz konsol'a yazar.

import db from '../db.js';

const insertStmt = db.prepare(`
  INSERT INTO audit_log
    (user_id, user_name, user_role, action, entity, entity_id, entity_label, changes, ip)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

/**
 * logAction({ req, action, entity, entityId, entityLabel, changes })
 *
 * req     — Express req (req.user ve req.ip otomatik okunur)
 * action  — 'create' | 'update' | 'delete' | 'restore' | 'login' | 'login_failed'
 * entity  — 'device' | 'transaction' | 'service' | 'cash' | 'user' | 'auth'
 * entityId    — ilgili satır id'si (opsiyonel)
 * entityLabel — okunabilir referans, mesela "DVC-00001 iPhone 14" (opsiyonel)
 * changes — JSON yapı (opsiyonel, küçük tutun)
 */
export function logAction({ req, action, entity, entityId, entityLabel, changes }) {
  try {
    const user = req?.user || null;
    insertStmt.run(
      user?.id || null,
      user?.name || 'sistem',
      user?.role || null,
      action,
      entity,
      entityId || null,
      entityLabel ? String(entityLabel).slice(0, 200) : null,
      changes ? JSON.stringify(changes).slice(0, 2000) : null,
      req?.ip || null,
    );
  } catch (e) {
    // log hatası ana akışı bozmamalı
    console.error('[audit] log hatası:', e.message);
  }
}
