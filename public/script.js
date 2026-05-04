// script.js - Dynamic frontend logic

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  if (!token || !userId) {
    window.location.href = '/auth.html';
    return;
  }

  const SYMBOL_ALIASES = {
    BITCOIN: 'BTC',
    ETHEREUM: 'ETH',
    SOLANA: 'SOL',
    BINANCECOIN: 'BNB',
    CARDANO: 'ADA',
    POLYGON: 'MATIC',
    CHAINLINK: 'LINK',
    POLKADOT: 'DOT',
    TETHER: 'USDT',
  };

  const normalizeSymbol = (value) => {
    const symbol = String(value || '').trim().toUpperCase();
    return SYMBOL_ALIASES[symbol] || symbol;
  };

  const formatCurrency = (value) => {
    const number = Number(value) || 0;
    return `$${number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculatePortfolioValue = (portfolio = [], prices = []) => {
    const priceMap = new Map();

    for (const trade of prices) {
      const [baseSymbol] = String(trade?.trading_pair || '').split('/');
      const normalizedBase = normalizeSymbol(baseSymbol);
      const numericPrice = Number(trade?.price);
      if (normalizedBase && Number.isFinite(numericPrice) && numericPrice > 0) {
        priceMap.set(normalizedBase, numericPrice);
      }
    }

    return portfolio.reduce((total, asset) => {
      const symbol = normalizeSymbol(asset?.symbol);
      const quantity = Number(asset?.balance || 0) + Number(asset?.lockedBalance || 0);
      if (!quantity) return total;

      if (symbol === 'USDT' || symbol === 'USD') {
        return total + quantity;
      }

      const directPrice = priceMap.get(symbol);
      if (directPrice) {
        return total + quantity * directPrice;
      }

      return total;
    }, 0);
  };

  async function loadUserData() {
    try {
      const [userResponse, portfolioResponse, ordersResponse, tradesResponse] = await Promise.all([
        fetch(`/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/users/${userId}/portfolio`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/trade/orders/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/market/prices', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const user = await userResponse.json();
      const portfolioData = await portfolioResponse.json();
      const orders = await ordersResponse.json();
      const trades = await tradesResponse.json();

      const userNameEl = document.getElementById('user-name');
      const userEmailEl = document.getElementById('user-email');
      const userCountryEl = document.getElementById('user-country');
      const userInfoEl = document.getElementById('user-info');
      const portfolioEl = document.getElementById('portfolio');
      const ordersEl = document.getElementById('orders');
      const tradesEl = document.getElementById('trades-list');
      const totalValueEl = document.getElementById('total-value');
      const dayChangeEl = document.getElementById('24h-change');

      if (userResponse.ok) {
        if (userNameEl) userNameEl.textContent = user.full_name || '-';
        if (userEmailEl) userEmailEl.textContent = user.email || '-';
        if (userCountryEl) userCountryEl.textContent = user.country || '-';
      } else if (userInfoEl) {
        userInfoEl.innerHTML = '<p>Error loading user information</p>';
      }

      const portfolio = portfolioResponse.ok ? (portfolioData.portfolio || []) : [];
      if (portfolioEl) {
        if (portfolio.length > 0) {
          portfolioEl.innerHTML = portfolio.map((p) => `
            <div class="portfolio-row">
              <span>${p.symbol}</span>
              <span>${p.balance}</span>
            </div>
          `).join('');
        } else {
          portfolioEl.innerHTML = '<p>No portfolio data available</p>';
        }
      }

      if (ordersEl) {
        if (ordersResponse.ok && Array.isArray(orders) && orders.length > 0) {
          window.currentUserOrders = orders;
          const filterEl = document.getElementById('order-status-filter');
          window.renderOrders(filterEl ? filterEl.value : 'ALL');
        } else {
          window.currentUserOrders = [];
          ordersEl.innerHTML = '<p class="text-gray-400">No orders available</p>';
        }
      }

      if (tradesEl) {
        if (tradesResponse.ok && Array.isArray(trades) && trades.length > 0) {
          tradesEl.innerHTML = trades.map((trade) => `
            <div class="portfolio-row">
              <span><strong>${trade.trading_pair}</strong></span>
              <span>$${Number(trade.price || 0).toFixed(2)}</span>
              <span class="volume">24h Vol: $${(Number(trade.volume_24h || 0) / 1000000).toFixed(2)}M</span>
            </div>
          `).join('');
        } else {
          tradesEl.innerHTML = '<p>No market data available</p>';
        }
      }

      const totalValue = (tradesResponse.ok && portfolioResponse.ok)
        ? calculatePortfolioValue(portfolio, Array.isArray(trades) ? trades : [])
        : 0;
      if (totalValueEl) totalValueEl.textContent = formatCurrency(totalValue);
      if (dayChangeEl) dayChangeEl.textContent = '+0.00';
    } catch (error) {
      console.error('Error loading user data:', error);
      const userInfoEl = document.getElementById('user-info');
      const portfolioEl = document.getElementById('portfolio');
      const ordersEl = document.getElementById('orders');
      const tradesEl = document.getElementById('trades-list');
      if (userInfoEl) userInfoEl.innerHTML = '<p>Error loading user information</p>';
      if (portfolioEl) portfolioEl.innerHTML = '<p>Error loading portfolio</p>';
      if (ordersEl) ordersEl.innerHTML = '<p>Error loading orders</p>';
      if (tradesEl) tradesEl.innerHTML = '<p>Error loading market data</p>';
    }
  }

  loadUserData();

  const logoutButton = document.getElementById('logout');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      window.location.href = '/auth.html';
    });
  }

  const orderForm = document.getElementById('order-form');
  if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(orderForm);
      const payload = {
        trading_pair: formData.get('trading_pair'),
        order_type: formData.get('order_type'),
        price: Number(formData.get('price')),
        quantity: Number(formData.get('quantity')),
      };
      const messageEl = document.getElementById('order-message');

      try {
        const response = await fetch('/api/trade/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (response.ok) {
          if (messageEl) {
            messageEl.textContent = 'Order placed successfully!';
            messageEl.style.color = 'green';
          }
          loadUserData();
        } else if (messageEl) {
          messageEl.textContent = result.error || result.message || 'Order failed';
          messageEl.style.color = 'red';
        }
      } catch (error) {
        if (messageEl) {
          messageEl.textContent = `Error: ${error.message}`;
          messageEl.style.color = 'red';
        }
      }
    });
  }

  const depositForm = document.getElementById('deposit-form');
  if (depositForm) {
    depositForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(depositForm);
      const payload = {
        symbol: String(formData.get('symbol') || '').trim().toUpperCase(),
        amount: Number(formData.get('amount')),
      };
      const messageEl = document.getElementById('deposit-message');

      try {
        const response = await fetch(`/api/users/${userId}/deposit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (response.ok) {
          if (messageEl) {
            messageEl.textContent = 'Deposit successful!';
            messageEl.style.color = 'green';
          }
          loadUserData();
        } else if (messageEl) {
          messageEl.textContent = result.error || result.message || 'Deposit failed';
          messageEl.style.color = 'red';
        }
      } catch (error) {
        if (messageEl) {
          messageEl.textContent = `Error: ${error.message}`;
          messageEl.style.color = 'red';
        }
      }
    });
  }

  const withdrawForm = document.getElementById('withdraw-form');
  if (withdrawForm) {
    withdrawForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(withdrawForm);
      const payload = {
        symbol: String(formData.get('symbol') || '').trim().toUpperCase(),
        amount: Number(formData.get('amount')),
      };
      const messageEl = document.getElementById('withdraw-message');

      try {
        const response = await fetch(`/api/users/${userId}/withdraw`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (response.ok) {
          if (messageEl) {
            messageEl.textContent = 'Withdrawal successful!';
            messageEl.style.color = 'green';
          }
          loadUserData();
        } else if (messageEl) {
          messageEl.textContent = result.error || result.message || 'Withdrawal failed';
          messageEl.style.color = 'red';
        }
      } catch (error) {
        if (messageEl) {
          messageEl.textContent = `Error: ${error.message}`;
          messageEl.style.color = 'red';
        }
      }
    });
  }
});

