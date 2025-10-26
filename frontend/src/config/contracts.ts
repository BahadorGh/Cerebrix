export const AGENT_REGISTRY_ADDRESS = '0x83FAA0aE70AC0B74C01e0C60210991A110b95D3c';

export const AGENT_REGISTRY_ABI = [
    'function getAgent(uint256 agentId) view returns (tuple(address owner, string metadataURI, uint256 pricePerExecution, uint256 totalExecutions, uint256 totalRevenue, bool isActive, uint8 revenueSharePercent, uint256 createdAt, uint256[] deployedChains))',
    'function executeAgent(uint256 agentId, uint256 targetChainId, bytes calldata params) payable',
    'event AgentExecuted(uint256 indexed agentId, address indexed executor, uint256 chainId, bytes params)',
] as const;

export const PAYMENT_TOKEN_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // USDC on testnets

export const ERC20_ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
] as const;