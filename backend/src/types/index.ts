export interface Agent {
    id: number;
    owner: string;
    name: string;
    description: string;
    metadataURI: string;
    price: string;
    totalExecutions: number;
    isActive: boolean;
    createdAt: Date;
}

export interface AgentConfig {
    executionType?: 'template' | 'custom' | 'default';
    templateId?: string;
    templateConfig?: any;
    customEndpoint?: string;
}

export interface Execution {
    id: number;
    agentId: number;
    executor: string;
    chainId: number;
    txHash: string;
    result?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    timestamp: Date;
}

export interface ContractEvent {
    type: 'AgentRegistered' | 'AgentExecuted';
    agentId: number;
    blockNumber: number;
    txHash: string;
    sourceChain: number;
    sourceChainName: string;
    [key: string]: any;
}