import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users as UsersIcon, Wrench, Wallet,
  QrCode, ShieldCheck, LogOut, Database, Menu, X, Sun, Moon, Settings as SettingsIcon
} from 'lucide-react';

import Dashboard from './views/Dashboard';
import Devices from './views/Devices';
import DeviceDetail from './views/DeviceDetail';
import Customers from './views/Customers';
import CustomerDetail from './views/CustomerDetail';
import Service from './views/Service';
import Cash from './views/Cash';
import QR from './views/QR';
import QRView from './views/QRView';
import Users from './views/Users';
import Login from './views/Login';
import Settings from './views/Settings';
import { C, useTheme } from './components/ui';
import { auth } from './lib/api';

const NAV = [
  { to: '/',          label: 'Anasayfa',       icon: LayoutDashboard, num: '01', roles: ['Admin', 'Kasiyer', 'Teknisyen'] },
  { to: '/devices',   label: 'Cihazlar',       icon: Package,         num: '02', roles: ['Admin', 'Kasiyer', 'Teknisyen'] },
  { to: '/customers', label: 'Cari Kartlar',   icon: UsersIcon,       num: '03', roles: ['Admin', 'Kasiyer'] },
  { to: '/service',   label: 'Servis',         icon: Wrench,          num: '04', roles: ['Admin', 'Kasiyer', 'Teknisyen'] },
  { to: '/cash',      label: 'Kasa',           icon: Wallet,          num: '05', roles: ['Admin', 'Kasiyer'] },
  { to: '/qr',        label: 'QR & Sticker',   icon: QrCode,          num: '06', roles: ['Admin', 'Kasiyer', 'Teknisyen'] },
  { to: '/users',     label: 'Personel',       icon: ShieldCheck,     num: '07', roles: ['Admin'] },
  { to: '/settings',  label: 'Ayarlar',        icon: SettingsIcon,    num: '08', roles: ['Admin'] },
];

export default function App() {
  const location = useLocation();

  // Public route for QR scans (mobile entry point)
  if (location.pathname.startsWith('/qr/') && location.pathname.length > 4) {
    return (
      <Routes>
        <Route path="/qr/:token" element={<QRView />} />
      </Routes>
    );
  }

  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  const user = auth.get();
  if (!user) return <Navigate to="/login" replace />;

  return <ShellLayout user={user} />;
}

function ShellLayout({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [serverOk, setServerOk] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  // Close drawer on navigation
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Health check
  useEffect(() => {
    const check = () => {
      fetch('/api/health').then(r => setServerOk(r.ok)).catch(() => setServerOk(false));
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    auth.clear();
    navigate('/login');
  };

  return (
    <div className="flex" style={{ minHeight: '100vh', background: C.paper }}>
      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 drawer-overlay"
          onClick={() => setDrawerOpen(false)} />
      )}

      {/* Sidebar — full drawer on mobile, fixed on lg+ */}
      <aside className={`
        flex-shrink-0 flex flex-col z-50
        fixed lg:sticky top-0 left-0 h-screen
        w-64 lg:w-60
        transform transition-transform
        ${drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
        style={{ background: C.ink, color: C.paper }}>

        {/* Logo */}
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'rgba(243,238,227,0.1)' }}>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase font-mono" style={{ color: C.accent, fontWeight: 600 }}>
              ATÖLYE.CO
            </div>
            <div className="text-2xl font-serif mt-1" style={{ fontWeight: 400 }}>
              envanter
            </div>
            <div className="text-[10px] tracking-[0.15em] uppercase font-mono mt-0.5" style={{ color: 'rgba(243,238,227,0.5)' }}>
              ikinci el · servis · kasa
            </div>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="lg:hidden">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.filter(item => !item.roles || item.roles.includes(user.role)).map(item => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    isActive ? '' : 'opacity-65 hover:opacity-100'
                  }`
                }
                style={({ isActive }) => isActive ? {
                  background: 'rgba(200,66,28,0.15)',
                  color: C.paper,
                  borderLeft: `2px solid ${C.accent}`,
                  paddingLeft: 11,
                } : { color: C.paper }}>
                <span className="text-[9px] font-mono opacity-50" style={{ width: 16 }}>§{item.num}</span>
                <Icon size={15} strokeWidth={1.6} />
                <span style={{ fontWeight: 400 }}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Status footer */}
        <div className="p-3 border-t space-y-2" style={{ borderColor: 'rgba(243,238,227,0.1)' }}>
          <button onClick={toggleTheme}
            className="w-full px-2 py-1.5 flex items-center gap-2 text-[10px] font-mono"
            style={{ background: 'rgba(243,238,227,0.05)', color: 'rgba(243,238,227,0.7)' }}>
            {theme === 'dark' ? <Sun size={11} /> : <Moon size={11} />}
            <span className="text-left flex-1">{theme === 'dark' ? 'Açık tema' : 'Koyu tema'}</span>
          </button>
          <div className="px-2 py-1.5 flex items-center gap-2 text-[10px] font-mono"
            style={{ background: 'rgba(243,238,227,0.05)' }}>
            <Database size={11} style={{ color: serverOk ? '#7BB872' : C.bad }} />
            <span style={{ color: 'rgba(243,238,227,0.7)' }}>SQLite</span>
            <span style={{ color: serverOk ? '#7BB872' : C.bad, marginLeft: 'auto' }}>
              {serverOk ? '● bağlı' : '○ çevrimdışı'}
            </span>
          </div>
          <button onClick={logout}
            className="w-full px-2 py-1.5 flex items-center gap-2 text-[10px] font-mono"
            style={{ background: 'rgba(243,238,227,0.05)', color: 'rgba(243,238,227,0.7)' }}>
            <LogOut size={11} />
            <span className="text-left flex-1 truncate">{user.name}</span>
            <span style={{ color: 'rgba(243,238,227,0.4)' }}>çıkış</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b"
          style={{ background: C.paper, borderColor: C.line }}>
          <button onClick={() => setDrawerOpen(true)} className="p-1">
            <Menu size={20} style={{ color: C.ink }} />
          </button>
          <div className="text-[10px] tracking-[0.3em] uppercase font-mono" style={{ color: C.accent, fontWeight: 600 }}>
            ATÖLYE.CO
          </div>
          <button onClick={toggleTheme} className="p-1">
            {theme === 'dark' ? <Sun size={18} style={{ color: C.ink }} /> : <Moon size={18} style={{ color: C.ink }} />}
          </button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/devices/:id" element={<DeviceDetail />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/service" element={<Service />} />
            <Route path="/cash" element={<Cash />} />
            <Route path="/qr" element={<QR />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
