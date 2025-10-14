// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAgentRegistry {
    struct Agent {
        address owner;
        string metadataURI;
        uint256 pricePerExecution;
        uint256 totalExecutions;
        uint256 totalRevenue;
        bool isActive;
        uint8 revenueSharePercent;
    }

    event AgentRegistered(uint256 indexed agentId, address indexed owner);
    event AgentDeployed(uint256 indexed agentId, address indexed deployer, uint256 chainId);
    event AgentExecuted(uint256 indexed agentId, address indexed executor, uint256 fee);
    event RevenueSplit(uint256 indexed agentId, uint256 amount, address developer, address platform);

    function registerAgent(string calldata metadataURI, uint256 price, uint8 revenueShare) external returns (uint256);

    function deployAgent(uint256 agentId, uint256[] calldata targetChains) external payable;
    function executeAgent(uint256 agentId, bytes calldata params) external payable;
    function getAgent(uint256 agentId) external view returns (Agent memory);
}
