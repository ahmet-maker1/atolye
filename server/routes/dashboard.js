import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/dashboard — tüm özet verileri tek çağrıda döner
router.get('/', (req, res) => {
  // KPIs
  const deviceCount   = db.prepare("SELECT COUNT(*) AS c FROM devices").get().c;
  const inStock       = db.prepare("SELECT COUNT(*) AS c FROM devices WHERE status='stokta'").get().c;
  const sold          = db.prepare("SELECT COUNT(*) AS c FROM devices WHERE status='satıldı'").get().c;
  const inService     = db.prepare("SELECT COUNT(*) AS c FROM devices WHERE status='serviste'").get().c;
  const broken        = db.prepare("SELECT COUNT(*) AS c FROM devices WHERE status='arızalı'").get().c;
  const serviceQueue  = db.prepare("SELECT COUNT(*) AS c FROM service_tickets WHERE status IN ('beklemede','işlemde','hazır')").get().c;
  const servicePending = db.prepare("SELECT COUNT(*) AS c FROM service_tickets WHERE status='beklemede'").get().c;
  const serviceReady  = db.prepare("SELECT COUNT(*) AS c FROM service_tickets WHERE status='hazır'").get().c;
  const customerCount = db.prepare("SELECT COUNT(*) AS c FROM customers").get().c;
  const supplierCount = db.prepare("SELECT COUNT(*) AS c FROM customers WHERE role IN ('tedarikçi','her ikisi')").get().c;

  const balance    = db.prepare("SELECT COALESCE(SUM(CASE WHEN type='in' THEN amount ELSE -amount END),0) AS v FROM cash_flow").get().v;
  const todayIn    = db.prepare("SELECT COALESCE(SUM(amount),0) AS v FROM cash_flow WHERE type='in' AND date(occurred_at) = date('now')").get().v;
  const todayOut   = db.prepare("SELECT COALESCE(SUM(amount),0) AS v FROM cash_flow WHERE type='out' AND date(occurred_at) = date('now')").get().v;
  const inventoryValue = db.prepare("SELECT COALESCE(SUM(buy_price + expenses),0) AS v FROM devices WHERE status='stokta'").get().v;

  // Haftalık satış/ciro (son 7 gün)
  const weekly = db.prepare(`
    SELECT date(occurred_at) AS d,
      COALESCE(SUM(CASE WHEN type='in' AND category='Cihaz satışı' THEN amount ELSE 0 END),0) AS ciro
    FROM cash_flow
    WHERE occurred_at >= date('now','-6 days')
    GROUP BY date(occurred_at)
    ORDER BY d ASC
  `).all();

  // Haftalık kâr yaklaşımı: son 7 gün içindeki satışlarda kâr = sell_price - (buy_price + expenses)
  const weeklyProfit = db.prepare(`
    SELECT date(sale_date) AS d,
      COALESCE(SUM(sell_price - buy_price - expenses), 0) AS kar
    FROM devices
    WHERE sale_date >= date('now','-6 days') AND status = 'satıldı'
    GROUP BY date(sale_date)
  `).all();

  const brandDistribution = db.prepare(`
    SELECT brand AS name, COUNT(*) AS adet
    FROM devices
    GROUP BY brand
    ORDER BY adet DESC
    LIMIT 8
  `).all();

  const statusDistribution = [
    { name: 'Stokta',  value: inStock,   color: '#3B7A3E' },
    { name: 'Satıldı', value: sold,      color: '#1A1816' },
    { name: 'Serviste', value: inService, color: '#B5791F' },
    { name: 'Arızalı', value: broken,    color: '#A62F22' },
  ];

  // Recent devices
  const recentDevices = db.prepare(`
    SELECT d.*, s.name AS supplier_name, c.name AS customer_name
    FROM devices d
    LEFT JOIN customers s ON s.id = d.supplier_id
    LEFT JOIN customers c ON c.id = d.customer_id
    ORDER BY d.updated_at DESC
    LIMIT 5
  `).all();
  recentDevices.forEach(d => { d.image_urls = JSON.parse(d.image_urls || '[]'); });

  res.json({
    kpi: {
      deviceCount, inStock, sold, inService, broken,
      serviceQueue, servicePending, serviceReady,
      customerCount, supplierCount,
      balance, todayIn, todayOut, todayNet: todayIn - todayOut,
      inventoryValue,
    },
    weekly,
    weeklyProfit,
    brandDistribution,
    statusDistribution,
    recentDevices,
  });
});

export default router;
