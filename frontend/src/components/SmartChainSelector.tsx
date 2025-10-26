import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { getAllChainDeployments } from '../config/deployments';
import { useNexus } from '../providers/NexusProvider';

interface ChainOption {
  chainId: number;
  chainName: string;
  hasBalance: boolean;
  balance: string;
  gasCost: string;
  finality: string;
  needsBridge: boolean;
  isRecommended: boolean;
  recommendationReasons: string[];
}

interface SmartChainSelectorProps {
  agentPrice: string;
  onChainSelect: (chainId: number, needsBridge: boolean) => void;
  selectedChainId?: number;
  deployedChains?: number[]; // Optional: filter to only show chains where agent is deployed
}

export const SmartChainSelector = ({ agentPrice, onChainSelect, selectedChainId, deployedChains }: SmartChainSelectorProps) => {
  const { address } = useAccount();
  const currentChainId = useChainId();
  const { nexusSdk, isInitialized } = useNexus();
  const [chainOptions, setChainOptions] = useState<ChainOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllChains, setShowAllChains] = useState(false);

  // Mock gas costs (in USD) - in production, fetch from gas oracle
  const GAS_COSTS: Record<number, string> = {
    11155111: '$0.05',
    421614: '$0.02',
    84532: '$0.01',
    11155420: '$0.03',
    80002: '$0.02',
  };

  // Mock finality times - in production, use actual network data
  const FINALITY_TIMES: Record<number, string> = {
    11155111: '~15 sec',
    421614: '~2 sec',
    84532: '~2 sec',
    11155420: '~2 sec',
    80002: '~5 sec',
  };

  useEffect(() => {
    const fetchChainOptions = async () => {
      if (!address || !nexusSdk || !isInitialized) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Get unified balances from Nexus SDK
        const unifiedBalances = await nexusSdk.getUnifiedBalances();
        const usdcAsset = unifiedBalances.find((asset: any) => asset.symbol === 'USDC');

        // Get all supported chains
        const allDeployments = getAllChainDeployments();
        
        // Filter by deployedChains if provided (for agent execution)
        const deploymentsToShow = deployedChains && deployedChains.length > 0
          ? allDeployments.filter(d => deployedChains.includes(d.chainId))
          : allDeployments;
        
        const options: ChainOption[] = [];

        for (const deployment of deploymentsToShow) {
          const chainId = deployment.chainId;
          
          // Find balance for this chain
          let balance = '0';
          let hasBalance = false;

          if (usdcAsset && usdcAsset.breakdown) {
            const chainBalance = usdcAsset.breakdown.find(
              (b: any) => Number(b.chain?.id) === Number(chainId)
            );
            
            if (chainBalance) {
              balance = String(chainBalance.balance || '0');
              // Consider having balance if there's any USDC (even if not enough for execution)
              const balanceNum = parseFloat(balance);
              const priceNum = parseFloat(agentPrice);
              hasBalance = balanceNum > 0;
              console.log(`Chain ${deployment.chainName} (${chainId}): balance=${balance}, agentPrice=${agentPrice}, sufficient=${balanceNum >= priceNum}`);
            } else {
              console.log(`No balance found for ${deployment.chainName} (chainId: ${chainId})`);
            }
          }

          // Determine if bridge is needed - only if truly zero balance OR insufficient
          const balanceNum = parseFloat(balance);
          const priceNum = parseFloat(agentPrice);
          const needsBridge = balanceNum < priceNum;

          // Calculate recommendation score
          const recommendationReasons: string[] = [];
          let score = 0;
          const hasSufficientBalance = balanceNum >= priceNum;

          if (hasSufficientBalance) {
            recommendationReasons.push(`You have ${balance} USDC here`);
            score += 100; // Highest priority for sufficient balance
          } else if (hasBalance) {
            // Has some USDC but not enough
            const needed = (priceNum - balanceNum).toFixed(2);
            recommendationReasons.push(`Has ${balance} USDC (need ${needed} more)`);
            score += 30; // Some points for having partial balance
          }

          // Prefer lower gas
          if (chainId === 84532) { // Base has lowest gas
            recommendationReasons.push(`Lowest gas: ${GAS_COSTS[chainId]}`);
            score += 20;
          } else if (chainId === 421614 || chainId === 11155420) {
            recommendationReasons.push(`Low gas: ${GAS_COSTS[chainId]}`);
            score += 15;
          }

          // Prefer faster finality
          if (chainId === 421614 || chainId === 84532 || chainId === 11155420) {
            recommendationReasons.push(`Fast finality: ${FINALITY_TIMES[chainId]}`);
            score += 15;
          }

          // Bonus for current chain (no wallet switch needed)
          if (chainId === currentChainId) {
            recommendationReasons.push('Current chain (no switching)');
            score += 10;
          }

          options.push({
            chainId,
            chainName: deployment.chainName,
            hasBalance,
            balance,
            gasCost: GAS_COSTS[chainId] || '$0.04',
            finality: FINALITY_TIMES[chainId] || '~5 sec',
            needsBridge,
            isRecommended: false, // Will set after sorting
            recommendationReasons,
          });
        }

        // Sort by actual score
        const agentPriceNum = parseFloat(agentPrice);
        options.sort((a, b) => {
          const scoreA = a.recommendationReasons.length * 5 + 
            (parseFloat(a.balance) >= agentPriceNum ? 100 : parseFloat(a.balance) > 0 ? 30 : 0);
          const scoreB = b.recommendationReasons.length * 5 + 
            (parseFloat(b.balance) >= agentPriceNum ? 100 : parseFloat(b.balance) > 0 ? 30 : 0);
          return scoreB - scoreA;
        });

        // Mark top option as recommended
        if (options.length > 0) {
          options[0].isRecommended = true;
        }

        setChainOptions(options);
      } catch (error) {
        console.error('Error fetching chain options:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChainOptions();
  }, [address, nexusSdk, isInitialized, agentPrice, currentChainId]);

  const recommendedChain = chainOptions.find(c => c.isRecommended);
  const otherChains = chainOptions.filter(c => !c.isRecommended);

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">⏳ Analyzing best chains for execution...</p>
      </div>
    );
  }

  if (!isInitialized || chainOptions.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          Avail Nexus not initialized. Connect your wallet to see smart chain recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">📊 Smart Chain Selector</h4>
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
          Powered by Avail Nexus
        </span>
      </div>

      {/* Recommended Chain */}
      {recommendedChain && (
        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            selectedChainId === recommendedChain.chainId
              ? 'border-green-500 bg-green-50'
              : 'border-green-300 bg-green-50 hover:border-green-400'
          }`}
          onClick={() => onChainSelect(recommendedChain.chainId, recommendedChain.needsBridge)}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                checked={selectedChainId === recommendedChain.chainId}
                onChange={() => onChainSelect(recommendedChain.chainId, recommendedChain.needsBridge)}
                className="mt-1"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-semibold text-gray-900">{recommendedChain.chainName}</h5>
                  <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-bold">
                    ✨ RECOMMENDED
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Gas: {recommendedChain.gasCost} • Finality: {recommendedChain.finality}
                </p>
              </div>
            </div>
          </div>

          <ul className="space-y-1 text-sm">
            {recommendedChain.recommendationReasons.map((reason, idx) => (
              <li key={idx} className="text-green-700">
                {reason}
              </li>
            ))}
          </ul>

          {recommendedChain.needsBridge && parseFloat(recommendedChain.balance) > 0 && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              🌉 <strong>Bridge & Execute:</strong> Will bridge {(parseFloat(agentPrice) - parseFloat(recommendedChain.balance)).toFixed(2)} USDC from current chain via Avail Nexus SDK
            </div>
          )}
          {recommendedChain.needsBridge && parseFloat(recommendedChain.balance) === 0 && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              🌉 <strong>Bridge & Execute:</strong> Will bridge {parseFloat(agentPrice).toFixed(2)} USDC from current chain via Avail Nexus SDK
            </div>
          )}
        </div>
      )}

      {/* Other Chains (Collapsible) */}
      {otherChains.length > 0 && (
        <div>
          <button
            onClick={() => setShowAllChains(!showAllChains)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            {showAllChains ? '▼' : '▶'} Or choose from {otherChains.length} other chains
          </button>

          {showAllChains && (
            <div className="mt-3 space-y-2">
              {otherChains.map((chain) => (
                <div
                  key={chain.chainId}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedChainId === chain.chainId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => onChainSelect(chain.chainId, chain.needsBridge)}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      checked={selectedChainId === chain.chainId}
                      onChange={() => onChainSelect(chain.chainId, chain.needsBridge)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-gray-900">{chain.chainName}</h5>
                        <span className="text-xs text-gray-600">
                          Gas: {chain.gasCost}
                        </span>
                      </div>
                      
                      {parseFloat(chain.balance) >= parseFloat(agentPrice) ? (
                        <p className="text-xs text-green-600 mt-1">
                          You have {chain.balance} USDC (sufficient)
                        </p>
                      ) : parseFloat(chain.balance) > 0 ? (
                        <div className="mt-1">
                          <p className="text-xs text-orange-600">
                            Has {chain.balance} USDC (need {(parseFloat(agentPrice) - parseFloat(chain.balance)).toFixed(2)} more)
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            🌉 Bridge {(parseFloat(agentPrice) - parseFloat(chain.balance)).toFixed(2)} USDC from current chain via Avail Nexus
                          </p>
                        </div>
                      ) : (
                        <div className="mt-1">
                          <p className="text-xs text-gray-500">
                            ❌ No USDC balance on this chain
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            🌉 Bridge {parseFloat(agentPrice).toFixed(2)} USDC from current chain via Avail Nexus
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700">
        💡 <strong>How it works:</strong> We fetch your USDC across all chains
        and recommends the best one based on balance, gas cost, and finality time.
        <br/><br/>
        🌉 <strong>Bridge & Execute (Coming Soon):</strong> When you select a chain with insufficient USDC,
        Avail Nexus SDK will automatically bridge from another chain and execute in one transaction.
      </div>
    </div>
  );
};
