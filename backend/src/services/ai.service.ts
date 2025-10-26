import { getPrices, type SupportedPair, type PythPrice } from './pyth.service';
import { executeTemplateStrategy } from './strategy.templates';
import { callCustomEndpoint, validateEndpointConfig } from './endpoint.executor';

/**
 * AI Service for processing agent executions
 * Supports: Template strategies, Custom endpoints, and Platform default logic
 */

interface ExecutionParams {
    market?: string;
    timeframe?: string;
    [key: string]: any;
}

interface MarketAnalysisResult {
    btcPrice: number;
    ethPrice: number;
    solPrice?: number;
    btcEthRatio: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    recommendation: string;
    analysis: string;
    timestamp: number;
}

interface PriceAlertResult {
    currentPrice: number;
    targetPrice: number;
    triggered: boolean;
    action: string;
    timestamp: number;
}

export class AIService {
    /**
     * Process agent execution based on agent type
     * Now supports: templates, custom endpoints, and platform default
     */
    async processExecution(
        agentId: number,
        agentMetadata: any,
        params: ExecutionParams
    ): Promise<any> {
        console.log(`🤖 Processing execution for Agent #${agentId}: ${agentMetadata.name}`);

        // Check if agent has execution configuration
        const executionConfig = agentMetadata.execution;

        if (executionConfig) {
            const executionType = executionConfig.type;
            console.log(`   Execution Type: ${executionType}`);

            // Priority 1: Custom Endpoint
            if (executionType === 'custom_endpoint' && executionConfig.endpoint) {
                console.log(`   🌐 Using custom endpoint: ${executionConfig.endpoint}`);

                try {
                    // Validate endpoint config
                    if (!validateEndpointConfig(executionConfig)) {
                        throw new Error('Invalid endpoint configuration');
                    }

                    // Get market data for context
                    const marketData = await this.fetchMarketData();

                    // Call developer's endpoint
                    const result = await callCustomEndpoint(executionConfig, {
                        agentId,
                        executor: params.executor || 'unknown',
                        params,
                        marketData,
                    });

                    console.log(`   ✅ Custom endpoint executed successfully`);
                    return result;

                } catch (error) {
                    console.error(`   ❌ Custom endpoint failed:`, error);

                    // Fallback to platform default
                    console.log(`   🔄 Falling back to platform default`);
                    return await this.processMarketAnalysis(params);
                }
            }

            // Priority 2: Template Strategy
            if (executionType === 'template' && executionConfig.template) {
                console.log(`   📋 Using template: ${executionConfig.template}`);

                try {
                    // Get market data
                    const marketData = await this.fetchMarketData();

                    // Execute template strategy
                    const result = await executeTemplateStrategy(
                        executionConfig.template,
                        executionConfig.config || {},
                        marketData
                    );

                    console.log(`   ✅ Template strategy executed: ${result.signal}`);
                    return result;

                } catch (error) {
                    console.error(`   ❌ Template execution failed:`, error);

                    // Fallback to platform default
                    console.log(`   🔄 Falling back to platform default`);
                    return await this.processMarketAnalysis(params);
                }
            }
        }

        // Priority 3: Platform Default (backward compatible)
        console.log(`   🏢 Using platform default logic`);
        const agentName = agentMetadata.name?.toLowerCase() || '';

        if (agentName.includes('market') || agentName.includes('trading') || agentName.includes('analyzer')) {
            return await this.processMarketAnalysis(params);
        } else if (agentName.includes('price') || agentName.includes('alert')) {
            return await this.processPriceAlert(params);
        } else if (agentName.includes('portfolio') || agentName.includes('balance')) {
            return await this.processPortfolioAnalysis(params);
        } else {
            // Default generic processing
            return await this.processGenericAgent(params);
        }
    }

