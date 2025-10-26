import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Link } from 'react-router-dom';
import { getChainDeployment } from '../config/deployments';

interface CrossChainIntent {
  id: string;
  type: 'agent_deployment' | 'agent_execution' | 'cross_chain_bridge';
  status: 'pending' | 'completed' | 'failed';
  sourceChain: number;
  targetChains: number[];
  amount: string;
  token: string;
  timestamp: number;
  txHashes: Record<number, string>;
  details: any;
}

export const IntentsPage = () => {
  const { address, isConnected } = useAccount();
  const [intents, setIntents] = useState<CrossChainIntent[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');

  useEffect(() => {
    // Load intents from localStorage
    const loadIntents = () => {
      try {
        const stored = localStorage.getItem(`nexus_intents_${address}`);
        if (stored) {
          const parsedIntents = JSON.parse(stored);
          setIntents(parsedIntents);
        } else {
          // Demo data for showcase
          setIntents(getDemoIntents());
        }
      } catch (error) {
        console.error('Error loading intents:', error);
        setIntents(getDemoIntents());
      }
    };

    if (address) {
      loadIntents();
    }
  }, [address]);

  const getDemoIntents = (): CrossChainIntent[] => {
    return [
      {
        id: '1',
        type: 'agent_deployment',
        status: 'completed',
        sourceChain: 11155111, // Sepolia
        targetChains: [421614, 11155420, 84532], // Arbitrum, Optimism, Base
        amount: '3.0',
        token: 'USDC',
        timestamp: Date.now() - 7200000, // 2 hours ago
        txHashes: {
          11155111: '0x995b55e1aae7a1befe648fdeb07e5760d4ae1b84d554de63940489c6919cb7de',
          421614: '0x7a7f075e8852c03f7626eab6419dad58e4955332988442a14bf52f83dba70449',
          11155420: '0xf6bfb1dfb176bc02a1d2168b2a2786fea5c1f9d5abaa92d2b09659ca0233f976',
          84532: '0x8a8f175e8952c13f8727eab7529ead59e5a66443ab9553d3c10760db1344e987',
        },
        details: {
          agentName: 'Pyth Price Trading Agent',
          chains: 3,
          successRate: '100%',
        }
      },
      {
        id: '2',
        type: 'agent_execution',
        status: 'completed',
        sourceChain: 11155111, // Sepolia
        targetChains: [421614], // Arbitrum
        amount: '0.5',
        token: 'USDC',
        timestamp: Date.now() - 300000, // 5 mins ago
        txHashes: {
          11155111: '0xabc123def456789012345678901234567890abcd',
          421614: '0xdef456789012345678901234567890abcdef1234',
        },
        details: {
          agentName: 'Market Analysis Agent',
          prompt: 'Analyze BTC/ETH market',
        }
      },
      {
        id: '3',
        type: 'cross_chain_bridge',
        status: 'pending',
        sourceChain: 11155111,
        targetChains: [80002], // Polygon Amoy
        amount: '1.0',
        token: 'USDC',
        timestamp: Date.now() - 120000, // 2 mins ago
        txHashes: {
          11155111: '0x1234567890abcdef1234567890abcdef12345678',
        },
        details: {
          purpose: 'Gas refuel for multi-chain deployment',
        }
      },
    ];
  };

  const filteredIntents = intents.filter(intent => {
    if (filter === 'all') return true;
    return intent.status === filter;
  });

  const getStatusBadge = (status: CrossChainIntent['status']) => {
    const badges = {
      completed: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">✅ Completed</span>,
      pending: <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-semibold">⏳ Pending</span>,
      failed: <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-semibold">❌ Failed</span>,
    };
    return badges[status];
  };

  const getTypeIcon = (type: CrossChainIntent['type']) => {
    const icons = {
      agent_deployment: '🚀',
      agent_execution: '⚡',
      cross_chain_bridge: '🌊',
    };
    return icons[type];
  };

  const getTypeName = (type: CrossChainIntent['type']) => {
    const names = {
      agent_deployment: 'Agent Deployment',
      agent_execution: 'Agent Execution',
      cross_chain_bridge: 'Cross-Chain Bridge',
    };
    return names[type];
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card text-center py-16">
          <p className="text-xl text-gray-600 mb-4">🔒 Connect your wallet to view your cross-chain intents</p>
          <p className="text-sm text-gray-500">Your intent history will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">🌊 Intent Explorer</h1>
            <p className="text-gray-600">Track all your cross-chain operations powered by Avail Nexus SDK</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Connected Wallet</div>
            <div className="font-mono text-xs text-gray-800">{address?.slice(0, 6)}...{address?.slice(-4)}</div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <div className="text-2xl font-bold text-purple-900">{intents.length}</div>
            <div className="text-sm text-purple-700">Total Intents</div>
          </div>
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="text-2xl font-bold text-green-900">
              {intents.filter(i => i.status === 'completed').length}
            </div>
            <div className="text-sm text-green-700">Completed</div>
          </div>
          <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <div className="text-2xl font-bold text-yellow-900">
              {intents.filter(i => i.status === 'pending').length}
            </div>
            <div className="text-sm text-yellow-700">Pending</div>
          </div>
          <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="text-2xl font-bold text-blue-900">
              {intents.reduce((sum, i) => sum + i.targetChains.length, 0)}
            </div>
            <div className="text-sm text-blue-700">Chains Bridged</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({intents.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === 'completed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Completed ({intents.filter(i => i.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending ({intents.filter(i => i.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === 'failed'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Failed ({intents.filter(i => i.status === 'failed').length})
          </button>
        </div>
      </div>

      {/* Intent List */}
      <div className="space-y-4">
        {filteredIntents.length === 0 ? (
          <div className="card text-center py-16 bg-gray-50">
            <p className="text-lg text-gray-600 mb-2">No intents found</p>
            <p className="text-sm text-gray-500">Your cross-chain operations will appear here</p>
            <Link to="/create-agent" className="btn btn-primary mt-4 inline-block">
              Create Your First Agent
            </Link>
          </div>
        ) : (
          filteredIntents.map((intent) => {
            const sourceChainName = getChainDeployment(intent.sourceChain)?.chainName || `Chain ${intent.sourceChain}`;
            const completedChains = Object.keys(intent.txHashes).length;
            const totalChains = intent.targetChains.length + 1; // +1 for source

            return (
              <div
                key={intent.id}
                className="card hover:shadow-lg transition-shadow border-2 border-gray-200 hover:border-purple-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{getTypeIcon(intent.type)}</div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {getTypeName(intent.type)}
                      </h3>
                      <p className="text-sm text-gray-600">{formatTimestamp(intent.timestamp)}</p>
                    </div>
                  </div>
                  {getStatusBadge(intent.status)}
                </div>

                {/* Route Visualization */}
                <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-700">Route:</span>
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                      {sourceChainName}
                    </span>
                    <span className="text-gray-400">→</span>
                    <div className="flex gap-1 flex-wrap">
                      {intent.targetChains.map((targetChainId) => {
                        const targetChainName = getChainDeployment(targetChainId)?.chainName || `Chain ${targetChainId}`;
                        return (
                          <span
                            key={targetChainId}
                            className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold"
                          >
                            {targetChainName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  
                  {intent.status === 'pending' && (
                    <div className="mt-2 text-xs text-gray-600">
                      Progress: {completedChains} of {totalChains} chains confirmed
                    </div>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <div className="text-gray-600">Amount</div>
                    <div className="font-semibold">{intent.amount} {intent.token}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Chains</div>
                    <div className="font-semibold">{intent.targetChains.length + 1} chains</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Intent ID</div>
                    <div className="font-mono text-xs">{intent.id}</div>
                  </div>
                </div>

                {/* Additional Details */}
                {intent.details && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Details:</div>
                    {Object.entries(intent.details).map(([key, value]) => (
                      <div key={key} className="text-xs text-gray-600">
                        <span className="capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                        <span className="font-medium">{value as string}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transaction Hashes */}
                <details className="text-sm">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium mb-2">
                    View Transaction Details ({Object.keys(intent.txHashes).length} txs)
                  </summary>
                  <div className="space-y-2 mt-2 pl-4">
                    {Object.entries(intent.txHashes).map(([chainIdStr, txHash]) => {
                      const chainId = Number(chainIdStr);
                      const chainDeployment = getChainDeployment(chainId);
                      const explorerUrl = chainDeployment?.explorerUrl;

                      return (
                        <div key={chainId} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                          <div>
                            <div className="font-semibold text-xs text-gray-700">
                              {chainDeployment?.chainName || `Chain ${chainId}`}
                            </div>
                            <div className="font-mono text-xs text-gray-500">
                              {txHash.slice(0, 10)}...{txHash.slice(-8)}
                            </div>
                          </div>
                          {explorerUrl && (
                            <a
                              href={`${explorerUrl}/tx/${txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              View on Explorer ↗
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 card bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🌊</span>
          <h3 className="font-bold text-gray-900">Powered by Avail Nexus SDK</h3>
        </div>
        <p className="text-sm text-gray-700">
          All cross-chain operations use Nexus SDK's <strong>Bridge & Execute</strong> pattern 
          for atomic bridging and contract execution. Data availability powered by <strong>Avail DA</strong>.
        </p>
      </div>
    </div>
  );
};
