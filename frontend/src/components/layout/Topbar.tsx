import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export function Topbar() {
  const [userName, setUserName] = useState<string>('Loading...');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setUserName('Guest');
      return;
    }

    api.get(`/users/${userId}`)
      .then((res) => {
        setUserName(res.data.full_name || res.data.email || `User ${userId}`);
      })
      .catch(() => {
        setUserName(`User ${userId}`);
      });
  }, []);

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center text-sm text-slate-500 font-medium">
        <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
        System Operational
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm font-medium text-slate-700">
          {userName}
        </div>
        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-xs">
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
