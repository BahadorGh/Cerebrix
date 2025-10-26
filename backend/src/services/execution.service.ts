import { db } from './database.service';
import { openaiService } from './openai.service';
import { marketService } from './market.service';

interface ExecutionContext {
    agentId: number;
    executor: string;
    chainId: number;
    agentConfig: any;
}

export class ExecutionService {
    async processExecution(context: ExecutionContext) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`⚙️  Processing execution for Agent ${context.agentId}`);
        console.log(`   Executor: ${context.executor}`);
        console.log(`   Chain: ${context.chainId}`);

        try {
            // Get agent config from metadata
            const config = context.agentConfig || {};

            // Check execution type
            const executionType = config.executionType || 'default';

            let result;

            if (executionType === 'template') {
                result = await this.executeTemplate(config);
            } else if (executionType === 'custom' && config.customEndpoint) {
                result = await this.executeCustomEndpoint(config);
            } else {
                result = await this.executeDefault();
            }

            console.log(`✅ Execution complete: ${result}`);
            console.log(`${'='.repeat(60)}\n`);

            return result;
        } catch (error) {
            console.error('❌ Execution failed:', error);
            throw error;
        }
    }

    private async executeTemplate(config: any) {
        const templateId = config.templateId;

        if (templateId === 'momentum') {
            return this.executeMomentumStrategy(config.templateConfig);
        }

        return 'Unknown template';
    }

    private async executeMomentumStrategy(config: any) {
        console.log('📋 Using template: momentum');

        const symbol = config.symbol || 'BTC';
        const threshold = config.threshold || 65000;

        // Get market data
        const marketData = await marketService.getPrice(symbol);

        console.log(`💹 ${symbol} Price: $${marketData.price}`);
        console.log(`📊 Threshold: $${threshold}`);

        // Simple momentum logic
        let signal;
        if (marketData.price > threshold) {
            signal = 'SELL';
        } else if (marketData.price < threshold * 0.9) {
            signal = 'BUY';
        } else {
            signal = 'HOLD';
        }

        console.log(`🎯 Signal: ${signal}`);

        return {
            strategy: 'momentum',
            symbol,
            price: marketData.price,
            signal,
            timestamp: new Date().toISOString(),
        };
    }

    private async executeCustomEndpoint(config: any) {
        console.log('🌐 Calling custom endpoint:', config.customEndpoint);

        try {
            const marketData = await marketService.getPrice('BTC');

            const response = await fetch(config.customEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ marketData }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Custom endpoint response received');
                return result;
            } else {
                console.warn('⚠️  Custom endpoint failed, using fallback');
                return this.executeDefault();
            }
        } catch (error) {
            console.error('❌ Custom endpoint error:', error);
            return this.executeDefault();
        }
    }

    private async executeDefault() {
        console.log('🤖 Using platform default execution');

        const marketData = await marketService.getPrice('BTC');

        return {
            strategy: 'default',
            marketData,
            message: 'Execution completed with platform default logic',
            timestamp: new Date().toISOString(),
        };
    }
}

export const executionService = new ExecutionService();