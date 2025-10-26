import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { getPriceUpdates, getPrices, formatPrice, formatConfidence, isPriceFresh, type SupportedPair } from '../services/pyth.service';

// Contract addresses from deployment
const PYTH_TRADING_AGENT_ADDRESS = '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82';

// Minimal ABI for PythTradingAgent
const PYTH_TRADING_AGENT_ABI = [
  {
    inputs: [{ internalType: 'bytes[]', name: 'priceUpdate', type: 'bytes[]' }],
    name: 'executeAnalysis',
    outputs: [
      { internalType: 'uint256', name: 'executionId', type: 'uint256' },
      {
        components: [
          { internalType: 'int64', name: 'ethPrice', type: 'int64' },
          { internalType: 'int64', name: 'btcPrice', type: 'int64' },
          { internalType: 'int64', name: 'solPrice', type: 'int64' },
          { internalType: 'uint64', name: 'ethConf', type: 'uint64' },
          { internalType: 'uint64', name: 'btcConf', type: 'uint64' },
          { internalType: 'uint64', name: 'solConf', type: 'uint64' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        internalType: 'struct PythTradingAgent.MarketData',
        name: 'data',
        type: 'tuple',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export default function PythTradingDemo() {
  const [prices, setPrices] = useState<Map<SupportedPair, any>>(new Map());
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Fetch live prices on mount
  useEffect(() => {
    fetchPrices();
    // Refresh every 10 seconds
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrices = async () => {
    setIsLoadingPrices(true);
    setError(null);
    try {
      const priceData = await getPrices(['ETH/USD', 'BTC/USD', 'SOL/USD']);
      setPrices(priceData);
    } catch (err) {
      setError('Failed to fetch prices from Pyth Network');
      console.error(err);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  const handleExecuteAgent = async () => {
    setError(null);
    try {
      // 1. Fetch price updates from Hermes
      console.log('Fetching price updates from Pyth Hermes...');
      const priceUpdates = await getPriceUpdates(['ETH/USD', 'BTC/USD', 'SOL/USD']);
      console.log('Price updates fetched:', priceUpdates);

      // 2. Execute trading agent with price data
      writeContract({
        address: PYTH_TRADING_AGENT_ADDRESS,
        abi: PYTH_TRADING_AGENT_ABI,
        functionName: 'executeAnalysis',
        args: [priceUpdates as `0x${string}`[]],
        value: parseEther('0.001'), // For Pyth update fee
      });
    } catch (err: any) {
      setError(err.message || 'Failed to execute agent');
      console.error('Execution error:', err);
    }
  };

  const ethPrice = prices.get('ETH/USD');
  const btcPrice = prices.get('BTC/USD');
  const solPrice = prices.get('SOL/USD');

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            🔮 Pyth Trading Agent
          </h2>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isPriceFresh(ethPrice) ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isPriceFresh(ethPrice) ? 'Live Data' : 'Stale Data'}
            </span>
          </div>
        </div>

        <p className="text-gray-600 mb-8">
          AI-powered trading analysis using real-time price data from <strong>Pyth Network</strong>
        </p>

        {/* Price Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <PriceCard
            symbol="ETH"
            price={formatPrice(ethPrice)}
            confidence={formatConfidence(ethPrice)}
            isLoading={isLoadingPrices}
          />
          <PriceCard
            symbol="BTC"
            price={formatPrice(btcPrice)}
            confidence={formatConfidence(btcPrice)}
            isLoading={isLoadingPrices}
          />
          <PriceCard
            symbol="SOL"
            price={formatPrice(solPrice)}
            confidence={formatConfidence(solPrice)}
            isLoading={isLoadingPrices}
          />
        </div>

        {/* Execute Button */}
        <div className="border-t pt-6">
          <button
            onClick={handleExecuteAgent}
            disabled={isPending || isConfirming || isLoadingPrices}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
          >
            {isPending && '⏳ Preparing Transaction...'}
            {isConfirming && '⏳ Executing Agent...'}
            {isSuccess && '✅ Agent Executed Successfully!'}
            {!isPending && !isConfirming && !isSuccess && '▶️ Execute Trading Agent with Live Prices'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">❌ {error}</p>
            </div>
          )}

          {isSuccess && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">
                ✅ Trading agent executed with live Pyth prices! 
                <br />
                <span className="text-xs">Transaction: {hash?.slice(0, 10)}...{hash?.slice(-8)}</span>
              </p>
            </div>
          )}

          <p className="mt-4 text-sm text-gray-500 text-center">
            This agent fetches real-time prices from Pyth Network and performs AI analysis
          </p>
        </div>

        {/* How it Works */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">How it Works:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Fetches live price updates from Pyth's Hermes API</li>
            <li>Updates prices on-chain via smart contract</li>
            <li>AI analyzes market data with verifiable real-time prices</li>
            <li>Returns trading recommendation with confidence score</li>
          </ol>
        </div>

        {/* Pyth Attribution */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <span>Powered by</span>
          <strong className="text-purple-600">Pyth Network</strong>
        </div>
      </div>
    </div>
  );
}

interface PriceCardProps {
  symbol: string;
  price: string;
  confidence: string;
  isLoading: boolean;
}

function PriceCard({ symbol, price, confidence, isLoading }: PriceCardProps) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
      <div className="text-sm font-medium text-gray-500 mb-1">{symbol}/USD</div>
      {isLoading ? (
        <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
      ) : (
        <>
          <div className="text-2xl font-bold text-gray-900">{price}</div>
          <div className="text-xs text-gray-500 mt-1">{confidence}</div>
        </>
      )}
    </div>
  );
}
