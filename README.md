# EAA Exchange: Hybrid Cryptocurrency Platform

A high-performance, enterprise-grade cryptocurrency exchange platform built with a hybrid database architecture. This project leverages **Oracle Database** for high-integrity transactional data and **MongoDB** for flexible analytics and system logging.

## 🚀 Key Features

- **Advanced Matching Engine**: Core trading logic (Buy/Sell/Match) implemented directly in Oracle using PL/SQL stored procedures for maximum speed and data integrity.
- **Hybrid Data Management**:
    - **Oracle**: Handles Users, Wallets, Orders, and Trades with strict ACID compliance.
    - **MongoDB**: Manages real-time Market Prices, System Logs, and Analytics.
- **Real-time Portfolio**: Instant balance updates including "Locked" funds for open orders.
- **Modern Trading Terminal**: A sleek React-based interface for placing limit orders and viewing a global order book.
- **Automated Auditing**: Database triggers automatically log all order status changes for compliance and security.

## 🏗 Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS.
- **Backend**: Node.js, Express.
- **Primary Database**: Oracle Database (via `oracledb`).
- **Secondary Database**: MongoDB (via `mongoose`).

## 🛠 Setup & Installation

### 1. Prerequisites
- Node.js (v18+)
- Oracle Database (19c or 21c recommended)
- MongoDB Instance
- Oracle Instant Client (installed and configured)

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
JWT_SECRET=your_jwt_secret
ORACLE_USER=your_user
ORACLE_PASSWORD=your_password
ORACLE_CONNECTION_STRING=localhost:1521/xe
MONGO_URI=your_mongodb_connection_string
```

### 3. Database Initialization
1.  Run `database/oracle-schema.sql` to create the base tables.
2.  Run `database/advanced-logic.sql` to install the stored procedures, functions, and triggers.
3.  (Optional) Run `npm run seed-oracle` to populate initial assets and sample users.

### 4. Installation
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 5. Running the Application
```bash
# Run backend (from root)
npm run dev

# Run frontend (from /frontend)
npm run dev
```

## 📊 Database Objects Overview

- **`reserve_order_funds`**: Stored procedure to atomically lock funds for an order.
- **`match_all_orders`**: The "Sweeping" matching engine that executes trades directly in SQL.
- **`get_available_balance`**: A precise PL/SQL function for real-time spendable balance calculation.
- **`trg_log_order_status`**: Audit trigger for order history.

## 📄 License
This project is licensed under the ISC License.
