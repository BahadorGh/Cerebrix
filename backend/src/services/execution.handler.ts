import { EventEmitter } from 'events';
import { aiService } from './ai.service';
import { IPFSService } from './ipfs.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Agent Execution Handler
 * Listens to AgentExecuted events and processes them with AI
 */

interface AgentExecutedEvent {
    type: 'AgentExecuted';
    agentId: number;
    executor: string;
    chainId: number;
    params: any;
    blockNumber: number;
    txHash: string;
}

interface ExecutionResult {
    executionId: string;
    agentId: number;
    executor: string;
    params: any;
    results: any;
    timestamp: number;
    txHash: string;
}

export class AgentExecutionHandler extends EventEmitter {
    private ipfsService: IPFSService;
    private executionCounter = 0;
    private executionStore: Map<number, ExecutionResult[]> = new Map(); // In-memory storage by agentId

    constructor() {
        super();
        this.ipfsService = new IPFSService();
    }

    async initialize() {
        await this.ipfsService.initialize();

        // Listen to agentExecuted events from contract service
        this.on('agentExecuted', async (event: AgentExecutedEvent) => {
            console.log(`\n📥 AgentExecuted event received in handler`);
            await this.handleAgentExecuted(event);
        });

        console.log('🤖 Agent execution handler initialized');
    }

    /**
     * Handle AgentExecuted event from smart contract
     */
    async handleAgentExecuted(event: AgentExecutedEvent) {
        const startTime = Date.now();
        console.log(`\n${'━'.repeat(60)}`);
        console.log(`🎯 AGENT EXECUTION REQUEST`);
        console.log(`   Agent ID: ${event.agentId}`);
        console.log(`   User: ${event.executor}`);
        console.log(`   Transaction: ${event.txHash}`);
        console.log(`   Chain ID: ${event.chainId}`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`${'━'.repeat(60)}`);

        try {
            // Generate execution ID
            const executionId = `exec_${event.agentId}_${++this.executionCounter}_${Date.now()}`;
            console.log(`\n📋 Execution ID: ${executionId}`);

            // Fetch agent metadata from database or contract
            console.log(`📖 Fetching agent metadata...`);
            const agent = await this.getAgentMetadata(event.agentId);

            if (!agent) {
                console.error(`❌ CRITICAL: Agent #${event.agentId} not found - cannot process execution`);
                console.error(`   User ${event.executor} will NOT receive results!`);
                return;
            }
            console.log(`✅ Agent metadata loaded: ${agent.metadata?.name || 'Unknown'}`);

            // Parse execution parameters (bytes from contract, could be empty)
            let params = {};
            try {
                if (event.params && event.params !== '0x') {
                    // Try to decode params if they exist
                    params = JSON.parse(event.params);
                }
            } catch (e) {
                console.log(`   Using default parameters (params not parseable)`);
            }
            console.log(`   Parameters:`, JSON.stringify(params));

            // Process with AI service
            console.log(`\n🤖 Starting AI processing...`);
            const results = await aiService.processExecution(
                event.agentId,
                agent.metadata,
                params
            );

            console.log(`✅ AI processing complete!`);
            console.log(`   Generated ${JSON.stringify(results).length} bytes of results`);

            // Store execution result
            const executionResult: ExecutionResult = {
                executionId,
                agentId: event.agentId,
                executor: event.executor,
                params,
                results,
                timestamp: Date.now(),
                txHash: event.txHash,
            };

            // Save to database
            console.log(`💾 Saving execution result...`);
            await this.saveExecution(executionResult);

            // Emit result for WebSocket broadcast
            console.log(`📡 Broadcasting to WebSocket clients...`);
            this.emit('executionComplete', executionResult);

            const processingTime = Date.now() - startTime;
            console.log(`\n${'━'.repeat(60)}`);
            console.log(`✅ EXECUTION COMPLETE`);
            console.log(`   Execution ID: ${executionId}`);
            console.log(`   User: ${event.executor}`);
            console.log(`   Processing Time: ${processingTime}ms`);
            console.log(`   Status: Results sent to user via WebSocket`);
            console.log(`${'━'.repeat(60)}\n`);

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error(`\n${'━'.repeat(60)}`);
            console.error(`❌ EXECUTION FAILED`);
            console.error(`   Agent ID: ${event.agentId}`);
            console.error(`   User: ${event.executor} - WILL NOT RECEIVE RESULTS!`);
            console.error(`   Transaction: ${event.txHash}`);
            console.error(`   Error:`, error);
            console.error(`   Time before failure: ${processingTime}ms`);
            console.error(`${'━'.repeat(60)}\n`);

            // Try to emit error to user
            try {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.emit('executionComplete', {
                    executionId: `exec_${event.agentId}_error_${Date.now()}`,
                    agentId: event.agentId,
                    executor: event.executor,
                    params: {},
                    results: { error: 'Failed to process execution', message: errorMessage },
                    timestamp: Date.now(),
                    txHash: event.txHash,
                });
                console.log(`⚠️  Error notification sent to user via WebSocket`);
            } catch (emitError) {
                console.error(`❌ Could not send error notification to user:`, emitError);
            }
        }
    }

