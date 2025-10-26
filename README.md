# 🧠 Cerebrix - The Brain of Multi-Chain AI

> **Multi-chain AI agent marketplace with autonomous execution and cross-chain bridging**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)](https://soliditylang.org/)
[![Node](https://img.shields.io/badge/Node-v20+-green)](https://nodejs.org/)
[![Avail Nexus](https://img.shields.io/badge/Avail-Nexus%20SDK-purple)](https://www.availproject.org/)

## 🎯 Overview

**Cerebrix** is a multi-chain AI agent marketplace that brings intelligent automation to Web3. Developers can deploy autonomous agents that execute strategies across **5 testnets**—all without manual intervention or complex bridging flows.

### 🏆 Built for ETHGlobal 2025

Integrating cutting-edge Web3 infrastructure:
- **Avail Nexus SDK** - Automatic cross-chain bridging with Intent #1263 verified
- **Pyth Network** - Real-time price feeds (sub-200ms latency) for trading strategies
- **Blockscout** - Transaction explorer links in all notifications
- **Alchemy Premium RPC** - Multi-chain event listening across 5 simultaneous testnets

### ✨ Key Features

- 🌉 **Bridge & Execute** - Automatic cross-chain bridging via Avail Nexus SDK
- 🤖 **3 Execution Models** - Templates, Custom Endpoints, or AI-Powered
- 💰 **Monetizable** - Creators earn fees when people use their agents
- 📊 **Real-Time Data** - Pyth Network price feeds for momentum strategies
- 🔗 **Multi-Chain Native** - Sepolia, Arbitrum, Base, Optimism, Polygon Amoy
- � **Transparent** - Blockscout explorer links in all transaction notifications

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Frontend (React 19 + TypeScript + Vite)           │
│     wagmi v2 • RainbowKit • Avail Nexus SDK • Tailwind     │
├─────────────────────────────────────────────────────────────┤
│          Backend (Node.js + Express + TypeScript)           │
│     ethers.js v6 • OpenAI API • Pyth Hermes • Prisma       │
├──────────┬──────────┬──────────┬──────────┬───────────────┤
│  Smart   │  Avail   │   Pyth   │Blockscout│   Alchemy     │
│Contracts │  Nexus   │ Network  │ Explorer │  Premium RPC  │
│(Solidity)│   SDK    │  Hermes  │  Links   │  Multi-Chain  │
└──────────┴──────────┴──────────┴──────────┴───────────────┘
```


## 📦 Project Structure

```
cerebrix/
├── contracts/                    # Foundry smart contracts
│   ├── src/
│   │   ├── AgentRegistry.sol    # Agent registration & metadata
│   │   ├── PaymentProcessor.sol # USDC payment handling
│   │   └── interfaces/          # Contract interfaces
│   ├── test/                    # Solidity tests
│   ├── script/                  # Deployment scripts
│   └── foundry.toml             # Foundry configuration
│
├── backend/                      # Node.js Express API
│   ├── src/
│   │   ├── routes/              # API endpoints
│   │   │   ├── agent.routes.ts  # Agent CRUD operations
│   │   │   └── health.routes.ts # Health checks
│   │   ├── services/
│   │   │   ├── ai.service.ts    # OpenAI integration
│   │   │   └── pyth.service.ts  # Pyth Network price feeds
│   │   ├── listeners/           # Event listeners
│   │   │   └── agentExecuted.listener.ts
│   │   └── server.ts            # Express app setup
│   ├── prisma/
│   │   └── schema.prisma        # Database schema
│   └── package.json
│
├── frontend/                     # React 19 + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── SmartChainSelector.tsx  # Multi-chain UX
│   │   │   ├── AgentCard.tsx           # Agent display
│   │   │   ├── AllowanceModal.tsx      # Nexus SDK modals
│   │   │   └── IntentModal.tsx         # Nexus SDK modals
│   │   ├── pages/
│   │   │   ├── HomePage.tsx            # Marketplace
│   │   │   ├── AgentDetailPage.tsx     # Agent execution
│   │   │   └── CreateAgentPage.tsx     # Agent creation
│   │   ├── providers/
│   │   │   └── NexusProvider.tsx       # Avail Nexus SDK context
│   │   ├── lib/
│   │   │   └── nexus.ts                # Nexus SDK instance
│   │   ├── config/
│   │   │   ├── wagmi.ts                # wagmi v2 + RainbowKit
│   │   │   └── deployments.ts          # Contract addresses
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
│
├── .env.example                  # Environment template
├── quick-start.sh               # One-command setup script
└── README.md                    # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20+ ([Download](https://nodejs.org/))
- **npm** v9+ (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **MetaMask** or compatible Web3 wallet

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/BahadorGh/Cerebrix.git
cd Cerebrix

# Install all dependencies (contracts + backend + frontend)
npm install
```

### 2. Environment Setup

#### Frontend `.env`

Create `frontend/.env`:

```bash
# WalletConnect Project ID (get from https://cloud.walletconnect.com)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Smart Contract Addresses (deployed on all 5 testnets)
VITE_AGENT_REGISTRY_ADDRESS=0xYourAgentRegistryAddress
VITE_PAYMENT_PROCESSOR_ADDRESS=0xYourPaymentProcessorAddress

# Backend API
VITE_API_BASE_URL=http://localhost:3001

# Alchemy Premium RPC URLs (get from https://www.alchemy.com/)
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
VITE_ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY
VITE_BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY
VITE_OPTIMISM_SEPOLIA_RPC_URL=https://opt-sepolia.g.alchemy.com/v2/YOUR_API_KEY
VITE_POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
```

#### Backend `.env`

Create `backend/.env`:

```bash
# Server
PORT=3001

# Database (SQLite for development)
DATABASE_URL=file:./dev.db

# OpenAI API (get from https://platform.openai.com/)
OPENAI_API_KEY=sk-your-openai-api-key

# Alchemy RPC URLs (same as frontend)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY
OPTIMISM_SEPOLIA_RPC_URL=https://opt-sepolia.g.alchemy.com/v2/YOUR_API_KEY
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY

# Smart Contract Addresses (same as frontend)
AGENT_REGISTRY_ADDRESS=0xYourAgentRegistryAddress
PAYMENT_PROCESSOR_ADDRESS=0xYourPaymentProcessorAddress
```

#### Contracts `.env`

Create `contracts/.env`:

```bash
# Deployer private key (DO NOT commit this!)
PRIVATE_KEY=your_private_key_here

# Alchemy API key
ALCHEMY_API_KEY=your_alchemy_api_key

# Etherscan API keys (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
BASESCAN_API_KEY=your_basescan_api_key
OPTIMISM_ETHERSCAN_API_KEY=your_optimism_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

### 3. Deploy Smart Contracts (Optional)

**Note:** Contracts are already deployed on all 5 testnets. Skip this if you're using existing deployments.

```bash
# Install Foundry (if not installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Compile contracts
cd contracts
forge build

# Run tests
forge test

# Deploy to Sepolia (example)
forge script script/DeployMultiChain.s.sol:DeployMultiChain \
  --rpc-url sepolia \
  --broadcast \
  --verify

# Repeat for other chains: arbitrum-sepolia, base-sepolia, optimism-sepolia, polygon-amoy
```

**Deployed Addresses:**
```
Sepolia:
- AgentRegistry: 0x...
- PaymentProcessor: 0x...

Arbitrum Sepolia:
- AgentRegistry: 0x...
- PaymentProcessor: 0x...

Base Sepolia:
- AgentRegistry: 0x...
- PaymentProcessor: 0x...

Optimism Sepolia:
- AgentRegistry: 0x...
- PaymentProcessor: 0x...

Polygon Amoy:
- AgentRegistry: 0x...
- PaymentProcessor: 0x...
```

### 4. Setup Database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma db push

# (Optional) Seed with sample agents
npx prisma db seed
```

### 5. Run the Application

#### Option A: Quick Start Script (Recommended)

```bash
# From project root
./quick-start.sh
```

This will:
1. Start backend server on `http://localhost:3001`
2. Start frontend dev server on `http://localhost:5173`
3. Open browser automatically

#### Option B: Manual Start

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 6. Get Testnet Tokens

You'll need testnet USDC on at least one chain to execute agents:

**Sepolia:**
1. Get ETH: https://sepoliafaucet.com/
2. Get USDC: https://faucet.circle.com/ (select Sepolia)(Currently on testnet USDC addresses are very different - get some from teh Avail team if needed)

**Arbitrum Sepolia:**
1. Get ETH: https://www.alchemy.com/faucets/arbitrum-sepolia
2. Bridge USDC from Sepolia using Avail Nexus (built into Cerebrix!)

**Base Sepolia:**
1. Get ETH: https://www.alchemy.com/faucets/base-sepolia
2. Bridge USDC from Sepolia using Avail Nexus

**Optimism Sepolia:**
1. Get ETH: https://www.alchemy.com/faucets/optimism-sepolia
2. Bridge USDC from Sepolia using Avail Nexus

**Polygon Amoy:**
1. Get MATIC: https://faucet.polygon.technology/
2. Bridge USDC from Sepolia using Avail Nexus

### 7. Use the Application

1. **Connect Wallet** - Click "Connect Wallet" in top-right
2. **Browse Agents** - Explore the marketplace on homepage
3. **Execute Agent**:
   - Click any agent card
   - Use Smart Chain Selector to choose best chain
   - Approve USDC payment
   - Execute agent
   - Watch Avail Nexus bridge automatically if needed!
4. **Create Agent** (optional):
   - Click "Create Agent" in navigation
   - Choose execution model (Template/Custom/AI)
   - Set price and deploy
   - Earn fees when others use your agent

## 🧪 Testing

```bash
# Smart contract tests
cd contracts
forge test -vvv

# Backend tests (if available)
cd backend
npm test

# Frontend tests (if available)
cd frontend
npm test
```

## 🔧 Troubleshooting

### Nexus SDK not initializing

**Problem:** "Nexus SDK is not initialized yet"

**Solution:**
1. Disconnect wallet and reconnect
2. Ensure you're on a supported testnet
3. Check browser console for errors
4. Clear cache and reload

### No USDC balance shown

**Problem:** Smart Chain Selector shows 0 USDC everywhere

**Solution:**
1. Get USDC from Circle faucet (Sepolia)
2. Wait 30 seconds for Nexus SDK to fetch balances
3. Check Nexus Explorer: https://explorer.nexus-folly.availproject.org/

### Transaction fails

**Problem:** Execute transaction reverts

**Solution:**
1. Check you have enough ETH for gas
2. Check USDC allowance (approve first)
3. Verify agent price is correct
4. Check backend logs for errors

### Backend not connecting

**Problem:** Frontend shows API errors

**Solution:**
1. Ensure backend is running on port 3001
2. Check `.env` has correct RPC URLs
3. Check Alchemy API key is valid
4. Restart backend: `cd backend && npm run dev`

## 📚 Documentation

### Smart Contracts

**AgentRegistry.sol:**
- `registerAgent()` - Create new agent
- `executeAgent()` - Execute agent strategy
- `updateAgent()` - Update metadata
- `getAgent()` - Fetch agent data

**PaymentProcessor.sol:**
- `processPayment()` - Handle USDC payments
- `withdrawEarnings()` - Creators withdraw fees
- `getPlatformFees()` - Query accumulated fees

### API Endpoints

**GET /api/agents**
- Fetch all agents with metadata

**GET /api/agents/:id**
- Fetch single agent details

**POST /api/agents**
- Create new agent (stores in database)

**POST /api/agents/:id/execute**
- Trigger agent execution logic

**GET /api/health**
- Health check endpoint

### Pyth Network Integration

```typescript
import { getPrices } from './services/pyth.service';

// Fetch real-time prices
const prices = await getPrices(['BTC/USD', 'ETH/USD']);
console.log(prices.get('BTC/USD')); // { price: 111858, conf: 50, expo: -8, publishTime: 1234567890 }
```

### Avail Nexus SDK Usage

```typescript
import { useNexus } from './providers/NexusProvider';

const { nexusSdk, isInitialized } = useNexus();

// Get unified balances across all chains
const balances = await nexusSdk.getUnifiedBalances();

// Bridge & Execute (handled automatically in Cerebrix)
// User just selects target chain, Nexus SDK handles bridging
```

## 🏆 ETHGlobal Prize Integrations

### 🟣 Avail Nexus SDK
**How we use it:** Automatic cross-chain bridging for agent execution. When users execute agents on chains where they lack USDC, Nexus SDK bridges funds and executes in one transaction flow.

**Proof:** Intent #1263 on Nexus Explorer - 3 USDC bridged from Sepolia to Arbitrum Sepolia
- Explorer: https://explorer.nexus-folly.availproject.org/intent/1263
- Code: `frontend/src/providers/NexusProvider.tsx`, `frontend/src/lib/nexus.ts`

### 📊 Blockscout
**How we use it:** Transaction transparency via `@blockscout/app-sdk`. All approval and execution transactions show toast notifications with direct explorer links.

**Proof:** Check any transaction notification in the app
- Code: `frontend/src/pages/AgentDetailPage.tsx` (lines 439-457)
- Integration: `useTransactionPopup` hook for toast notifications

### 💰 Pyth Network
**How we use it:** Real-time price feeds for momentum trading strategy. BTC/USD, ETH/USD, SOL/USD feeds with sub-200ms latency power our template strategies.

**Proof:** BTC Momentum Strategy uses live Pyth data
- Code: `backend/src/services/pyth.service.ts`, `backend/src/services/ai.service.ts`
- API: Hermes API at `https://hermes.pyth.network`

## 🌐 Supported Chains

| Chain                | Chain ID | Explorer                                           | Status     |
| -------------------- | -------- | -------------------------------------------------- | ---------- |
| **Ethereum Sepolia** | 11155111 | [Etherscan](https://sepolia.etherscan.io)          | ✅ Deployed |
| **Arbitrum Sepolia** | 421614   | [Arbiscan](https://sepolia.arbiscan.io)            | ✅ Deployed |
| **Base Sepolia**     | 84532    | [Basescan](https://sepolia.basescan.org)           | ✅ Deployed |
| **Optimism Sepolia** | 11155420 | [Etherscan](https://sepolia-optimism.etherscan.io) | ✅ Deployed |
| **Polygon Amoy**     | 80002    | [PolygonScan](https://amoy.polygonscan.com)        | ✅ Deployed |

## 📖 Learn More

### How Agents Work

**1. Template Strategies**
Pre-built strategies like "BTC Momentum":
- Backend fetches Pyth price feeds every 30 seconds
- AI analyzes momentum (BUY if price rising, SELL if falling)
- Agent auto-executes on user's chosen chain

**2. Custom Endpoints**
Developers provide their own HTTP endpoint:
- Agent calls your API: `POST https://your-api.com/execute`
- Your server returns decision: `{ action: "execute", params: {...} }`
- Agent executes on-chain based on your logic

**3. Platform Default (AI-Powered)**
Natural language instructions:
- User: "Execute when BTC > $100k"
- OpenAI interprets instruction + market data
- Agent executes autonomously when conditions met

### Revenue Model

**For Creators:**
- Set execution price (e.g., 5 USDC per execution)
- Set revenue share (0-90%, default 70% to creator)
- Withdraw earnings anytime via `PaymentProcessor.withdrawEarnings()`

**For Platform:**
- Takes 30% platform fee (configurable)
- Funds infrastructure and development
- Transparent on-chain accounting

## 🔐 Security

- ✅ OpenZeppelin contracts (Ownable, ReentrancyGuard, Pausable)
- ✅ Comprehensive Foundry tests
- ✅ No private keys in code (environment variables only)
- ✅ Safe ERC20 transfers with `SafeERC20`
- ✅ Access control on all admin functions

## 🚢 Deployment (Making it Live)

### Option 1: Deploy to Vercel (Frontend) + Render (Backend)

**Frontend (Vercel):**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
cd frontend
vercel --prod

# Set environment variables in Vercel dashboard:
# - VITE_WALLETCONNECT_PROJECT_ID
# - VITE_AGENT_REGISTRY_ADDRESS
# - VITE_PAYMENT_PROCESSOR_ADDRESS
# - VITE_API_BASE_URL (your backend URL)
# - All 5 VITE_*_RPC_URL variables
```

**Backend (Render):**
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npm start`
5. Add environment variables (same as `.env`)
6. Deploy!

### Option 2: Deploy to Railway (Full Stack)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy backend
cd backend
railway up

# Deploy frontend
cd ../frontend
railway up

# Get URLs from Railway dashboard
```

### Option 3: Deploy to Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Backend
cd backend
fly launch
fly deploy

# Frontend
cd ../frontend
fly launch
fly deploy
```

### Quick Deploy Script

```bash
#!/bin/bash
# deploy-live.sh

echo "🚀 Deploying Cerebrix to production..."

# Backend
cd backend
echo "📦 Building backend..."
npm run build
echo "🚢 Deploying backend to Render..."
# Add your Render deploy command here

# Frontend  
cd ../frontend
echo "📦 Building frontend..."
npm run build
echo "🚢 Deploying frontend to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🌐 Frontend: https://your-app.vercel.app"
echo "🔌 Backend: https://your-api.onrender.com"
```

### Environment Variables for Production

**Frontend (Vercel):**
- Use production RPC URLs (not testnet Alchemy)
- Set `VITE_API_BASE_URL` to your backend URL
- Add your production contract addresses

**Backend (Render/Railway):**
- Set `DATABASE_URL` to production database (PostgreSQL recommended)
- Use production OpenAI API key with billing enabled
- Set `NODE_ENV=production`
- Configure CORS to allow your frontend domain

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Contact & Links

- **GitHub:** [@BahadorGh](https://github.com/BahadorGh)
- **Project:** [Cerebrix](https://github.com/BahadorGh/Cerebrix)
- **Demo:** [Live Demo](https://your-demo-url.vercel.app) (coming soon)
- **ETHGlobal:** [Project Submission](https://ethglobal.com/showcase/cerebrix-xxxxx)

## 🙏 Acknowledgments

Built with amazing Web3 infrastructure:
- [Avail Project](https://www.availproject.org/) - Nexus SDK for cross-chain bridging
- [Pyth Network](https://pyth.network/) - Real-time price oracle
- [Blockscout](https://www.blockscout.com/) - Blockchain explorer
- [Alchemy](https://www.alchemy.com/) - Premium RPC infrastructure
- [OpenZeppelin](https://openzeppelin.com/) - Secure smart contract libraries
- [Foundry](https://getfoundry.sh/) - Fast Solidity testing framework
- [wagmi](https://wagmi.sh/) - React hooks for Ethereum
- [RainbowKit](https://www.rainbowkit.com/) - Beautiful wallet connection UX

## 🎬 Demo Video

[📹 Watch 3-minute demo](https://www.youtube.com/watch?v=My_VIDEO_ID)

Shows:
1. Browse agent marketplace
2. Execute agent on same chain
3. **Cross-chain execution with Avail Nexus bridge** 🌉
4. View transaction on Blockscout
5. See Pyth price feeds in action

---

**Made with 🧠 for ETHGlobal 2025**

*"The Brain of Multi-Chain AI"*

## 🔐 Security

- Comprehensive Solidity test coverage
- OpenZeppelin security patterns
- Reentrancy guards on all payment functions
- Access control via role-based system

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## 📧 Contact

- GitHub: [@BahadorGh](https://github.com/BahadorGh)
- Twitter: [@bghad1](https://twitter.com/bghad1)
- Email: bghad1@gmail.com

## 🙏 Acknowledgments

Built with:
- [Avail Project](https://www.availproject.org/)
- [Blockscout](https://www.blockscout.com/)
- [OpenZeppelin](https://openzeppelin.com/)

---

Made with ❤️ for ETHGlobal 2025
