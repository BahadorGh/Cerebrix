/**
 * Template Strategy Implementations
 * Pre-built trading strategies that developers can use
 */

interface StrategyConfig {
    buyThreshold?: number;
    sellThreshold?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    indicators?: string[];
    [key: string]: any;
}

interface MarketData {
    btcPrice: number;
    ethPrice: number;
    solPrice: number;
    timestamp: number;
}

interface StrategyResult {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string;
    data: MarketData;
    strategy: string;
}

/**
 * Momentum Strategy
 * Buys when price is below threshold, sells when above
 */
export async function momentumStrategy(
    config: StrategyConfig,
    marketData: MarketData
): Promise<StrategyResult> {
    const { btcPrice, ethPrice, solPrice, timestamp } = marketData;
    const { buyThreshold = 55000, sellThreshold = 65000, riskLevel = 'medium' } = config;

    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0.7;
    let reasoning = '';

    // Momentum logic
    if (btcPrice < buyThreshold) {
        signal = 'BUY';
        confidence = riskLevel === 'high' ? 0.9 : riskLevel === 'medium' ? 0.75 : 0.6;
        reasoning = `BTC at $${btcPrice.toLocaleString()} is below buy threshold of $${buyThreshold.toLocaleString()}. Momentum strategy suggests accumulation at these levels.`;
    } else if (btcPrice > sellThreshold) {
        signal = 'SELL';
        confidence = riskLevel === 'high' ? 0.85 : riskLevel === 'medium' ? 0.7 : 0.55;
        reasoning = `BTC at $${btcPrice.toLocaleString()} has exceeded sell threshold of $${sellThreshold.toLocaleString()}. Momentum strategy suggests taking profits.`;
    } else {
        signal = 'HOLD';
        confidence = 0.65;
        reasoning = `BTC at $${btcPrice.toLocaleString()} is within the $${buyThreshold.toLocaleString()}-$${sellThreshold.toLocaleString()} range. Momentum strategy suggests holding current positions.`;
    }

    // Add ETH correlation analysis
    const ethBtcRatio = ethPrice / btcPrice;
    reasoning += ` ETH/BTC ratio: ${ethBtcRatio.toFixed(6)}. `;

    if (ethBtcRatio > 0.042) {
        reasoning += 'ETH showing relative strength.';
    } else if (ethBtcRatio < 0.038) {
        reasoning += 'BTC showing relative strength.';
    }

    return {
        signal,
        confidence,
        reasoning,
        data: marketData,
        strategy: 'momentum',
    };
}

/**
 * Mean Reversion Strategy
 * Buys when price is oversold, sells when overbought
 */
export async function meanReversionStrategy(
    config: StrategyConfig,
    marketData: MarketData
): Promise<StrategyResult> {
    const { btcPrice, ethPrice, solPrice, timestamp } = marketData;
    const { riskLevel = 'medium' } = config;

    // Calculate historical mean (simplified - using hardcoded values)
    const btcMean = 60000;
    const deviationPercent = ((btcPrice - btcMean) / btcMean) * 100;

    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0.7;
    let reasoning = '';

    // Mean reversion logic
    if (deviationPercent < -10) {
        // More than 10% below mean
        signal = 'BUY';
        confidence = Math.min(0.95, 0.7 + Math.abs(deviationPercent) / 50);
        reasoning = `BTC at $${btcPrice.toLocaleString()} is ${Math.abs(deviationPercent).toFixed(1)}% below historical mean of $${btcMean.toLocaleString()}. Mean reversion suggests strong buy opportunity.`;
    } else if (deviationPercent > 10) {
        // More than 10% above mean
        signal = 'SELL';
        confidence = Math.min(0.9, 0.7 + Math.abs(deviationPercent) / 50);
        reasoning = `BTC at $${btcPrice.toLocaleString()} is ${Math.abs(deviationPercent).toFixed(1)}% above historical mean of $${btcMean.toLocaleString()}. Mean reversion suggests taking profits.`;
    } else {
        signal = 'HOLD';
        confidence = 0.6;
        reasoning = `BTC at $${btcPrice.toLocaleString()} is ${deviationPercent > 0 ? 'above' : 'below'} mean by ${Math.abs(deviationPercent).toFixed(1)}%. Price is within normal range.`;
    }

    // Add volatility context
    reasoning += ` SOL at $${solPrice.toFixed(2)} provides market sentiment context.`;

    return {
        signal,
        confidence,
        reasoning,
        data: marketData,
        strategy: 'mean_reversion',
    };
}

