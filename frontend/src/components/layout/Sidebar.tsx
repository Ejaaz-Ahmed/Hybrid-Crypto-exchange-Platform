import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LineChart, ArrowRightLeft, Wallet, UserCircle, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Markets', path: '/market', icon: LineChart },
  { name: 'Trade', path: '/trade', icon: ArrowRightLeft },
  { name: 'Portfolio', path: '/portfolio', icon: Wallet },
  { name: 'Account', path: '/account', icon: UserCircle },
];

export function Sidebar() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 bg-slate-900 flex flex-col h-screen fixed left-0 top-0 text-slate-300">
      <div className="flex items-center justify-center p-6 border-b border-slate-800">
        <img src="/logo.jpg" alt="EAA Exchange Logo" className="h-20 object-contain rounded-md bg-white p-1" />
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-800 text-white"
                  : "hover:bg-slate-800/50 hover:text-white"
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
