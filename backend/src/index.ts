import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Suppress known harmless errors from ethers.js with public RPC nodes
// Public RPC providers clean up filters after ~5 minutes, causing "filter not found" errors
const originalError = console.error;
console.error = function (...args: any[]) {
    // Convert all args to strings for checking
    const fullErrorStr = args.map((arg: any) => {
        if (typeof arg === 'object') {
            return JSON.stringify(arg);
        }
        return String(arg);
    }).join(' ');

    // Suppress "filter not found" errors - these are expected with RPC providers
    if (fullErrorStr.includes('@TODO Error') ||
        fullErrorStr.includes('filter not found') ||
        fullErrorStr.includes('could not coalesce error') ||
        fullErrorStr.includes('UNKNOWN_ERROR') ||
        fullErrorStr.includes('eth_getFilterChanges')) {
        return; // Silent skip - harmless RPC limitation
    }
    originalError.apply(console, args);
};

// Import routes
import agentRoutes from './routes/agents.routes';
import executionRoutes from './routes/executions.routes';
import bridgeRoutes from './routes/bridge.routes';
import analyticsRoutes from './routes/analytics.routes';
import ipfsRoutes from './routes/ipfs.routes';
import blockscoutRoutes from './routes/blockscout.routes';
import agentAnalyticsRoutes from './routes/agent-analytics.routes';
import deploymentRoutes from './routes/deployment.routes';

// Import services
import { initializeServices, contractService, agentExecutionHandler } from './services';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

const app: Application = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database: false, // Database not connected
            ipfs: true,
            nexus: true, // Mocked
            contract: !!contractService, // Check if contract service exists
        }
    });
});

// Status endpoint for frontend
app.get('/api/status', (req: Request, res: Response) => {
    res.json({
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});

// API routes
app.use('/api/agents', agentRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/bridge', bridgeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ipfs', ipfsRoutes);
app.use('/api/blockscout', blockscoutRoutes);
app.use('/api/agent-analytics', agentAnalyticsRoutes);
app.use('/api/deployments', deploymentRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
    try {
        // Initialize all services (Nexus, IPFS, Blockscout, etc.)
        await initializeServices();

        // Start HTTP server
        const server = createServer(app);
        server.listen(PORT, () => {
            console.log(`🚀 Backend server running on http://localhost:${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Start WebSocket server
        const wss = new WebSocketServer({ port: Number(WS_PORT) });
        const clients = new Set<any>();

        wss.on('connection', (ws) => {
            console.log('🔌 New WebSocket client connected');
            clients.add(ws);

            ws.on('message', (message) => {
                console.log('📨 Received:', message.toString());
            });

            ws.on('close', () => {
                console.log('🔌 WebSocket client disconnected');
                clients.delete(ws);
            });

            // Send initial connection message
            ws.send(JSON.stringify({
                type: 'connected',
                timestamp: new Date().toISOString()
            }));
        });

        // Listen to execution handler events and broadcast to all WebSocket clients
        agentExecutionHandler.on('executionComplete', (result) => {
            console.log(`\n${'▓'.repeat(60)}`);
            console.log(`📡 BROADCASTING RESULTS TO USER`);
            console.log(`   Execution ID: ${result.executionId}`);
            console.log(`   Agent ID: ${result.agentId}`);
            console.log(`   User: ${result.executor}`);
            console.log(`   Connected Clients: ${clients.size}`);
            console.log(`${'▓'.repeat(60)}\n`);

            const message = JSON.stringify({
                type: 'executionComplete',
                ...result
            });

            let successCount = 0;
            clients.forEach((client) => {
                if (client.readyState === 1) { // OPEN
                    try {
                        client.send(message);
                        successCount++;
                    } catch (error) {
                        console.error(`❌ Failed to send to one client:`, error);
                    }
                }
            });

            console.log(`✅ Results sent to ${successCount}/${clients.size} clients`);
            if (successCount === 0 && clients.size > 0) {
                console.warn(`⚠️  WARNING: No clients received results - all clients disconnected or in bad state`);
            }
        });

        // ✅ Enable contract event listening to detect AgentExecuted events
        console.log('📡 Starting contract event listener...');
        contractService.listenToEvents(async (event: any) => {
            console.log(`✅ Contract event received: ${event.type}`, event);

            // Handle AgentRegistered events - auto-create deployment record
            if (event.type === 'AgentRegistered') {
                console.log(`📝 Auto-syncing deployment for newly registered Agent #${event.agentId}`);
                try {
                    // Create deployment record for the chain where agent was registered
                    const chainId = 11155111; // Sepolia - where events are coming from
                    const existing = await prisma.deployment.findFirst({
                        where: { agentId: event.agentId, chainId }
                    });

                    if (!existing) {
                        await prisma.deployment.create({
                            data: {
                                agentId: event.agentId,
                                chainId,
                                deploymentAddress: '', // Will be populated if deployAgent() is called
                                isActive: true,
                                deployedAt: new Date(event.blockNumber * 1000) // Approximate timestamp
                            }
                        });
                        console.log(`   ✅ Created deployment record for Agent #${event.agentId} on chain ${chainId}`);
                    }
                } catch (dbError: any) {
                    console.warn(`   ⚠️  Failed to create deployment record:`, dbError?.message);
                }
            }

            // Handle AgentExecuted events
            if (event.type === 'AgentExecuted') {
                console.log(`🎯 Processing AgentExecuted event for Agent #${event.agentId}`);
                agentExecutionHandler.emit('agentExecuted', event);
            }
        });

        console.log(`🔌 WebSocket server running on ws://localhost:${WS_PORT}`);

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('👋 SIGTERM received, shutting down gracefully...');
            server.close(() => {
                console.log('✅ HTTP server closed');
                wss.close(() => {
                    console.log('✅ WebSocket server closed');
                    process.exit(0);
                });
            });
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

export default app;
