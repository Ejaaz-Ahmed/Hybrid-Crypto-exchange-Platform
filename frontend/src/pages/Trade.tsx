import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function Trade() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPair = (searchParams.get('pair') || 'BTC_USDT').replace('_', '/');
  
  const [tradingPair, setTradingPair] = useState(initialPair);
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [orderbook, setOrderbook] = useState<{ bids: any[], asks: any[] }>({ bids: [], asks: [] });
  const [suggestedPairs, setSuggestedPairs] = useState<any[]>([]);

  const fetchOrderbook = async (pair: string) => {
    try {
      const res = await api.get(`/market/orderbook?pair=${pair}`);
      setOrderbook(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSuggested = async () => {
    try {
      const res = await api.get('/market/prices');
      setSuggestedPairs(Array.isArray(res.data) ? res.data.slice(0, 4) : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOrderbook(tradingPair);
    fetchSuggested();
    const interval = setInterval(() => fetchOrderbook(tradingPair), 5000);
    return () => clearInterval(interval);
  }, [tradingPair]);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const userId = localStorage.getItem('userId');
    try {
      const res = await api.post('/trade/order', {
        user_id: Number(userId),
        trading_pair: tradingPair,
        order_type: orderType,
        price: Number(price),
        quantity: Number(quantity)
      });
      setMessage({ type: 'success', text: `Order placed! ID: ${res.data.orderId}` });
      setPrice('');
      setQuantity('');
      fetchOrderbook(tradingPair); // refresh immediately
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Order failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-12">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trading Terminal</h1>
        <p className="text-sm text-slate-500">Advanced order entry and global order book</p>
      </div>

      {/* Order Entry Form */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Suggested Pairs Widget */}
        <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
          {suggestedPairs.map(p => (
            <button
              key={p.trading_pair}
              onClick={() => {
                setTradingPair(p.trading_pair);
                setSearchParams({ pair: p.trading_pair.replace('/', '_') });
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-sm border whitespace-nowrap transition-colors ${tradingPair === p.trading_pair ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {p.trading_pair}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-semibold rounded-sm transition-colors ${orderType === 'BUY' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                onClick={() => setOrderType('BUY')}
              >
                BUY
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-semibold rounded-sm transition-colors ${orderType === 'SELL' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                onClick={() => setOrderType('SELL')}
              >
                SELL
              </button>
            </div>
            <Input 
              label="Trading Pair" 
              value={tradingPair} 
              onChange={(e) => {
                setTradingPair(e.target.value.toUpperCase());
                setSearchParams({ pair: e.target.value.toUpperCase().replace('/', '_') });
              }}
              placeholder="BTC/USDT" 
            />
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrade} className="space-y-4">
              <Input 
                label="Price (USD)" 
                type="number" 
                step="0.01" 
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required 
              />
              <Input 
                label="Quantity" 
                type="number" 
                step="0.0001" 
                min="0.0001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required 
              />
              
              <div className="pt-2">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Estimated Total:</span>
                  <span className="font-mono text-slate-900">
                    ${(Number(price) * Number(quantity) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <Button 
                  type="submit" 
                  className={`w-full ${orderType === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : `Place ${orderType} Order`}
                </Button>
              </div>

              {message.text && (
                <div className={`mt-4 p-3 text-sm border ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                  {message.text}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Order Book */}
      <div className="lg:col-span-8">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-sm uppercase text-slate-500 tracking-wider">Global Order Book - {tradingPair}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Bids */}
            <div className="flex-1">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 text-xs font-semibold text-slate-500 flex justify-between">
                <span>Qty</span>
                <span>Bid Price</span>
              </div>
              <div className="divide-y divide-slate-100">
                {orderbook.bids.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No bids</div>
                ) : (
                  orderbook.bids.map((bid: any, i: number) => (
                    <div key={i} className="px-4 py-1.5 flex justify-between text-sm hover:bg-green-50/50 cursor-pointer" onClick={() => setPrice(bid.price)}>
                      <span className="numeric text-slate-600">{Number(bid.quantity) - Number(bid.filled_quantity)}</span>
                      <span className="numeric font-semibold text-green-600">${Number(bid.price).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Asks */}
            <div className="flex-1">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 text-xs font-semibold text-slate-500 flex justify-between">
                <span>Ask Price</span>
                <span>Qty</span>
              </div>
              <div className="divide-y divide-slate-100">
                {orderbook.asks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No asks</div>
                ) : (
                  orderbook.asks.map((ask: any, i: number) => (
                    <div key={i} className="px-4 py-1.5 flex justify-between text-sm hover:bg-red-50/50 cursor-pointer" onClick={() => setPrice(ask.price)}>
                      <span className="numeric font-semibold text-red-600">${Number(ask.price).toFixed(2)}</span>
                      <span className="numeric text-slate-600">{Number(ask.quantity) - Number(ask.filled_quantity)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
