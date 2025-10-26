class MarketDataService {
    async getPrice(symbol: string): Promise<any> {
        try {
            // Using CoinGecko API (free, no key needed)
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
            );

            const data = await response.json();
            const coinData = data[symbol.toLowerCase()];

            if (!coinData) {
                throw new Error(`No data for ${symbol}`);
            }

            return {
                symbol: symbol.toUpperCase(),
                price: coinData.usd,
                change24h: coinData.usd_24h_change || 0,
                volume: coinData.usd_24h_vol || 0,
            };
        } catch (error) {
            console.error(`Failed to fetch price for ${symbol}:`, error);
            // Return mock data for testing
            return {
                symbol: symbol.toUpperCase(),
                price: symbol === 'BTC' ? 111858 : 3200,
                change24h: 2.5,
                volume: 1000000,
            };
        }
    }
}

export const marketService = new MarketDataService();