/**
 * UnifiedBalance Component
 * Displays user's cross-chain balances using Nexus SDK
 */

import React, { useEffect } from 'react';
import { useUnifiedBalance } from '../hooks/useUnifiedBalance';

export const UnifiedBalance: React.FC = () => {
  const { assets, testnetChains, isLoading, error } = useUnifiedBalance();

  useEffect(() => {
    console.log('UnifiedBalance component rendered:', {
      isLoading,
      assetsCount: assets?.length,
      chainsCount: testnetChains?.length,
      error,
      hasAssets: !!assets && assets.length > 0,
    });
  }, [assets, testnetChains, isLoading, error]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-3">💰 Cross-Chain Balances</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading balances...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-3">💰 Cross-Chain Balances</h3>
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          ❌ {error}
        </div>
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-3">💰 Cross-Chain Balances</h3>
        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-blue-700">
          ℹ️ No balances found. Make sure you have testnet tokens.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">💰 Cross-Chain Balances</h3>
        <span className="text-sm text-gray-500">
          {testnetChains.length} chain{testnetChains.length !== 1 ? 's' : ''} discovered
        </span>
      </div>

      {testnetChains.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <div className="text-sm font-medium text-green-800 mb-2">
            ✅ Testnet Chains Discovered:
          </div>
          <div className="flex flex-wrap gap-2">
            {testnetChains.map((chain) => (
              <span
                key={chain.id}
                className="inline-flex items-center px-2 py-1 bg-white border border-green-300 rounded text-xs"
              >
                {chain.logo && (
                  <img src={chain.logo} alt="" className="w-4 h-4 mr-1 rounded-full" />
                )}
                {chain.name} ({chain.id})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Asset Balances */}
      <div className="space-y-3">
        {assets.map((asset: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{asset.symbol || 'Unknown Token'}</span>
              <span className="text-sm text-gray-600">
                Total: {asset.balance || asset.totalBalance || '0'}
              </span>
            </div>
            
            {/* Breakdown by chain */}
            {asset.breakdown && asset.breakdown.length > 0 && (
              <div className="space-y-1 mt-2 pl-3 border-l-2 border-gray-200">
                {asset.breakdown.map((chainBalance: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {chainBalance.chain?.logo && (
                        <img 
                          src={chainBalance.chain.logo} 
                          alt="" 
                          className="w-3 h-3 inline mr-1 rounded-full" 
                        />
                      )}
                      {chainBalance.chain?.name || 'Unknown'}
                    </span>
                    <span className="font-mono">{chainBalance.balance}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
        💡 These balances are aggregated across all testnet chains using Avail Nexus
      </div>
    </div>
  );
};
