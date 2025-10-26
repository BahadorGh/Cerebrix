export const AGENT_REGISTRY_ABI = [
    'function getAgent(uint256 agentId) view returns (tuple(address owner, string metadataURI, uint256 pricePerExecution, uint256 totalExecutions, uint256 totalRevenue, bool isActive, uint8 revenueSharePercent, uint256 createdAt, uint256[] deployedChains))',
    'function getTotalAgents() view returns (uint256)',
    'function executeAgent(uint256 agentId, uint256 targetChainId, bytes calldata params) payable',
    'event AgentRegistered(uint256 indexed agentId, address indexed owner, string metadataURI, uint256 price, uint8 revenueShare)',
    'event AgentExecuted(uint256 indexed agentId, address indexed executor, uint256 chainId, bytes params)',
];

export const PAYMENT_PROCESSOR_ABI = [
    'function getPendingRevenue(uint256 agentId) view returns (uint256)',
    'event PaymentProcessed(uint256 indexed agentId, address indexed payer, uint256 amount, uint256 timestamp)',
];