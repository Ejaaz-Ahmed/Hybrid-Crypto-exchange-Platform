import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export function Account() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    api.get(`/users/${userId}`)
      .then(res => setUser(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading account...</div>;
  if (!user) return <div className="text-sm text-red-500">Failed to load account details.</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-slate-500">Manage your profile and trading preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase text-slate-500 tracking-wider">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-md flex items-center justify-center text-2xl font-bold">
              {user.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{user.full_name || 'Trader'}</h3>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 mb-1">Trader ID</p>
              <p className="font-semibold text-slate-900 font-mono">{user.user_id || localStorage.getItem('userId')}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Country</p>
              <p className="font-semibold text-slate-900">{user.country || 'Not set'}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Member Since</p>
              <p className="font-semibold text-slate-900">{new Date().getFullYear()}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Account Status</p>
              <p className="font-semibold text-green-600">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
