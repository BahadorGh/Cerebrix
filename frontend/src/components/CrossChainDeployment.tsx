import { useState, useEffect } from 'react';
import { useChainId } from 'wagmi';
import { API_BASE_URL } from '../config/constants';
import { useNexus } from '../providers/NexusProvider';
import { useCrossChainDeployment } from '../hooks/useCrossChainDeployment';

interface Chain {
  id: number;
  name: string;
  icon: string;
  enabled: boolean;
  isTestnet: boolean;
}

interface DeploymentHistory {
  agentId: number;
  sourceChain: number;
  targetChains: number[];
  deploymentAddresses: { [chainId: number]: string };
  txHashes: { [chainId: number]: string };
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
}

interface CrossChainDeploymentProps {
  agentId: number;
  contractAddress: string;
  isOwner: boolean;
  // Agent data needed for cross-chain registration
  agentData?: {
    metadataURI: string;
    pricePerExecution: bigint;
    revenueSharePercent: number;
  };
}

const SUPPORTED_CHAINS: Chain[] = [
  // Testnets (recommended for testing)
  { id: 11155111, name: 'Sepolia', icon: '🔷', enabled: true, isTestnet: true },
  { id: 80002, name: 'Polygon Amoy', icon: '🟣', enabled: true, isTestnet: true },
  { id: 421614, name: 'Arbitrum Sepolia', icon: '🔵', enabled: true, isTestnet: true },
  { id: 11155420, name: 'Optimism Sepolia', icon: '🔴', enabled: true, isTestnet: true },
  { id: 84532, name: 'Base Sepolia', icon: '🔵', enabled: true, isTestnet: true },
  
  // Mainnets (use with caution - real money!)
  { id: 1, name: 'Ethereum', icon: '🔷', enabled: true, isTestnet: false },
  { id: 137, name: 'Polygon', icon: '🟣', enabled: true, isTestnet: false },
  { id: 42161, name: 'Arbitrum', icon: '🔵', enabled: true, isTestnet: false },
  { id: 10, name: 'Optimism', icon: '🔴', enabled: true, isTestnet: false },
  { id: 8453, name: 'Base', icon: '🔵', enabled: true, isTestnet: false },
];

