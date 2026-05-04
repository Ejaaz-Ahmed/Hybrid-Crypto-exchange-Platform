import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Input } from '../components/ui/Input';

export function Market() {
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [orderbook, setOrderbook] = useState<{ bids: any[], asks: any[] }>({ bids: [], asks: [] });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPair, setSelectedPair] = useState('BTC/USDT');

  const fetchMarketData = async () => {
    try {
      const res = await api.get('/market/prices');
      setMarketData(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/market/analytics');
      setAnalytics(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); }
  };

  const fetchOrderbook = async (pair: string) => {
    try {
      const res = await api.get(`/market/orderbook?pair=${pair}`);
      setOrderbook(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMarketData(), fetchAnalytics(), fetchOrderbook(selectedPair)])
      .finally(() => setLoading(false));
    
    // Live price feed simulation
    const interval = setInterval(() => {
      fetchMarketData();
      fetchOrderbook(selectedPair);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedPair]);

  const filteredMarket = marketData.filter(m => m.trading_pair.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="text-sm text-slate-500">Loading market data...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Market Overview</h1>
        <p className="text-sm text-slate-500">Live prices, analytics, and orderbook snapshots</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Market Search and Live Prices */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center py-3">
              <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Live Price Feed</CardTitle>
              <div className="w-1/3">
                <Input 
                  placeholder="Search pairs..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead className="text-right">Last Price</TableHead>
                    <TableHead className="text-right">24h Volume</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMarket.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-slate-500">No pairs found</TableCell></TableRow>
                  ) : (
                    filteredMarket.map((m, i) => (
                      <TableRow key={i} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedPair(m.trading_pair)}>
                        <TableCell className="font-semibold text-slate-900">{m.trading_pair}</TableCell>
                        <TableCell className="text-right numeric font-bold">${Number(m.price).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-slate-500 numeric">${(Number(m.volume_24h) / 1000000).toFixed(2)}M</TableCell>
                        <TableCell className="text-right">
                          <a href={`/trade?pair=${m.trading_pair.replace('/', '_')}`} className="text-blue-600 font-semibold hover:underline text-sm">
                            Trade
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Market Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Market Analytics</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Pair</TableHead>
                    <TableHead className="text-right">Avg Price</TableHead>
                    <TableHead className="text-right">Trades</TableHead>
                    <TableHead className="text-right">Volatility</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-500">No analytics data</TableCell></TableRow>
                  ) : (
                    analytics.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-slate-500">{new Date(a.recorded_at).toLocaleTimeString()}</TableCell>
                        <TableCell className="font-medium">{a.trading_pair}</TableCell>
                        <TableCell className="text-right numeric">${Number(a.avg_price).toFixed(2)}</TableCell>
                        <TableCell className="text-right numeric">{a.trade_count}</TableCell>
                        <TableCell className="text-right numeric">{Number(a.volatility_index).toFixed(4)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Orderbook Snapshot */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Orderbook Snapshot - {selectedPair}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Asks (Sell) */}
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 text-xs font-semibold text-slate-500 flex justify-between">
                <span>Price</span>
                <span>Qty</span>
              </div>
              <div className="divide-y divide-slate-100 bg-red-50/10">
                {orderbook.asks.length === 0 ? (
                  <div className="p-2 text-center text-xs text-slate-400">No asks</div>
                ) : (
                  [...orderbook.asks].reverse().slice(0, 10).map((ask, i) => (
                    <div key={i} className="px-4 py-1 flex justify-between text-xs">
                      <span className="numeric font-semibold text-red-600">${Number(ask.price).toFixed(2)}</span>
                      <span className="numeric text-slate-600">{Number(ask.quantity)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Bids (Buy) */}
              <div className="bg-slate-50 px-4 py-2 border-y border-slate-100 text-xs font-semibold text-slate-500 flex justify-between">
                <span>Qty</span>
                <span>Price</span>
              </div>
              <div className="divide-y divide-slate-100 bg-green-50/10">
                {orderbook.bids.length === 0 ? (
                  <div className="p-2 text-center text-xs text-slate-400">No bids</div>
                ) : (
                  orderbook.bids.slice(0, 10).map((bid, i) => (
                    <div key={i} className="px-4 py-1 flex justify-between text-xs">
                      <span className="numeric text-slate-600">{Number(bid.quantity)}</span>
                      <span className="numeric font-semibold text-green-600">${Number(bid.price).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
