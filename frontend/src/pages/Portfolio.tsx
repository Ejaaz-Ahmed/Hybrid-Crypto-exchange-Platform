import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';

export function Portfolio() {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<any[]>([]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    api.get(`/users/${userId}/portfolio`)
      .then(res => setPortfolio(res.data.portfolio || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading portfolio...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Portfolio</h1>
        <p className="text-sm text-slate-500">Manage your assets and balances</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase text-slate-500 tracking-wider">Asset Balances</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Available Balance</TableHead>
                <TableHead className="text-right">Locked (In Orders)</TableHead>
                <TableHead className="text-right">Total Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolio.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500">No assets in portfolio</TableCell>
                </TableRow>
              ) : (
                portfolio.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-semibold text-slate-900">{p.symbol}</TableCell>
                    <TableCell className="text-right numeric text-slate-900">{Number(p.balance).toLocaleString()}</TableCell>
                    <TableCell className="text-right numeric text-slate-500">{Number(p.lockedBalance || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right numeric font-bold text-slate-900">
                      {(Number(p.balance) + Number(p.lockedBalance || 0)).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