window.currentUserOrders = [];

window.renderOrders = function(filter = 'ALL') {
  const ordersEl = document.getElementById('orders');
  if (!ordersEl) return;

  const orders = window.currentUserOrders;
  if (!orders || orders.length === 0) {
    ordersEl.innerHTML = '<p class="text-gray-400">No orders available</p>';
    return;
  }

  const filteredOrders = orders.filter(o => {
    if (filter === 'ALL') return true;
    if (filter === 'OPEN') return o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED';
    if (filter === 'FILLED') return o.status === 'FILLED' || o.status === 'CANCELLED';
    return true;
  });

  if (filteredOrders.length === 0) {
    ordersEl.innerHTML = '<p class="text-gray-400 text-sm italic">No orders match the selected filter.</p>';
    return;
  }

  const buyOrders = filteredOrders.filter(o => o.order_type === 'BUY');
  const sellOrders = filteredOrders.filter(o => o.order_type === 'SELL');

  const renderOrderRow = (o) => `
    <div class="portfolio-row">
      <span>${o.trading_pair}</span>
      <span class="${o.order_type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'} font-semibold">${o.order_type}</span>
      <span>$${o.price}</span>
      <span>${o.filled_quantity || 0} / ${o.quantity}</span>
      <span class="${o.status === 'PARTIALLY_FILLED' ? 'text-yellow-400' : (o.status === 'FILLED' ? 'text-emerald-400' : 'text-cyan-400')} font-medium">${o.status}</span>
    </div>
  `;

  let html = '';
  
  if (buyOrders.length > 0) {
    html += '<h3 class="text-emerald-400 text-sm font-semibold mb-3 mt-2 uppercase tracking-wider border-b border-white/10 pb-2">Buy Orders</h3>';
    html += buyOrders.map(renderOrderRow).join('');
  }
  
  if (sellOrders.length > 0) {
    html += '<h3 class="text-rose-400 text-sm font-semibold mb-3 mt-6 uppercase tracking-wider border-b border-white/10 pb-2">Sell Orders</h3>';
    html += sellOrders.map(renderOrderRow).join('');
  }

  ordersEl.innerHTML = html;
};

document.addEventListener('DOMContentLoaded', () => {
  const filterEl = document.getElementById('order-status-filter');
  if (filterEl) {
    filterEl.addEventListener('change', (e) => {
      if (window.renderOrders) {
        window.renderOrders(e.target.value);
      }
    });
  }
});
