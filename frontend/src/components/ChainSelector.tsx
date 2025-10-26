import { useAccount } from 'wagmi';

interface Props {
  selectedChain: number;
  onSelectChain: (chainId: number) => void;
  availableChains: number[];
}

const CHAIN_NAMES: Record<number, string> = {
  11155111: 'Sepolia',
  421614: 'Arbitrum Sepolia',
  84532: 'Base Sepolia',
  11155420: 'Optimism Sepolia',
  80002: 'Polygon Amoy',
};

function ChainSelector({ selectedChain, onSelectChain, availableChains }: Props) {
  const { chainId } = useAccount();

  return (
    <div className="mb-6">
      <label className="block text-sm text-gray-400 mb-2">
        Select Execution Chain
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {availableChains.map(chain => (
          <button
            key={chain}
            onClick={() => onSelectChain(chain)}
            className={`p-3 rounded-lg border ${
              selectedChain === chain
                ? 'border-blue-500 bg-blue-500/20'
                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
            }`}
          >
            <div className="text-sm font-medium">{CHAIN_NAMES[chain]}</div>
            {chainId === chain && (
              <div className="text-xs text-green-400 mt-1">✓ Connected</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ChainSelector;