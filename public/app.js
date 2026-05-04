const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const orderForm = document.getElementById("order-form");
const sellOrderForm = document.getElementById("sell-order-form");
const marketButton = document.getElementById("market-button");
const portfolioButton = document.getElementById("portfolio-button");

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const showMessage = (element, message, isError = false) => {
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? "#ff9aa8" : "#b7f1c4";
};

const saveAuth = (data) => {
  if (data.token && data.userId) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.userId);
  }
};

const getCurrentUserId = () => localStorage.getItem("userId");

const updateAuthStatus = () => {
  const statusElement = document.getElementById("auth-status");
  const userId = getCurrentUserId();
  if (!statusElement) return;
  if (userId) { fetch(`/api/users/${userId}`, { headers: getAuthHeaders() }).then(res => res.ok ? res.json() : null).then(user => { statusElement.textContent = `Signed in as ${user?.full_name || user?.email || userId}`; }).catch(() => statusElement.textContent = `Signed in as ${userId}`); } else { statusElement.textContent = "Not signed in"; }
};

const updateTraderDisplay = () => {
  const traderElement = document.getElementById("logged-user-id");
  const userId = getCurrentUserId();
  if (!traderElement) return;
  traderElement.textContent = userId ? userId : "Not signed in";
};

const loadOrderPagePortfolio = async () => {
  const portfolioContainer = document.getElementById("order-portfolio");
  const userId = getCurrentUserId();
  const token = localStorage.getItem("token");

  if (!portfolioContainer) return;
  if (!userId || !token) {
    portfolioContainer.innerHTML = `<p class='text-gray-400'>Login to view your wallet balances.</p>`;
    return;
  }

  portfolioContainer.innerHTML = `<p class='text-gray-400'>Loading wallet balances...</p>`;

  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}/portfolio`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load wallet balances.");

    if (!data.portfolio || !data.portfolio.length) {
      portfolioContainer.innerHTML = `<p class='text-gray-400'>No wallet balances found.</p>`;
      return;
    }

    portfolioContainer.innerHTML = data.portfolio
      .map(
        (row) => `
          <div class="mb-3">
            <strong>${row.symbol}</strong> — ${row.assetName || row.symbol}<br />
            Balance: ${row.balance}<br />
            Locked: ${row.lockedBalance}
          </div>`
      )
      .join("");
  } catch (error) {
    portfolioContainer.innerHTML = `<p class='text-red-400'>${error.message}</p>`;
  }
};

const loadUserDetails = async () => {
  const userInfo = document.getElementById("user-info");
  if (!userInfo) return;
  const userId = getCurrentUserId();
  if (!userId) {
    userInfo.innerHTML = `<p class="empty-state">Please login to view your details.</p>`;
    return;
  }
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}/portfolio`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load user details.");
    userInfo.innerHTML = `
      <div class="portfolio-row">
        <strong>User ID:</strong> ${userId}<br />
        <strong>Portfolio:</strong><br />
        ${data.portfolio.map(row => `${row.symbol}: ${row.balance} (Locked: ${row.lockedBalance})`).join('<br />')}
      </div>
    `;
  } catch (error) {
    userInfo.innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
};

const loadAvailableTrades = async () => {
  const tradesList = document.getElementById("trades-list");
  if (!tradesList) return;
  try {
    const res = await fetch("/api/market/prices");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unable to load trades.");
    if (!data.length) {
      tradesList.innerHTML = `<p class="empty-state">No trades available.</p>`;
      return;
    }
    tradesList.innerHTML = data
      .map(
        (trade) => `
          <div class="portfolio-row">
            <strong>${trade.trading_pair}</strong><br />
            Price: ${trade.price}<br />
            Volume 24h: ${trade.volume_24h || "N/A"}
          </div>`
      )
      .join("");
  } catch (error) {
    tradesList.innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
};

const loadBuyOrders = async () => {
  const buyOrdersList = document.getElementById("buy-orders-list");
  if (!buyOrdersList) return;
  try {
    const res = await fetch("/api/market/orderbook?pair=BTC/USDT");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unable to load buy orders.");
    const bids = data.bids || [];
    if (!bids.length) {
      buyOrdersList.innerHTML = `<p class="empty-state">No buy orders available.</p>`;
      return;
    }
    buyOrdersList.innerHTML = bids
      .map(
        (order) => `
          <div class="portfolio-row">
            <strong>Buy Order</strong><br />
            Price: ${order.price}<br />
            Quantity: ${order.quantity}
          </div>`
      )
      .join("");
  } catch (error) {
    buyOrdersList.innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
};

const initAuthTabs = () => {
  const loginTab = document.getElementById("login-tab");
  const registerTab = document.getElementById("register-tab");
  const loginContent = document.getElementById("login-content");
  const registerContent = document.getElementById("register-content");

  if (loginTab && registerTab) {
    loginTab.addEventListener("click", () => {
      loginTab.classList.add("active");
      registerTab.classList.remove("active");
      loginContent.classList.add("active");
      registerContent.classList.remove("active");
    });
    registerTab.addEventListener("click", () => {
      registerTab.classList.add("active");
      loginTab.classList.remove("active");
      registerContent.classList.add("active");
      loginContent.classList.remove("active");
    });
  }
};

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(registerForm);
    const payload = Object.fromEntries(formData.entries());
    const messageEl = document.getElementById("register-message");

    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      saveAuth(data);
      updateAuthStatus();
      showMessage(messageEl, `Success! Logged in as user ${data.userId}`);
      registerForm.reset();
      // Redirect to home
      setTimeout(() => window.location.href = "index.html", 1000);
    } catch (error) {
      showMessage(messageEl, error.message, true);
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const payload = Object.fromEntries(formData.entries());
    const messageEl = document.getElementById("login-message");

    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      saveAuth(data);
      updateAuthStatus();
      showMessage(messageEl, `Login successful. User ID: ${data.userId}`);
      loginForm.reset();
      // Redirect to home
      setTimeout(() => window.location.href = "index.html", 1000);
    } catch (error) {
      showMessage(messageEl, error.message, true);
    }
  });
}