    /**
     * Fetch market data for template strategies and custom endpoints
     */
    private async fetchMarketData(): Promise<any> {
        try {
            const priceFeeds: SupportedPair[] = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
            const prices = await getPrices(priceFeeds);

            const btcPrice = this.extractPrice(prices.get('BTC/USD'));
            const ethPrice = this.extractPrice(prices.get('ETH/USD'));
            const solPrice = this.extractPrice(prices.get('SOL/USD'));

            return {
                btcPrice,
                ethPrice,
                solPrice,
                timestamp: Date.now(),
            };
        } catch (error) {
            console.error('Failed to fetch market data:', error);
            // Return fallback
            return {
                btcPrice: 61400,
                ethPrice: 2500,
                solPrice: 150,
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Process market analysis agent (Crypto Market Analyzer)
     */
    private async processMarketAnalysis(params: ExecutionParams): Promise<MarketAnalysisResult> {
        console.log('📊 Processing market analysis with params:', params);

        try {
            // Fetch real-time prices from Pyth Network
            const priceFeeds: SupportedPair[] = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
            const prices = await getPrices(priceFeeds);

            const btcPrice = this.extractPrice(prices.get('BTC/USD'));
            const ethPrice = this.extractPrice(prices.get('ETH/USD'));
            const solPrice = this.extractPrice(prices.get('SOL/USD'));

            // Calculate BTC/ETH ratio
            const btcEthRatio = btcPrice / ethPrice;

            // Simple rule-based analysis
            const analysis = this.analyzeMarket(btcPrice, ethPrice, solPrice, btcEthRatio);

            const result: MarketAnalysisResult = {
                btcPrice,
                ethPrice,
                solPrice,
                btcEthRatio: parseFloat(btcEthRatio.toFixed(4)),
                trend: analysis.trend,
                signal: analysis.signal,
                confidence: analysis.confidence,
                recommendation: analysis.recommendation,
                analysis: analysis.detailedAnalysis,
                timestamp: Date.now(),
            };

            console.log('✅ Market analysis complete:', result);
            return result;
        } catch (error) {
            console.error('❌ Market analysis failed:', error);
            // Return fallback data
            return {
                btcPrice: 61400,
                ethPrice: 2500,
                solPrice: 150,
                btcEthRatio: 24.56,
                trend: 'neutral',
                signal: 'HOLD',
                confidence: 0.5,
                recommendation: 'Analysis failed. Using cached data.',
                analysis: 'Unable to fetch real-time prices. Please try again.',
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Analyze market conditions using simple rules
     */
    private analyzeMarket(btcPrice: number, ethPrice: number, solPrice: number, ratio: number) {
        let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = 0.7;
        let recommendation = '';
        let detailedAnalysis = '';

        // BTC price analysis
        if (btcPrice > 65000) {
            trend = 'bearish';
            signal = 'SELL';
            confidence = 0.8;
            recommendation = `BTC is trading above $65k at $${btcPrice.toLocaleString()}. Consider taking profits as price may correct.`;
            detailedAnalysis = `Bitcoin is showing overbought conditions at current levels. Historical resistance at $65k suggests potential for pullback. Consider reducing long positions or taking partial profits.`;
        } else if (btcPrice < 55000) {
            trend = 'bullish';
            signal = 'BUY';
            confidence = 0.85;
            recommendation = `BTC is trading below $55k at $${btcPrice.toLocaleString()}. Strong buy opportunity as price approaches support.`;
            detailedAnalysis = `Bitcoin is testing key support levels around $55k. This presents a favorable risk/reward opportunity for long-term accumulation. Historical data shows strong bounces from this level.`;
        } else {
            trend = 'neutral';
            signal = 'HOLD';
            confidence = 0.7;
            recommendation = `BTC is in neutral zone at $${btcPrice.toLocaleString()}. Wait for clear direction before entering positions.`;
            detailedAnalysis = `Bitcoin is trading within the $55k-$65k range, showing consolidation. This sideways movement suggests market indecision. Best to wait for a clear breakout above $65k or breakdown below $55k before taking positions.`;
        }

        // ETH analysis
        const ethAnalysis = this.analyzeEthPrice(ethPrice);
        detailedAnalysis += `\n\nETH Analysis: ${ethAnalysis}`;

        // BTC/ETH ratio analysis
        if (ratio > 25) {
            detailedAnalysis += `\n\nBTC/ETH ratio (${ratio.toFixed(2)}) is elevated, suggesting ETH may be undervalued relative to BTC. Consider ETH accumulation.`;
        } else if (ratio < 23) {
            detailedAnalysis += `\n\nBTC/ETH ratio (${ratio.toFixed(2)}) is compressed, suggesting BTC may be undervalued relative to ETH. Consider BTC accumulation.`;
        }

        // SOL analysis
        if (solPrice > 0) {
            const solAnalysis = this.analyzeSolPrice(solPrice);
            detailedAnalysis += `\n\nSOL Analysis: ${solAnalysis}`;
        }

        return {
            trend,
            signal,
            confidence,
            recommendation,
            detailedAnalysis,
        };
    }

    /**
     * Analyze ETH price
     */
    private analyzeEthPrice(ethPrice: number): string {
        if (ethPrice > 2800) {
            return `ETH at $${ethPrice.toLocaleString()} is approaching resistance. Watch for rejection at $3000 level.`;
        } else if (ethPrice < 2200) {
            return `ETH at $${ethPrice.toLocaleString()} is near support. Good accumulation zone for long-term holders.`;
        } else {
            return `ETH at $${ethPrice.toLocaleString()} is trading within normal range. Monitor for breakout signals.`;
        }
    }

    /**
     * Analyze SOL price
     */
    private analyzeSolPrice(solPrice: number): string {
        if (solPrice > 180) {
            return `SOL at $${solPrice.toLocaleString()} is in overbought territory. Consider profit-taking.`;
        } else if (solPrice < 120) {
            return `SOL at $${solPrice.toLocaleString()} is oversold. Potential bounce opportunity.`;
        } else {
            return `SOL at $${solPrice.toLocaleString()} is trading in mid-range. Wait for clearer signals.`;
        }
    }

    /**
     * Process price alert agent
     */
    private async processPriceAlert(params: ExecutionParams): Promise<PriceAlertResult> {
        console.log('🔔 Processing price alert with params:', params);

        const targetAsset = params.asset || 'BTC/USD';
        const targetPrice = parseFloat(params.targetPrice || '60000');
        const alertType = params.alertType || 'above'; // 'above' or 'below'

        try {
            const prices = await getPrices([targetAsset as SupportedPair]);
            const currentPrice = this.extractPrice(prices.get(targetAsset as SupportedPair));

            const triggered =
                alertType === 'above'
                    ? currentPrice >= targetPrice
                    : currentPrice <= targetPrice;

            const action = triggered
                ? `✅ Alert triggered! ${targetAsset} is ${alertType} $${targetPrice.toLocaleString()}`
                : `⏳ Monitoring ${targetAsset}. Current: $${currentPrice.toLocaleString()}, Target: ${alertType} $${targetPrice.toLocaleString()}`;

            return {
                currentPrice,
                targetPrice,
                triggered,
                action,
                timestamp: Date.now(),
            };
        } catch (error) {
            console.error('❌ Price alert failed:', error);
            throw error;
        }
    }

    /**
     * Process portfolio analysis agent
     */
    private async processPortfolioAnalysis(params: ExecutionParams): Promise<any> {
        console.log('💼 Processing portfolio analysis with params:', params);

        try {
            const prices = await getPrices(['BTC/USD', 'ETH/USD', 'SOL/USD']);

            const btcPrice = this.extractPrice(prices.get('BTC/USD'));
            const ethPrice = this.extractPrice(prices.get('ETH/USD'));
            const solPrice = this.extractPrice(prices.get('SOL/USD'));

            // Mock portfolio (in real app, would fetch from user's wallet)
            const portfolio = {
                BTC: parseFloat(params.btcAmount || '0.5'),
                ETH: parseFloat(params.ethAmount || '10'),
                SOL: parseFloat(params.solAmount || '100'),
            };

            const btcValue = portfolio.BTC * btcPrice;
            const ethValue = portfolio.ETH * ethPrice;
            const solValue = portfolio.SOL * solPrice;
            const totalValue = btcValue + ethValue + solValue;

            return {
                portfolio,
                prices: {
                    BTC: btcPrice,
                    ETH: ethPrice,
                    SOL: solPrice,
                },
                values: {
                    BTC: btcValue,
                    ETH: ethValue,
                    SOL: solValue,
                    total: totalValue,
                },
                allocation: {
                    BTC: ((btcValue / totalValue) * 100).toFixed(2) + '%',
                    ETH: ((ethValue / totalValue) * 100).toFixed(2) + '%',
                    SOL: ((solValue / totalValue) * 100).toFixed(2) + '%',
                },
                recommendation: this.getPortfolioRecommendation(btcValue, ethValue, solValue, totalValue),
                timestamp: Date.now(),
            };
        } catch (error) {
            console.error('❌ Portfolio analysis failed:', error);
            throw error;
        }
    }

    /**
     * Get portfolio rebalancing recommendation
     */
    private getPortfolioRecommendation(btcValue: number, ethValue: number, solValue: number, totalValue: number): string {
        const btcPercent = (btcValue / totalValue) * 100;
        const ethPercent = (ethValue / totalValue) * 100;
        const solPercent = (solValue / totalValue) * 100;

        if (btcPercent < 30) {
            return `Consider increasing BTC allocation (currently ${btcPercent.toFixed(1)}%). Target: 40-50% for stability.`;
        } else if (btcPercent > 70) {
            return `BTC allocation (${btcPercent.toFixed(1)}%) is high. Consider diversifying into ETH/SOL for better risk management.`;
        } else if (ethPercent < 20) {
            return `ETH allocation (${ethPercent.toFixed(1)}%) is low. Consider increasing exposure to leading smart contract platform.`;
        } else {
            return `Portfolio allocation looks balanced. BTC: ${btcPercent.toFixed(1)}%, ETH: ${ethPercent.toFixed(1)}%, SOL: ${solPercent.toFixed(1)}%`;
        }
    }

    /**
     * Process generic agent (fallback)
     */
    private async processGenericAgent(params: ExecutionParams): Promise<any> {
        console.log('🔮 Processing generic agent with params:', params);

        return {
            status: 'success',
            message: 'Agent executed successfully',
            params,
            result: 'Generic agent processing completed',
            timestamp: Date.now(),
        };
    }

    /**
     * Extract numeric price from Pyth price object
     */
    private extractPrice(priceObj: PythPrice | undefined): number {
        if (!priceObj) return 0;
        return priceObj.price;
    }
}

// Export singleton instance
export const aiService = new AIService();