/**
 * Breakout Strategy
 * Identifies price breakouts from consolidation ranges
 */
export async function breakoutStrategy(
    config: StrategyConfig,
    marketData: MarketData
): Promise<StrategyResult> {
    const { btcPrice, ethPrice, solPrice, timestamp } = marketData;
    const { riskLevel = 'medium' } = config;

    // Resistance and support levels
    const resistance = 67000;
    const support = 52000;
    const consolidationHigh = 63000;
    const consolidationLow = 57000;

    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0.7;
    let reasoning = '';

    // Breakout logic
    if (btcPrice > consolidationHigh && btcPrice < resistance) {
        signal = 'BUY';
        confidence = 0.8;
        reasoning = `BTC at $${btcPrice.toLocaleString()} has broken above consolidation range ($${consolidationLow.toLocaleString()}-$${consolidationHigh.toLocaleString()}). Breakout strategy suggests entering long positions before resistance at $${resistance.toLocaleString()}.`;
    } else if (btcPrice < consolidationLow && btcPrice > support) {
        signal = 'SELL';
        confidence = 0.75;
        reasoning = `BTC at $${btcPrice.toLocaleString()} has broken below consolidation range. Breakout strategy suggests reducing exposure before support at $${support.toLocaleString()}.`;
    } else if (btcPrice >= consolidationLow && btcPrice <= consolidationHigh) {
        signal = 'HOLD';
        confidence = 0.65;
        reasoning = `BTC at $${btcPrice.toLocaleString()} is consolidating between $${consolidationLow.toLocaleString()}-$${consolidationHigh.toLocaleString()}. Breakout strategy suggests waiting for clear direction.`;
    } else if (btcPrice >= resistance) {
        signal = 'BUY';
        confidence = 0.85;
        reasoning = `BTC at $${btcPrice.toLocaleString()} has broken through major resistance at $${resistance.toLocaleString()}. Strong bullish breakout - momentum likely to continue.`;
    } else if (btcPrice <= support) {
        signal = 'SELL';
        confidence = 0.8;
        reasoning = `BTC at $${btcPrice.toLocaleString()} has broken through major support at $${support.toLocaleString()}. Bearish breakdown - further downside likely.`;
    }

    // Add multi-asset confirmation
    const ethBreakout = ethPrice > 2600;
    const solBreakout = solPrice > 160;

    if (signal === 'BUY' && (ethBreakout || solBreakout)) {
        confidence = Math.min(0.95, confidence + 0.1);
        reasoning += ' Confirmed by altcoin strength.';
    }

    return {
        signal,
        confidence,
        reasoning,
        data: marketData,
        strategy: 'breakout',
    };
}

/**
 * HODL Strategy (Conservative long-term)
 * Always recommends holding with DCA suggestions
 */
export async function hodlStrategy(
    config: StrategyConfig,
    marketData: MarketData
): Promise<StrategyResult> {
    const { btcPrice, ethPrice, solPrice, timestamp } = marketData;

    // HODL logic - always hold but suggest accumulation on dips
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0.9;
    let reasoning = '';

    if (btcPrice < 58000) {
        signal = 'BUY';
        confidence = 0.95;
        reasoning = `BTC at $${btcPrice.toLocaleString()} presents an excellent long-term accumulation opportunity. HODL strategy recommends dollar-cost averaging at these levels. Historical 4-year returns remain highly positive.`;
    } else {
        signal = 'HOLD';
        confidence = 0.9;
        reasoning = `BTC at $${btcPrice.toLocaleString()}. HODL strategy: Continue holding existing positions. Bitcoin's long-term trajectory remains bullish. Consider DCA on dips below $58k.`;
    }

    reasoning += ` ETH at $${ethPrice.toFixed(2)}, SOL at $${solPrice.toFixed(2)}. Diversified crypto portfolio recommended for long-term holders.`;

    return {
        signal,
        confidence,
        reasoning,
        data: marketData,
        strategy: 'hodl',
    };
}

/**
 * Execute template strategy based on type
 */
export async function executeTemplateStrategy(
    template: string,
    config: StrategyConfig,
    marketData: MarketData
): Promise<StrategyResult> {
    switch (template.toLowerCase()) {
        case 'momentum':
            return momentumStrategy(config, marketData);
        case 'mean_reversion':
            return meanReversionStrategy(config, marketData);
        case 'breakout':
            return breakoutStrategy(config, marketData);
        case 'hodl':
            return hodlStrategy(config, marketData);
        default:
            throw new Error(`Unknown template strategy: ${template}`);
    }
}
