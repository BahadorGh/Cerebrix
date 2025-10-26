export interface Agent {
    id: number;
    owner: string;
    name: string;
    description: string;
    price: string;
    totalExecutions: number;
    isActive: boolean;
    deployedChains: number[];
}

export interface AgentConfig {
    name: string;
    description: string;
    executionType?: string;
    templateId?: string;
    customEndpoint?: string;
}