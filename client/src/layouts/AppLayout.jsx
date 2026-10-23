import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import DemoModeBanner from '../components/DemoModeBanner';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'AI Research', path: '/chat', icon: MessageSquare },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Derive current page title from pathname
  const getCurrentTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard Overview';
    if (path.startsWith('/documents/')) return 'Document Inspection';
    if (path.startsWith('/documents')) return 'Document Repository';
    if (path.startsWith('/chat')) return 'Adversarial Q&A Verification';
    if (path.startsWith('/settings')) return 'System Settings';
    return 'TruthGuard';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Demo Mode Banner */}
      <DemoModeBanner />

      <div className="flex flex-1 relative overflow-hidden">
        {/* Mobile Sidebar Overlay Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-navy-900 text-white flex flex-col justify-between transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Sidebar Top: Brand & Close Button */}
          <div>
            <div className="h-16 px-6 flex items-center justify-between border-b border-navy-800">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/30">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg tracking-tight text-white leading-none">TruthGuard</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mt-1">
                    Adversarial Intel
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-4 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === '/chat'
                    ? location.pathname.startsWith('/chat')
                    : item.path === '/documents'
                    ? location.pathname.startsWith('/documents')
                    : location.pathname === item.path;

                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/40'
                        : 'text-gray-300 hover:bg-navy-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Bottom: User Profile & Logout */}
          <div className="p-4 border-t border-navy-800">
            <div className="flex items-center justify-between p-2 rounded-lg bg-navy-800/60">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-brand-500/20 text-brand-300 flex items-center justify-center font-bold text-sm border border-brand-500/30">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{user?.name || 'Authorized User'}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email || 'user@truthguard.io'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="text-gray-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-navy-700/50 transition-colors ml-2"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {/* Header Bar */}
          <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{getCurrentTitle()}</h1>
            </div>

            <div className="flex items-center space-x-4">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                Live Engine
              </span>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
