/**
 * Hook for fetching unified balances across chains using Avail Nexus
 * This discovers testnet chains and provides cross-chain balance visibility
 */

import { useState, useEffect } from 'react';
import { useNexus } from '../providers/NexusProvider';
import { useAccount } from 'wagmi';

interface ChainInfo {
  id: number;
  name: string;
  logo?: string;
}

interface BalanceBreakdown {
  chain: ChainInfo;
  balance: string;
  balanceFormatted: string;
}

interface UnifiedAsset {
  symbol: string;
  totalBalance: string;
  totalBalanceFormatted: string;
  breakdown: BalanceBreakdown[];
}

interface UnifiedBalanceData {
  assets: UnifiedAsset[];
  testnetChains: ChainInfo[];
  isLoading: boolean;
  error: string | null;
}

export const useUnifiedBalance = (): UnifiedBalanceData => {
  const { nexusSdk, isInitialized } = useNexus();
  const { isConnected, address } = useAccount();

  const [assets, setAssets] = useState<UnifiedAsset[]>([]);
  const [testnetChains, setTestnetChains] = useState<ChainInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnifiedBalances = async () => {
      // Only fetch if SDK is initialized and wallet is connected
      if (!nexusSdk || !isInitialized || !isConnected || !address) {
        console.log('⏸️  Skipping unified balance fetch:', {
          hasSdk: !!nexusSdk,
          isInitialized,
          isConnected,
          hasAddress: !!address
        });
        setAssets([]);
        setTestnetChains([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const balances = await nexusSdk.getUnifiedBalances();

        // Extract unique chains from the balance breakdown
        const chainsSet = new Map<number, ChainInfo>();

        balances.forEach((asset: any) => {
          if (asset.breakdown) {
            asset.breakdown.forEach((chainData: any) => {
              if (!chainsSet.has(chainData.chain.id)) {
                chainsSet.set(chainData.chain.id, {
                  id: chainData.chain.id,
                  name: chainData.chain.name,
                  logo: chainData.chain.logo,
                });
              }
            });
          }
        });

        const discoveredChains = Array.from(chainsSet.values());

        setAssets(balances as any);
        setTestnetChains(discoveredChains);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch unified balances:', err);
        setError(err.message || 'Failed to fetch balances');
        setIsLoading(false);
      }
    };

    fetchUnifiedBalances();
  }, [nexusSdk, isInitialized, isConnected, address]);

  return {
    assets,
    testnetChains,
    isLoading,
    error,
  };
};
