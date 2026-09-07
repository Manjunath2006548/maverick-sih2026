'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'upload', label: 'Data Upload', href: '/upload', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
  { id: 'analysis', label: 'Analysis', href: '/analysis', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

export default function Sidebar({ user, active }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const roleLabel = {
    admin: 'Administrator',
    qa_inspector: 'QA Inspector',
    engineer: 'Engineer',
  };

  const roleColor = {
    admin: 'text-isro-orange',
    qa_inspector: 'text-isro-lightblue',
    engineer: 'text-isro-green',
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-isro-dark/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-isro-blue to-isro-orange flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-isro-blue/30">
            ISRO
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">MAVERICK</h2>
            <p className="text-[10px] text-gray-500 font-mono">v1.0.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 mb-3">Navigation</p>
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              active === item.id
                ? 'bg-isro-blue/20 text-isro-lightblue border border-isro-blue/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
            </svg>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-white/5">
        <div className="glass-card rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-isro-blue/20 flex items-center justify-center text-isro-lightblue text-sm font-bold">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className={`text-[10px] font-mono ${roleColor[user?.role] || 'text-gray-500'}`}>
                {roleLabel[user?.role] || user?.role || '---'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-3 px-3 py-2 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all text-center font-medium">
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
