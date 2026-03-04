# Mahin Enterprise ERP

**Integrated Multi-Factory Hair Processing & Trading ERP System**

> Developed by **Md. Hasibul Hasan**

---

## Overview

Mahin Enterprise ERP is a full-featured enterprise resource planning system built for managing multi-factory hair processing and trading operations. It supports role-based access, factory production tracking, inventory management, supplier/buyer ledger, challans, booking slips, and more.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI Library | shadcn-ui, Tailwind CSS |
| State & Data | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Database | MySQL (via Node.js/Express backend) |
| Auth | JWT / Session-based |
| Mobile | Capacitor (Android/iOS) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9 or higher
- [MySQL](https://dev.mysql.com/downloads/) v8.0 or higher

### Installation

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Fill in your MySQL credentials in .env (see Database Setup below)

# 5. Start the development server
npm run dev
```

App will run at: `http://localhost:8080`

---

## Database Setup (MySQL)

This project uses **MySQL** as the database through a Node.js/Express backend API.

### Step 1 — Install & start MySQL

```sh
# Windows (via installer): https://dev.mysql.com/downloads/installer/
# Or via Chocolatey
choco install mysql

# Start MySQL service
net start MySQL80
```

### Step 2 — Create database

```sql
CREATE DATABASE hairhub_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hairhub_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON hairhub_erp.* TO 'hairhub_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 3 — Core tables (MySQL schema)

```sql
USE hairhub_erp;

-- Users
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  full_name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'factory_manager', 'accountant') NOT NULL DEFAULT 'accountant',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Company settings
CREATE TABLE company_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Factories
CREATE TABLE factories (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  location TEXT,
  manager_id CHAR(36),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers
CREATE TABLE suppliers (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  balance DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parties (Buyers)
CREATE TABLE parties (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  balance DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions
CREATE TABLE transactions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  type ENUM('purchase','sale','payment','receipt','transfer') NOT NULL,
  party_id CHAR(36),
  factory_id CHAR(36),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  created_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Step 4 — Backend API (Node.js/Express)

A backend server is required to bridge the React frontend with MySQL.

```sh
# In a separate folder, set up the API server
mkdir hairhub-api && cd hairhub-api
npm init -y
npm install express mysql2 cors dotenv bcryptjs jsonwebtoken
```

**Sample `.env` for the API server:**

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=hairhub_user
DB_PASSWORD=your_strong_password
DB_NAME=hairhub_erp
JWT_SECRET=your_jwt_secret_key
PORT=3001
```

---

## Environment Variables (Frontend)

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:3001/api
```

---

## Available Scripts

```sh
npm run dev        # Start development server (port 8080)
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run test       # Run tests
```

---

## Project Structure

```
src/
├── components/        # UI components & feature modules
│   ├── modules/       # Feature modules (Challan, Inventory, etc.)
│   └── ui/            # shadcn-ui base components
├── contexts/          # React contexts (Auth, Theme, Language)
├── hooks/             # Custom React hooks
├── integrations/      # Database client integration
├── lib/               # Utilities
└── pages/             # Route pages
```

---

## User Roles

| Role | Access |
|---|---|
| `admin` | Full access to all modules |
| `factory_manager` | Production, inventory, challans |
| `accountant` | Transactions, ledger, reports |

---

## Developer

**Md. Hasibul Hasan**
Full Stack Developer

---

## License

This project is proprietary software developed for **Mahin Enterprise**.
All rights reserved © 2026.