if (orderForm) {
  orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");
    const messageEl = document.getElementById("order-message");

    if (!token) {
      showMessage(messageEl, "Please login first to place an order.", true);
      return;
    }

    const formData = new FormData(orderForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/trade/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order submission failed");

      showMessage(messageEl, "Order placed successfully! It will be matched against available orders.");
      orderForm.reset();
      // Refresh trades and wallet snapshot
      loadAvailableTrades();
      loadOrderPagePortfolio();
    } catch (error) {
      showMessage(messageEl, error.message, true);
    }
  });
}

if (sellOrderForm) {
  sellOrderForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");
    const messageEl = document.getElementById("sell-order-message");

    if (!token) {
      showMessage(messageEl, "Please login first to place a sell order.", true);
      return;
    }

    const formData = new FormData(sellOrderForm);
    const payload = { ...Object.fromEntries(formData.entries()), order_type: "SELL" };

    try {
      const res = await fetch("/api/trade/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sell order submission failed");

      showMessage(messageEl, "Sell order placed successfully!");
      sellOrderForm.reset();
      // Refresh buy orders and wallet snapshot
      loadBuyOrders();
      loadOrderPagePortfolio();
    } catch (error) {
      showMessage(messageEl, error.message, true);
    }
  });
}

if (marketButton) {
  const marketSearchForm = document.getElementById("market-search-form");
  const results = document.getElementById("market-results");

  if (marketSearchForm) {
    marketSearchForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const pairInput = document.getElementById("market-pair");
      if (!pairInput || !pairInput.value) {
        results.textContent = "Enter a trading pair first.";
        return;
      }

      try {
        const res = await fetch(`/api/market/price?pair=${encodeURIComponent(pairInput.value)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not fetch market data.");

        results.innerHTML = `
          <div class="portfolio-row">
            <strong>${data.trading_pair}</strong><br />
            Price: ${data.price}<br />
            Volume 24h: ${data.volume_24h || "N/A"}<br />
            Updated: ${new Date(data.timestamp).toLocaleString() || "-"}
          </div>`;
        loadOrderbook(data.trading_pair);
      } catch (error) {
        results.textContent = error.message;
      }
    });
  }
}

if (portfolioButton) {
  const userIdInput = document.getElementById("portfolio-user-id");
  const savedUserId = getCurrentUserId();
  if (userIdInput && savedUserId) {
    userIdInput.value = savedUserId;
  }

  portfolioButton.addEventListener("click", async () => {
    const userId = userIdInput?.value.trim() || getCurrentUserId();
    const results = document.getElementById("portfolio-results");
    const token = localStorage.getItem("token");

    if (!userId) {
      results.textContent = "Enter your user ID to load portfolio.";
      return;
    }

    if (!token) {
      results.textContent = "Please login before loading your portfolio.";
      return;
    }

    results.textContent = "Loading portfolio...";

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/portfolio`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Could not load portfolio.");

      if (!data.portfolio || !data.portfolio.length) {
        results.innerHTML = `<p>No wallet balances found for user ${userId}.</p>`;
        return;
      }

      results.innerHTML = data.portfolio
        .map(
          (row) => `
            <div class="portfolio-row">
              <strong>${row.symbol}</strong> — ${row.assetName}<br />
              Balance: ${row.balance}<br />
              Locked: ${row.lockedBalance}
            </div>`
        )
        .join("");
    } catch (error) {
      results.textContent = error.message;
    }
  });
}

updateAuthStatus();
updateTraderDisplay();
initAuthTabs();

// Load dynamic content for home and order pages
if (document.getElementById("user-info")) {
  loadUserDetails();
}
if (document.getElementById("trades-list")) {
  loadAvailableTrades();
}
if (document.getElementById("buy-orders-list")) {
  loadBuyOrders();
}
if (document.getElementById("order-portfolio")) {
  loadOrderPagePortfolio();
}