export default function CrossChainDeployment({ agentId, contractAddress, isOwner, agentData }: CrossChainDeploymentProps) {
  const chainId = useChainId();
  const { isInitialized, nexusSdk } = useNexus();
  const { deployToChains } = useCrossChainDeployment();
  const [selectedChains, setSelectedChains] = useState<number[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentHistory, setDeploymentHistory] = useState<DeploymentHistory[]>([]);
  const [deployedChains, setDeployedChains] = useState<number[]>([]);
  const [useXcsSwap, setUseXcsSwap] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Debug: Log SDK initialization status
  useEffect(() => {
    console.log('🔍 Nexus SDK Status:', {
      isInitialized,
      sdkExists: !!nexusSdk,
      timestamp: new Date().toISOString()
    });
  }, [isInitialized, nexusSdk]);

  // Load deployment history on mount
  useEffect(() => {
    loadDeploymentHistory();
  }, [agentId]);

  const loadDeploymentHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deployments/${agentId}/history`);
      if (response.ok) {
        const data = await response.json();
        setDeploymentHistory(data.deploymentHistory || []);
        setDeployedChains(data.deployedChains || []);
      }
    } catch (error) {
      console.error('Failed to load deployment history:', error);
    }
  };

  const handleChainToggle = (chainIdToToggle: number) => {
    setSelectedChains(prev => {
      if (prev.includes(chainIdToToggle)) {
        return prev.filter(id => id !== chainIdToToggle);
      } else {
        return [...prev, chainIdToToggle];
      }
    });
    setError(null);
    setSuccessMessage(null);
  };

  const handleDeploy = async () => {
    console.log('Deploy button clicked. SDK Status:', { isInitialized, sdkExists: !!nexusSdk });
    
    if (!isInitialized || !nexusSdk) {
      const debugInfo = `SDK Initialized: ${isInitialized}, SDK Exists: ${!!nexusSdk}`;
      console.error('Nexus SDK not ready:', debugInfo);
      setError(
        `Nexus SDK is not initialized yet. Please wait a moment and try again.\n\nDebug Info: ${debugInfo}\n\nIf this persists, try disconnecting and reconnecting your wallet.`
      );
      return;
    }

    if (selectedChains.length === 0) {
      setError('Please select at least one chain to deploy to');
      return;
    }

    if (!agentData) {
      setError('Agent data not loaded. Please refresh the page and try again.');
      return;
    }

    setIsDeploying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Starting real cross-chain deployment with Nexus SDK...');
      console.log('This will trigger wallet signature prompts!');
      
      const result = await deployToChains({
        agentId: agentId.toString(),
        sourceChainId: chainId,
        targetChainIds: selectedChains,
        contractAddress,
        agentMetadataURI: agentData.metadataURI,
        agentPrice: agentData.pricePerExecution.toString(),
        agentRevenueShare: agentData.revenueSharePercent,
      });

      if (!result.success) {
        // Check if it's a token support error (common on testnets)
        if (result.error?.includes('Token not supported') || result.error?.includes('Bridge failed')) {
          throw new Error(
            `⚠️ Avail Nexus Bridge Limitation:\n\n` +
            `The bridge doesn't support this token/chain combination on testnet.\n\n` +
            `Alternative approaches:\n` +
            `1. Try bridging between different chain pairs\n` +
            `2. Use mainnet chains if available\n` +
            `3. Manually register on each chain (you already deployed AgentRegistry there)\n\n` +
            `Technical error: ${result.error}`
          );
        }
        throw new Error(result.error || 'Deployment failed');
      }

      console.log('✅ Deployment successful:', result);

      // Display real transaction hashes
      const txHashDisplay = result.txHashes 
        ? Object.entries(result.txHashes)
            .map(([chain, hash]) => `Chain ${chain}: ${hash}`)
            .join('\n')
        : 'No transaction hashes available';

      setSuccessMessage(`🎉 Agent deployed to ${selectedChains.length} chains successfully!\n\nTransaction Hashes:\n${txHashDisplay}`);

      // Fetch updated deployment history
      await loadDeploymentHistory();

      // Step 2: Execute XCS swap if enabled (keeping this for now, but you may want to integrate with Nexus SDK's swap)
      if (useXcsSwap && selectedChains.length > 0) {
        console.log('🔄 Executing XCS swap for gas optimization...');
        try {
          const swapResponse = await fetch(`${API_BASE_URL}/api/deployments/xcs-swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromChainId: chainId,
              toChainId: selectedChains[0], // Use first target chain for swap
              fromToken: '0x0000000000000000000000000000000000000000', // ETH
              toToken: '0x0000000000000000000000000000000000000000', // Native token
              amount: '0.01', // 0.01 ETH for gas
            }),
          });

          if (swapResponse.ok) {
            const swapData = await swapResponse.json();
            console.log('XCS swap completed:', swapData);
          } else {
            console.warn('XCS swap failed (non-critical)');
          }
        } catch (swapError) {
          console.warn('XCS swap error (non-critical):', swapError);
        }
      }

      setSelectedChains([]);
    } catch (err) {
      console.error('Deployment error:', err);
      setError(err instanceof Error ? err.message : 'Deployment failed. Please try again.');
    } finally {
      setIsDeploying(false);
    }
  };

  const getChainName = (id: number) => {
    return SUPPORTED_CHAINS.find(c => c.id === id)?.name || `Chain ${id}`;
  };

  const getChainIcon = (id: number) => {
    return SUPPORTED_CHAINS.find(c => c.id === id)?.icon || '🔗';
  };

  const isChainDeployed = (chainIdToCheck: number) => {
    return deployedChains.includes(chainIdToCheck);
  };

  if (!isOwner) {
    return null; // Only show to agent owner
  }

  return (
    <div className="card bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            🌐
          </div>
          <div>
            <h3 className="text-lg font-bold text-purple-900">Cross-Chain Deployment</h3>
            <p className="text-xs text-purple-700">Powered by Avail Nexus SDK • Multi-chain orchestration</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Nexus SDK Status Indicator */}
          <div className={`text-xs px-2 py-1 rounded-full font-semibold ${
            isInitialized 
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {isInitialized ? '✅ SDK Ready' : '⏳ SDK Loading...'}
          </div>
          <div className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
            {deployedChains.length}/{SUPPORTED_CHAINS.length} Chains
          </div>
        </div>
      </div>

      {/* Chain Selection */}
      <div className="mb-6">
        {/* Important Note about USDC */}
        <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h5 className="font-semibold text-blue-900 mb-1">Cross-Chain Bridging with Avail Nexus</h5>
              <p className="text-sm text-blue-800 mb-2">
                Avail Nexus SDK will bridge <strong>1 USDC</strong> to cover gas fees on target chains.
              </p>
              <p className="text-xs text-blue-700">
                ✅ Make sure you have <strong>at least 2 USDC on Sepolia</strong> for cross-chain deployment<br/>
                ✅ Supported tokens: USDC, USDT, ETH (6 testnet chains available)<br/>
              </p>
            </div>
          </div>
        </div>

        {/* Wallet Behavior Notice */}
        <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h5 className="font-semibold text-amber-900 mb-1">Wallet Will Switch Chains Temporarily</h5>
              <p className="text-sm text-amber-800">
                When bridging to multiple chains, your wallet will temporarily switch to each target chain for the bridge transaction, then return to Sepolia when complete.
              </p>
              <p className="text-xs text-amber-700 mt-2">
                <strong>This is normal behavior.</strong> Your funds are safe. Monitor the browser console for detailed progress logs.
              </p>
            </div>
          </div>
        </div>

        <h4 className="text-sm font-semibold text-gray-700 mb-3">Select Target Chains:</h4>
        
        {/* Testnets Section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-blue-600">🧪 TESTNETS (Recommended for Testing)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {SUPPORTED_CHAINS.filter(chain => chain.isTestnet).map(chain => {
              const deployed = isChainDeployed(chain.id);
              const selected = selectedChains.includes(chain.id);
              
              return (
                <button
                  key={chain.id}
                  onClick={() => !deployed && handleChainToggle(chain.id)}
                  disabled={deployed}
                  className={`
                    p-3 rounded-lg border-2 transition-all text-center
                    ${deployed 
                      ? 'bg-green-100 border-green-400 cursor-not-allowed opacity-60' 
                      : selected
                      ? 'bg-blue-100 border-blue-400 shadow-md'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="text-2xl mb-1">{chain.icon}</div>
                  <div className="text-xs font-semibold text-gray-700">{chain.name}</div>
                  {deployed && (
                    <div className="text-xs text-green-600 font-semibold mt-1">✅ Deployed</div>
                  )}
                  {selected && !deployed && (
                    <div className="text-xs text-blue-600 font-semibold mt-1">✓ Selected</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* XCS Swap Option */}
      <div className="mb-6 p-3 bg-white rounded-lg border border-gray-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={useXcsSwap}
            onChange={(e) => setUseXcsSwap(e.target.checked)}
            className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
          />
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-700">Enable XCS Swap for Gas Optimization</div>
            <div className="text-xs text-gray-500">
              Automatically swap tokens for gas fees on target chains (recommended)
            </div>
          </div>
        </label>
      </div>

      {/* Deploy Button */}
      <button
        onClick={handleDeploy}
        disabled={isDeploying || selectedChains.length === 0}
        className="btn btn-primary w-full mb-4"
      >
        {isDeploying ? (
          <>Deploying to {selectedChains.length} chain{selectedChains.length > 1 ? 's' : ''}...</>
        ) : (
          <>
            Deploy to {selectedChains.length || 'Selected'} Chain{selectedChains.length !== 1 ? 's' : ''}
          </>
        )}
      </button>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Deployment History */}
      {deploymentHistory.length > 0 && (
        <div className="mt-6 pt-6 border-t border-purple-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">📜 Deployment History:</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {deploymentHistory.slice(0, 5).map((deployment, index) => (
              <div key={index} className="p-3 bg-white rounded-lg border border-gray-200 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-700">
                    {new Date(deployment.timestamp).toLocaleDateString()} at{' '}
                    {new Date(deployment.timestamp).toLocaleTimeString()}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      deployment.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : deployment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {deployment.status === 'completed' ? '✅' : deployment.status === 'pending' ? '⏳' : '❌'}{' '}
                    {deployment.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {deployment.targetChains.map(chainIdInHistory => (
                    <span key={chainIdInHistory} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                      {getChainIcon(chainIdInHistory)} {getChainName(chainIdInHistory)}
                    </span>
                  ))}
                </div>
                {Object.keys(deployment.txHashes).length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {Object.entries(deployment.txHashes).map(([chainIdKey, txHash]) => (
                      <div key={chainIdKey} className="truncate">
                        {getChainIcon(parseInt(chainIdKey))} TX: {txHash}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-4 text-xs bg-purple-100 text-purple-700 rounded p-3">
        💡 <strong>Multi-Chain Registration:</strong> Register your agent to multiple blockchain networks simultaneously
        using Avail Nexus SDK's Bridge & Execute pattern. XCS swaps automatically provide gas tokens on target chains.
        <br /><br />
        <strong>🧪 Testnets:</strong> Free to use, perfect for testing (Sepolia, Polygon Amoy, Arbitrum Sepolia, Optimism Sepolia, Base Sepolia)
        <br />
        <strong>⚠️ Mainnets:</strong> Real money required - use only when ready for production deployment
      </div>
    </div>
  );
}
