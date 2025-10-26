/**
 * Pyth Network Integration Service (Backend)
 * Fetches real-time price data from Pyth's Hermes API
 * @see https://docs.pyth.network/price-feeds/api-instances-and-providers/hermes
 */

const HERMES_URL = 'https://hermes.pyth.network';

/**
 * Pyth Price Feed IDs
 * @see https://docs.pyth.network/price-feeds/price-feed-ids
 */
export const PRICE_FEEDS = {
    'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    'BTC/USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
    'SOL/USD': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
    'USDC/USD': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
    'USDT/USD': '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
    'MATIC/USD': '0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52',
    'ARB/USD': '0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5',
    'OP/USD': '0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf',
} as const;

export type SupportedPair = keyof typeof PRICE_FEEDS;

export interface PythPrice {
    price: number;
    conf: number;
    expo: number;
    publishTime: number;
}

interface PriceUpdate {
    binary: {
        encoding: string;
        data: string[];
    };
    parsed: {
        id: string;
        price: {
            price: string;
            conf: string;
            expo: number;
            publishTime: number;
        };
        ema_price: {
            price: string;
            conf: string;
            expo: number;
            publishTime: number;
        };
    }[];
}

/**
 * Get human-readable price data
 * 
 * @param symbols - Array of trading pairs
 * @returns Map of symbol to price data
 */
export async function getPrices(symbols: SupportedPair[]): Promise<Map<SupportedPair, PythPrice>> {
    const ids = symbols
        .map(symbol => PRICE_FEEDS[symbol])
        .filter(Boolean);

    if (ids.length === 0) {
        throw new Error('No valid price feed IDs');
    }

    const params = new URLSearchParams();
    ids.forEach(id => params.append('ids[]', id));

    try {
        const response = await fetch(`${HERMES_URL}/v2/updates/price/latest?${params}`);

        if (!response.ok) {
            throw new Error(`Hermes API error: ${response.statusText}`);
        }

        const data = await response.json() as PriceUpdate;

        const priceMap = new Map<SupportedPair, PythPrice>();

        data.parsed.forEach((item, index) => {
            const priceValue = parseInt(item.price.price) * Math.pow(10, item.price.expo);
            const confValue = parseInt(item.price.conf) * Math.pow(10, item.price.expo);

            priceMap.set(symbols[index], {
                price: priceValue,
                conf: confValue,
                expo: item.price.expo,
                publishTime: item.price.publishTime
            });
        });

        return priceMap;
    } catch (error) {
        console.error('Failed to fetch Pyth prices:', error);
        throw error;
    }
}

/**
 * Format price for display
 */
export function formatPrice(price: PythPrice | undefined, includeCurrency: boolean = true): string {
    if (!price) return 'N/A';

    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(price.price);

    return includeCurrency ? `$${formatted}` : formatted;
}

/**
 * Check if price is fresh (less than 60 seconds old)
 */
export function isPriceFresh(price: PythPrice | undefined): boolean {
    if (!price) return false;
    const age = Math.floor(Date.now() / 1000) - price.publishTime;
    return age < 60;
}
