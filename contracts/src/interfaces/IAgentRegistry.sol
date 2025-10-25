// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAgentRegistry
 * @notice Interface for the Agent Registry contract
 * @dev Manages registration, deployment, and execution of AI agents across chains
 */
interface IAgentRegistry {
    struct Agent {
        address owner;
        string metadataURI;
        uint256 pricePerExecution;
        uint256 totalExecutions;
        uint256 totalRevenue;
        bool isActive;
        uint8 revenueSharePercent; // Developer's share (0-100)
        uint256 createdAt;
        uint256[] deployedChains;
    }

    struct AgentDeployment {
        uint256 agentId;
        uint256 chainId;
        address deploymentAddress;
        uint256 timestamp;
        bool isActive;
    }

    event AgentRegistered(
        uint256 indexed agentId, address indexed owner, string metadataURI, uint256 price, uint8 revenueShare
    );
    event AgentDeployed(uint256 indexed agentId, address indexed deployer, uint256 chainId, address deploymentAddress);
    event AgentExecuted(uint256 indexed agentId, address indexed executor, uint256 chainId, bytes params);
    event RevenueSplit(
        uint256 indexed agentId,
        uint256 amount,
        address indexed developer,
        address platform,
        uint256 developerShare,
        uint256 platformShare
    );
    event AgentStatusChanged(uint256 indexed agentId, bool isActive);
    event AgentMetadataUpdated(uint256 indexed agentId, string newMetadataURI);

    /**
     * @notice Register a new agent in the marketplace
     * @param metadataURI IPFS URI containing agent metadata
     * @param price Price per execution in PYUSD (6 decimals)
     * @param revenueShare Developer's revenue share percentage (0-100)
     * @return agentId The ID of the newly registered agent
     */
    function registerAgent(string calldata metadataURI, uint256 price, uint8 revenueShare)
        external
        returns (uint256 agentId);

    /**
     * @notice Deploy an agent to multiple chains
     * @param agentId The ID of the agent to deploy
     * @param targetChains Array of chain IDs to deploy to+
     */
    function deployAgent(uint256 agentId, uint256[] calldata targetChains) external payable;

    /**
     * @notice Execute an agent with given parameters
     * @param agentId The ID of the agent to execute
     * @param params Execution parameters (ABI-encoded)
     */
    function executeAgent(uint256 agentId, bytes calldata params) external payable;

    /**
     * @notice Update agent metadata URI
     * @param agentId The ID of the agent
     * @param newMetadataURI New IPFS URI
     */
    function updateAgentMetadata(uint256 agentId, string calldata newMetadataURI) external;

    /**
     * @notice Toggle agent active status
     * @param agentId The ID of the agent
     * @param isActive New active status
     */
    function setAgentStatus(uint256 agentId, bool isActive) external;

    /**
     * @notice Get agent information
     * @param agentId The ID of the agent
     * @return Agent struct containing all agent data
     */
    function getAgent(uint256 agentId) external view returns (Agent memory);

    /**
     * @notice Get total number of registered agents
     * @return count Total agent count
     */
    function getTotalAgents() external view returns (uint256 count);

    /**
     * @notice Get agents by category (filtered off-chain via metadata)
     * @param offset Starting index
     * @param limit Number of agents to return
     * @return agents Array of Agent structs
     */
    function getAgents(uint256 offset, uint256 limit) external view returns (Agent[] memory agents);

    /**
     * @notice Get agents owned by an address
     * @param owner Address of the owner
     * @return agentIds Array of agent IDs
     */
    function getAgentsByOwner(address owner) external view returns (uint256[] memory agentIds);

    /**
     * @notice Get agent deployment information for a specific chain
     * @param agentId The ID of the agent
     * @param chainId The chain ID
     * @return deployment AgentDeployment struct
     */
    function getAgentDeployment(uint256 agentId, uint256 chainId)
        external
        view
        returns (AgentDeployment memory deployment);
}
