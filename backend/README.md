# CCAM Backend

Node.js/Express backend for the CCAM AI Agent Platform with multi-chain event listening.

## Tech Stack

- **Node.js** + **Express** + **TypeScript**
- **ethers.js** - Blockchain interactions
- **Prisma** - Database ORM
- **OpenAI API** - AI execution
- **SQLite** - Development database

## Features

- 🎧 Multi-chain event listening (5 testnets)
- 🤖 AI-powered agent execution
- 📋 Template strategies (momentum, etc.)
- 🌐 Custom endpoint support
- 💾 Execution tracking & history
- 🔄 Real-time event processing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Setup database:
```bash
npx prisma generate
npx prisma db push
```

3. Configure environment:
```bash
cp .env.example .env
# Add your RPC URLs and API keys
```

4. Start server:
```bash
npm run dev
```


# API Endpoints
## Health Check:
- `GET /health` - Check server status
## Agents:
- `POST /api/agents` - # List all agents
- `GET  /api/agents/:id` - # Get agent details
- `GET  /api/agents/:id/executions` - # Get execution history


Multi-Chain Support
Backend listens to events on:

Sepolia (11155111)
Arbitrum Sepolia (421614)
Base Sepolia (84532)
Optimism Sepolia (11155420)
Polygon Amoy (80002)
Execution Flow
User executes agent on any chain
AgentExecuted event detected
Backend processes with AI/template logic
Result stored in database
Frontend queries execution history


Templates
Momentum Strategy: Analyzes BTC price vs threshold
Custom Endpoint: POSTs to webhook URL
Platform Default: Fallback logic