// Load analytics on market page
const loadAnalytics = async () => {
  const analyticsContainer = document.getElementById("analytics-cards");
  if (!analyticsContainer) return;
  
  analyticsContainer.innerHTML = "<p class='text-gray-400'>Loading analytics...</p>";
  
  try {
    const res = await fetch("/api/market/analytics");
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || "Could not load analytics.");
    
    if (!Array.isArray(data) || !data.length) {
      analyticsContainer.innerHTML = `<p class='text-gray-400'>No analytics data available yet.</p>`;
      return;
    }
    
    analyticsContainer.innerHTML = data
      .map(analytics => `
        <div class="portfolio-row">
          <div>
            <strong class='text-cyan-400'>${analytics.trading_pair}</strong><br />
            <span class='text-sm text-gray-400'>Avg Price: ${analytics.avg_price?.toFixed(2) || "N/A"}</span>
          </div>
          <div class='text-right'>
            <div class='text-sm'>Trades: ${analytics.trade_count || 0}</div>
            <div class='text-sm text-gray-400'>Volatility: ${(analytics.volatility_index || 0).toFixed(2)}%</div>
          </div>
        </div>
      `)
      .join("");
  } catch (error) {
    analyticsContainer.innerHTML = `<p class='text-gray-400'>${error.message}</p>`;
  }
};

if (document.getElementById("analytics-cards")) {
  loadAnalytics();
}

// Load Live Price Feed
const loadLivePrices = async () => {
  const marketTable = document.getElementById("market-table");
  if (!marketTable) return;

  marketTable.innerHTML = "<p class='text-gray-400'>Loading live prices...</p>";

  try {
    const res = await fetch("/api/market/prices");
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Could not load prices.");

    if (!Array.isArray(data) || !data.length) {
      marketTable.innerHTML = `<p class='text-gray-400'>No live market data available yet.</p>`;
      return;
    }

    marketTable.innerHTML = data
      .map(
        (trade) => `
          <div class="market-row cursor-pointer" onclick="document.getElementById('market-pair').value='${trade.trading_pair}'; document.getElementById('market-button').click();">
            <div>
              <strong class="text-cyan-400 text-lg">${trade.trading_pair}</strong>
              <div class="text-xs text-gray-400">Vol 24h: ${(trade.volume_24h || 0).toLocaleString()}</div>
            </div>
            <div class="text-right">
              <div class="font-bold text-lg">$${Number(trade.price).toFixed(2)}</div>
              <div class="text-xs text-emerald-400">Active</div>
            </div>
          </div>`
      )
      .join("");
  } catch (error) {
    marketTable.innerHTML = `<p class='text-red-400'>${error.message}</p>`;
  }
};

if (document.getElementById("market-table")) {
  loadLivePrices();
  // Auto refresh every 10 seconds
  setInterval(loadLivePrices, 10000);
}

// Global Orderbook function used by the search form
window.loadOrderbook = async function(pair = "BTC/USDT") {
  const container = document.getElementById("orderbook-section");
  if (!container) return;

  container.innerHTML = `<p class='text-gray-400'>Loading order book for ${pair}...</p>`;

  try {
    const res = await fetch(`/api/market/orderbook?pair=${encodeURIComponent(pair)}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || `Could not load order book for ${pair}.`);

    const bids = data.bids || [];
    const asks = data.asks || [];

    if (!bids.length && !asks.length) {
      container.innerHTML = `<p class='text-gray-400'>Order book is empty for ${pair}.</p>`;
      return;
    }

    const renderRows = (orders, isAsk) => {
      return orders.slice(0, 5).map(o => `
        <div class="flex justify-between text-sm py-1">
          <span class="${isAsk ? 'text-red-400' : 'text-emerald-400'}">${o.price.toFixed(2)}</span>
          <span class="text-gray-300">${o.quantity.toFixed(4)}</span>
        </div>
      `).join("");
    };

    container.innerHTML = `
      <div class="mb-2 text-center text-gray-400 text-sm">Selling (Asks)</div>
      <div class="flex justify-between text-xs text-gray-500 mb-1 border-b border-white/10 pb-1">
        <span>Price</span><span>Quantity</span>
      </div>
      <div class="mb-4">
        ${asks.length ? renderRows(asks, true) : '<div class="text-center text-sm py-2">No asks</div>'}
      </div>
      
      <div class="mb-2 text-center text-gray-400 text-sm">Buying (Bids)</div>
      <div class="flex justify-between text-xs text-gray-500 mb-1 border-b border-white/10 pb-1">
        <span>Price</span><span>Quantity</span>
      </div>
      <div>
        ${bids.length ? renderRows(bids, false) : '<div class="text-center text-sm py-2">No bids</div>'}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<p class='text-red-400'>${error.message}</p>`;
  }
};

// Initial load for BTC/USDT if orderbook exists
if (document.getElementById("orderbook-section")) {
  window.loadOrderbook("BTC/USDT");
}
