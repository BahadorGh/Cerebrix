const CHAIN_INFO: Record<number, { name: string; color: string }> = {
  11155111: { name: 'Sepolia', color: 'bg-purple-500' },
  421614: { name: 'Arb Sepolia', color: 'bg-blue-500' },
  84532: { name: 'Base Sepolia', color: 'bg-blue-600' },
  11155420: { name: 'OP Sepolia', color: 'bg-red-500' },
  80002: { name: 'Polygon Amoy', color: 'bg-purple-600' },
};

interface Props {
  chainId: number;
  size?: 'sm' | 'md';
}

function ChainBadge({ chainId, size = 'sm' }: Props) {
  const info = CHAIN_INFO[chainId] || { name: `Chain ${chainId}`, color: 'bg-gray-500' };
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1';
  
  return (
    <span className={`${info.color} ${sizeClass} rounded-full font-medium inline-block`}>
      {info.name}
    </span>
  );
}

export default ChainBadge;