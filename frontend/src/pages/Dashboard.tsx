import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  // Forms state
  const [qtPair, setQtPair] = useState('BTC/USDT');
  const [qtSide, setQtSide] = useState<'BUY' | 'SELL'>('BUY');
  const [qtPrice, setQtPrice] = useState('');
  const [qtQty, setQtQty] = useState('');
  
  const [walletAsset, setWalletAsset] = useState('USDT');
  const [walletAmount, setWalletAmount] = useState('');
  
  // Feedback messages
  const [tradeMessage, setTradeMessage] = useState({ text: '', type: '' });
  const [walletMessage, setWalletMessage] = useState({ text: '', type: '' });

  const [orderFilter, setOrderFilter] = useState<'ALL' | 'OPEN'>('OPEN');

  const fetchDashboardData = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
      const [userRes, portfolioRes, marketRes, ordersRes] = await Promise.all([
        api.get(`/users/${userId}`),
        api.get(`/users/${userId}/portfolio`),
        api.get('/market/prices'),
        api.get(`/trade/orders/all`)
      ]);

      setUser(userRes.data);
      const portData = portfolioRes.data?.portfolio || [];
      setPortfolio(portData);
      
      const market = marketRes.data || [];
      setMarketData(market);
      
      const ords = ordersRes.data || [];
      setOrders(Array.isArray(ords) ? ords : []);

      const priceMap = new Map();
      market.forEach((m: any) => {
        const base = m.trading_pair?.split('/')[0];
        if (base) priceMap.set(base, Number(m.price));
      });

      const val = portData.reduce((acc: number, item: any) => {
        const qty = Number(item.balance) + Number(item.lockedBalance || 0);
        if (item.symbol === 'USDT') return acc + qty;
        const price = priceMap.get(item.symbol) || 0;
        return acc + (qty * price);
      }, 0);
      
      setTotalValue(val);
    } catch (err) {
      console.error("Dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleQuickTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setTradeMessage({ text: '', type: '' });
    const userId = localStorage.getItem('userId');
    try {
      await api.post('/trade/order', {
        user_id: Number(userId),
        trading_pair: qtPair.toUpperCase(),
        order_type: qtSide,
        price: Number(qtPrice),
        quantity: Number(qtQty)
      });
      setTradeMessage({ text: 'Order placed successfully', type: 'success' });
      setQtPrice('');
      setQtQty('');
      fetchDashboardData();
      setTimeout(() => setTradeMessage({ text: '', type: '' }), 5000);
    } catch (err: any) {
      setTradeMessage({ text: err.response?.data?.error || 'Trade failed', type: 'error' });
    }
  };

  const handleWalletAction = async (e: React.FormEvent, action: 'deposit' | 'withdraw') => {
    e.preventDefault();
    setWalletMessage({ text: '', type: '' });
    const userId = localStorage.getItem('userId');
    try {
      await api.post(`/users/${userId}/${action}`, {
        symbol: walletAsset.toUpperCase(),
        amount: Number(walletAmount)
      });
      setWalletMessage({ text: `${action.charAt(0).toUpperCase() + action.slice(1)} successful`, type: 'success' });
      setWalletAmount('');
      fetchDashboardData();
      setTimeout(() => setWalletMessage({ text: '', type: '' }), 5000);
    } catch (err: any) {
      setWalletMessage({ text: err.response?.data?.error || `${action} failed`, type: 'error' });
    }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading dashboard...</div>;

  const filteredOrders = orders.filter(o => orderFilter === 'ALL' || (o.status !== 'FILLED' && o.status !== 'CANCELLED'));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* 1. Account Overview */}
      <Card className="lg:col-span-12">
        <CardHeader className="py-3">
          <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Account Overview</CardTitle>
        </CardHeader>
        <CardContent className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-200 rounded-sm flex items-center justify-center font-bold text-slate-700">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="font-semibold text-slate-900">{user?.full_name || 'Trader'}</div>
              <div className="text-xs text-slate-500">{user?.email} • {user?.country || 'No Country'}</div>
            </div>
          </div>
          <div className="text-right">
             {/* 3. Total Portfolio Value */}
            <div className="text-xs text-slate-500 uppercase">Total Portfolio Value</div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Your Portfolio */}
      <Card className="lg:col-span-6">
        <CardHeader>
          <CardTitle className="text-xs text-slate-500 uppercase">Your Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="p-0 max-h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">In Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolio.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-slate-500">Empty Portfolio</TableCell></TableRow>
              ) : (
                portfolio.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-semibold">{p.symbol}</TableCell>
                    <TableCell className="text-right numeric">{Number(p.balance).toLocaleString()}</TableCell>
                    <TableCell className="text-right numeric text-slate-400">{Number(p.lockedBalance || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 5. Market Opportunities */}
      <Card className="lg:col-span-6">
        <CardHeader>
          <CardTitle className="text-xs text-slate-500 uppercase">Market Opportunities</CardTitle>
        </CardHeader>
        <CardContent className="p-0 max-h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">24h Vol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marketData.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="font-semibold text-blue-600">
                    <a href={`/trade?pair=${m.trading_pair.replace('/','_')}`}>{m.trading_pair}</a>
                  </TableCell>
                  <TableCell className="text-right numeric">${Number(m.price).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-slate-500 numeric">${(Number(m.volume_24h) / 1000000).toFixed(2)}M</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 4. Recent Orders */}
      <Card className="lg:col-span-12">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-xs text-slate-500 uppercase">Recent Orders</CardTitle>
          <select 
            value={orderFilter} 
            onChange={(e) => setOrderFilter(e.target.value as any)}
            className="text-[10px] uppercase font-bold border-slate-200 rounded-sm px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Orders</option>
            <option value="OPEN">Open Only</option>
          </select>
        </CardHeader>
        <CardContent className="p-0 max-h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Filled / Qty</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500">No {orderFilter.toLowerCase()} orders</TableCell>
                </TableRow>
              ) : (
                filteredOrders.slice(0, 10).map((o, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{o.trading_pair}</TableCell>
                    <TableCell className={o.order_type === 'BUY' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {o.order_type}
                    </TableCell>
                    <TableCell className="text-right numeric font-mono">${Number(o.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right numeric">{Number(o.filled_quantity).toFixed(4)} / {Number(o.quantity).toFixed(4)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase ${o.status === 'FILLED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {o.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 6. Quick Trade */}
      <Card className="lg:col-span-6">
        <CardHeader>
          <CardTitle className="text-xs text-slate-500 uppercase">Quick Trade</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQuickTrade} className="space-y-3">
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setQtSide('BUY')} className={`flex-1 py-1 text-xs font-semibold rounded-sm border ${qtSide === 'BUY' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200'}`}>BUY</button>
              <button type="button" onClick={() => setQtSide('SELL')} className={`flex-1 py-1 text-xs font-semibold rounded-sm border ${qtSide === 'SELL' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200'}`}>SELL</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Pair" value={qtPair} onChange={(e) => setQtPair(e.target.value)} placeholder="BTC/USDT" required />
              <Input label="Price per Unit (USD)" type="number" step="0.01" value={qtPrice} onChange={(e) => setQtPrice(e.target.value)} required />
            </div>
            <Input label="Quantity" type="number" step="0.0001" value={qtQty} onChange={(e) => setQtQty(e.target.value)} required />
            
            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 mt-1 px-1">
              <span>Estimated Total:</span>
              <span className="font-mono text-slate-900">${(Number(qtPrice) * Number(qtQty) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <Button type="submit" className="w-full h-8 text-xs mt-2" variant={qtSide === 'BUY' ? 'primary' : 'danger'}>
              Submit {qtSide} Order
            </Button>
            {tradeMessage.text && (
              <div className={`mt-2 p-2 text-xs border ${tradeMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                {tradeMessage.text}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* 7. Wallet (Deposit / Withdrawal) */}
      <Card className="lg:col-span-6">
        <CardHeader>
          <CardTitle className="text-xs text-slate-500 uppercase">Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Input label="Asset" value={walletAsset} onChange={(e) => setWalletAsset(e.target.value)} placeholder="USDT" className="w-1/3" />
              <Input label="Amount" type="number" step="0.01" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} className="flex-1" />
            </div>
            <div className="flex gap-3">
              <Button onClick={(e) => handleWalletAction(e, 'deposit')} className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs text-white">
                Deposit
              </Button>
              <Button onClick={(e) => handleWalletAction(e, 'withdraw')} className="flex-1 bg-slate-800 hover:bg-slate-900 h-8 text-xs text-white">
                Withdraw
              </Button>
            </div>
            {walletMessage.text && (
              <div className={`mt-2 p-2 text-xs border ${walletMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                {walletMessage.text}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