    /**
     * Get agent metadata (from DB cache or contract/API)
     */
    private async getAgentMetadata(agentId: number): Promise<any> {
        try {
            // Try to fetch from database first (cached)
            try {
                const dbAgent = await prisma.agent.findUnique({
                    where: { id: agentId },
                });

                if (dbAgent && dbAgent.metadataCached) {
                    return {
                        id: dbAgent.id,
                        metadataURI: dbAgent.metadataURI,
                        metadata: typeof dbAgent.metadataCached === 'string'
                            ? JSON.parse(dbAgent.metadataCached)
                            : dbAgent.metadataCached,
                    };
                }
            } catch (dbError) {
                console.log(`   Database not available, fetching from IPFS...`);
            }

            // If not in DB, fetch from API/contract using fetch
            try {
                const response = await fetch(`http://localhost:3001/api/agents/${agentId}`);
                if (response.ok) {
                    const agentData: any = await response.json();
                    console.log(`   Fetched agent metadata from API`);
                    return {
                        id: agentId,
                        metadataURI: agentData.metadataURI || '',
                        metadata: agentData.metadataCached || {
                            name: agentData.metadataCached?.name || `Agent #${agentId}`,
                            description: agentData.metadataCached?.description || 'AI agent',
                            capabilities: agentData.metadataCached?.capabilities || ['analysis'],
                        },
                    };
                }
            } catch (apiError) {
                console.warn(`   Failed to fetch from API, using fallback`);
            }

            // Fallback metadata
            console.warn(`⚠️  Using fallback metadata for Agent #${agentId}`);
            return {
                id: agentId,
                metadataURI: '',
                metadata: {
                    name: `Agent #${agentId}`,
                    description: 'AI agent for trading analysis',
                    capabilities: ['price analysis', 'trading signals'],
                },
            };
        } catch (error) {
            console.error(`Failed to get agent metadata:`, error);
            return null;
        }
    }

    /**
     * Save execution result to database and in-memory store
     */
    private async saveExecution(execution: ExecutionResult) {
        // Always store in memory first
        if (!this.executionStore.has(execution.agentId)) {
            this.executionStore.set(execution.agentId, []);
        }
        const executions = this.executionStore.get(execution.agentId)!;
        executions.unshift(execution); // Add to beginning (most recent first)

        // Keep only last 100 executions per agent in memory
        if (executions.length > 100) {
            executions.pop();
        }

        console.log(`💾 Execution saved to memory: ${execution.executionId}`);

        // Try to save to database if available
        try {
            // Check if agent_executions table exists
            await prisma.$executeRaw`
                CREATE TABLE IF NOT EXISTS agent_executions (
                    id TEXT PRIMARY KEY,
                    agent_id INTEGER NOT NULL,
                    executor TEXT NOT NULL,
                    params JSONB,
                    results JSONB,
                    tx_hash TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // Insert execution
            await prisma.$executeRaw`
                INSERT INTO agent_executions (id, agent_id, executor, params, results, tx_hash)
                VALUES (
                    ${execution.executionId},
                    ${execution.agentId},
                    ${execution.executor},
                    ${JSON.stringify(execution.params)}::jsonb,
                    ${JSON.stringify(execution.results)}::jsonb,
                    ${execution.txHash}
                )
            `;

            console.log(`💾 Execution also saved to database: ${execution.executionId}`);
        } catch (error) {
            console.log(`   Database not available, using in-memory storage only`);
            // Don't throw - execution still succeeds with in-memory storage
        }
    }

    /**
     * Get execution history for an agent (from DB or in-memory store)
     */
    async getExecutionHistory(agentId: number, limit: number = 10): Promise<ExecutionResult[]> {
        // Try database first
        try {
            const result = await prisma.$queryRaw<any[]>`
                SELECT * FROM agent_executions
                WHERE agent_id = ${agentId}
                ORDER BY created_at DESC
                LIMIT ${limit}
            `;

            if (result.length > 0) {
                return result.map((row: any) => ({
                    executionId: row.id,
                    agentId: row.agent_id,
                    executor: row.executor,
                    params: row.params,
                    results: row.results,
                    timestamp: new Date(row.created_at).getTime(),
                    txHash: row.tx_hash,
                }));
            }
        } catch (error) {
            // Database not available, fallback to in-memory
        }

        // Return from in-memory store
        const executions = this.executionStore.get(agentId) || [];
        return executions.slice(0, limit);
    }
}

// Export singleton instance
export const agentExecutionHandler = new AgentExecutionHandler();
