/**
 * Blockscout SDK Service
 * Handles blockchain analytics and explorer data
 * Now supports local Blockscout instance for Anvil!
 */
export class BlockscoutService {
    private apiUrl: string;
    private apiKey?: string;
    private localBlockscoutUrl?: string;

    constructor() {
        this.apiUrl = process.env.BLOCKSCOUT_API_URL || 'https://eth.blockscout.com/api';
        this.apiKey = process.env.BLOCKSCOUT_API_KEY;
        this.localBlockscoutUrl = process.env.LOCAL_BLOCKSCOUT_URL;

        console.log('🔍 Blockscout Service initialized:');
        console.log(`   API URL: ${this.apiUrl}`);
        console.log(`   Local Blockscout: ${this.localBlockscoutUrl || 'Not configured'}`);
    }

    /**
     * Get transaction details
     */
    async getTransaction(txHash: string, chainId: number = 1): Promise<any> {
        // Use local Blockscout for Anvil if available
        const apiUrl = (chainId === 31337 && this.localBlockscoutUrl)
            ? `${this.localBlockscoutUrl}/api`
            : this.apiUrl;

        try {
            console.log(`� Fetching transaction from: ${apiUrl}/v2/transactions/${txHash}`);
            const response = await fetch(`${apiUrl}/v2/transactions/${txHash}`, {
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                console.log(`⚠️ Blockscout API responded with ${response.status}`);
                // If local Blockscout not ready, return mock data
                if (chainId === 31337) {
                    console.log('📍 Local Blockscout initializing, returning mock data');
                    return {
                        hash: txHash,
                        chainId,
                        status: 'success',
                        confirmations: 1,
                        local: true
                    };
                }
                throw new Error(`Blockscout API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Failed to fetch transaction:', error);
            // For local Anvil, fall back to mock data
            if (chainId === 31337) {
                return {
                    hash: txHash,
                    chainId,
                    status: 'success',
                    confirmations: 1,
                    local: true
                };
            }
            return null;
        }
    }

    /**
     * Get address transactions
     */
    async getAddressTransactions(
        address: string,
        options?: {
            filter?: 'to' | 'from';
            page?: number;
            limit?: number;
        }
    ): Promise<any> {
        const params = new URLSearchParams({
            ...(options?.filter && { filter: options.filter }),
            ...(options?.page && { page: options.page.toString() }),
            ...(options?.limit && { items_count: options.limit.toString() }),
        });

        try {
            const response = await fetch(
                `${this.apiUrl}/v2/addresses/${address}/transactions?${params}`,
                { headers: this.getHeaders() }
            );

            if (!response.ok) {
                throw new Error(`Blockscout API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Failed to fetch address transactions:', error);
            return null;
        }
    }

    /**
     * Get smart contract details
     */
    async getSmartContract(address: string): Promise<any> {
        try {
            const response = await fetch(`${this.apiUrl}/v2/smart-contracts/${address}`, {
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Blockscout API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Failed to fetch smart contract:', error);
            return null;
        }
    }

    /**
     * Get token transfers for address
     */
    async getTokenTransfers(
        address: string,
        options?: {
            type?: 'ERC-20' | 'ERC-721' | 'ERC-1155';
            page?: number;
            limit?: number;
        }
    ): Promise<any> {
        const params = new URLSearchParams({
            ...(options?.type && { type: options.type }),
            ...(options?.page && { page: options.page.toString() }),
            ...(options?.limit && { items_count: options.limit.toString() }),
        });

        try {
            const response = await fetch(
                `${this.apiUrl}/v2/addresses/${address}/token-transfers?${params}`,
                { headers: this.getHeaders() }
            );

            if (!response.ok) {
                throw new Error(`Blockscout API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Failed to fetch token transfers:', error);
            return null;
        }
    }

    /**
     * Get analytics for agent contract
     */
    async getAgentAnalytics(contractAddress: string, chainId: number = 1): Promise<{
        totalTransactions: number;
        uniqueUsers: number;
        totalVolume: string;
        recentActivity: any[];
    }> {
        // For Anvil testnet (31337), return mock analytics without API call
        // Blockscout SDK in frontend handles transaction display for supported chains
        if (chainId === 31337) {
            console.log('📍 Anvil testnet detected - returning mock analytics (Blockscout SDK handles transactions in frontend)');
            return {
                totalTransactions: 0,
                uniqueUsers: 0,
                totalVolume: '0',
                recentActivity: [],
            };
        }

        // Use local Blockscout for Anvil if available
        const apiUrl = (chainId === 31337 && this.localBlockscoutUrl)
            ? `${this.localBlockscoutUrl}/api`
            : this.apiUrl;

        try {
            console.log(`🔍 Fetching analytics from: ${apiUrl}/v2/addresses/${contractAddress}/transactions`);
            const response = await fetch(
                `${apiUrl}/v2/addresses/${contractAddress}/transactions?items_count=100`,
                { headers: this.getHeaders() }
            );

            if (!response.ok) {
                console.log(`⚠️ Blockscout API responded with ${response.status}`);
                throw new Error(`Blockscout API error: ${response.statusText}`);
            }

            const transactions: any = await response.json();

            // Process analytics data
            const items = transactions?.items || [];
            const uniqueUsers = new Set(
                items.map((tx: any) => tx.from?.hash).filter(Boolean)
            ).size;

            console.log(`✅ Found ${items.length} transactions, ${uniqueUsers} unique users`);

            return {
                totalTransactions: items.length,
                uniqueUsers,
                totalVolume: '0', // TODO: Calculate from transactions
                recentActivity: items.slice(0, 10),
            };
        } catch (error) {
            console.error('❌ Failed to get agent analytics:', error);
            // For local Anvil, fall back to mock data
            if (chainId === 31337) {
                return {
                    totalTransactions: 5,
                    uniqueUsers: 2,
                    totalVolume: '50000000',
                    recentActivity: [],
                };
            }
            return {
                totalTransactions: 0,
                uniqueUsers: 0,
                totalVolume: '0',
                recentActivity: [],
            };
        }
    }

    /**
     * Get request headers
     */
    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        return headers;
    }
}
