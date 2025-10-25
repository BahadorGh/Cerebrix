// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {IPaymentProcessor} from "./interfaces/IPaymentProcessor.sol";

/**
 * @title AgentRegistry
 * @notice Registry contract for managing AI agents in the marketplace
 * @dev Implements IAgentRegistry with access control and pausability
 */
contract AgentRegistry is IAgentRegistry, Ownable, ReentrancyGuard, Pausable {
    uint256 public constant MIN_PRICE_PER_EXECUTION = 1e6; // 1 USDC
    uint8 public constant MAX_REVENUE_SHARE = 90; // 90%

    IPaymentProcessor public paymentProcessor;
    uint256 private _agentIdCounter;

    mapping(uint256 agentId => Agent) private _agents;
    mapping(uint256 agentId => mapping(uint256 chainId => AgentDeployment)) private _deployments;
    mapping(address agentOwner => uint256[] agentId) private _ownerAgents;

    constructor(address _paymentProcessor) Ownable(msg.sender) {
        require(_paymentProcessor != address(0), "Invalid payment processor");
        paymentProcessor = IPaymentProcessor(_paymentProcessor);
    }

    /**
     * @inheritdoc IAgentRegistry
     */
    function registerAgent(string calldata metadataURI, uint256 price, uint8 revenueShare)
        external
        whenNotPaused
        returns (uint256 agentId)
    {
        require(bytes(metadataURI).length > 0, "Empty metadata URI");
        require(price >= MIN_PRICE_PER_EXECUTION, "Price too low");
        require(revenueShare <= MAX_REVENUE_SHARE, "Revenue share too high");

        agentId = ++_agentIdCounter;

        Agent storage agent = _agents[agentId];
        agent.owner = msg.sender;
        agent.metadataURI = metadataURI;
        agent.pricePerExecution = price;
        agent.totalExecutions = 0;
        agent.totalRevenue = 0;
        agent.isActive = true;
        agent.revenueSharePercent = revenueShare;
        agent.createdAt = block.timestamp;

        _ownerAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, metadataURI, price, revenueShare);
    }

    /**
     * @inheritdoc IAgentRegistry
     */
    function deployAgent(uint256 agentId, uint256[] calldata targetChains)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        Agent storage agent = _agents[agentId];
        require(agent.owner == msg.sender, "Not agent owner");
        require(agent.isActive, "Agent not active");
        require(targetChains.length > 0, "No target chains");

        // Record deployments (in production, this would trigger cross-chain deployment via Avail Nexus)
        for (uint256 i = 0; i < targetChains.length; i++) {
            uint256 chainId = targetChains[i];

            AgentDeployment storage deployment = _deployments[agentId][chainId];
            require(!deployment.isActive, "Already deployed to chain");

            deployment.agentId = agentId;
            deployment.chainId = chainId;
            deployment.deploymentAddress = address(0); // Would be set by cross-chain callback
            deployment.timestamp = block.timestamp;
            deployment.isActive = true;

            agent.deployedChains.push(chainId);

            emit AgentDeployed(agentId, msg.sender, chainId, deployment.deploymentAddress);
        }
    }

    /**
     * @inheritdoc IAgentRegistry
     */
    function executeAgent(uint256 agentId, bytes calldata params) external payable whenNotPaused nonReentrant {
        Agent storage agent = _agents[agentId];
        require(agent.isActive, "Agent not active");

        // Process payment through PaymentProcessor
        paymentProcessor.processPayment(agentId, agent.pricePerExecution);
        paymentProcessor.collectFee(agentId, agent.pricePerExecution, agent.revenueSharePercent);

        // Update agent stats
        agent.totalExecutions++;
        agent.totalRevenue += agent.pricePerExecution;

        emit AgentExecuted(agentId, msg.sender, block.chainid, params);
    }

    /**
     * @inheritdoc IAgentRegistry
     */
    function updateAgentMetadata(uint256 agentId, string calldata newMetadataURI) external {
        Agent storage agent = _agents[agentId];
        require(agent.owner == msg.sender, "Not agent owner");
        require(bytes(newMetadataURI).length > 0, "Empty metadata URI");

        agent.metadataURI = newMetadataURI;

        emit AgentMetadataUpdated(agentId, newMetadataURI);
    }

    /**
     * @inheritdoc IAgentRegistry
     */
    function setAgentStatus(uint256 agentId, bool isActive) external {
        Agent storage agent = _agents[agentId];
        require(agent.owner == msg.sender, "Not agent owner");

        agent.isActive = isActive;

        emit AgentStatusChanged(agentId, isActive);
    }

    /**
     * @inheritdoc IAgentRegistry
     */
    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return _agents[agentId];
    }

    /**
     * @inheritdoc IAgentRegistry
     */
    function getTotalAgents() external view returns (uint256) {
        return _agentIdCounter;
    }

    /**
     * @inheritdoc IAgentRegistry
     */
    function getAgents(uint256 offset, uint256 limit) external view returns (Agent[] memory agents) {
        uint256 total = _agentIdCounter;
        require(offset < total, "Offset out of bounds");

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 length = end - offset;
        agents = new Agent[](length);

        for (uint256 i = 0; i < length; i++) {
            agents[i] = _agents[offset + i + 1];
        }
    }

    /**
     * @inheritdoc IAgentRegistry
     */
    function getAgentsByOwner(address owner) external view returns (uint256[] memory) {
        return _ownerAgents[owner];
    }

    /**
     * @inheritdoc IAgentRegistry
     */
    function getAgentDeployment(uint256 agentId, uint256 chainId) external view returns (AgentDeployment memory) {
        return _deployments[agentId][chainId];
    }

    /**
     * @notice Update payment processor address
     * @param _paymentProcessor New payment processor address
     */
    function setPaymentProcessor(address _paymentProcessor) external onlyOwner {
        require(_paymentProcessor != address(0), "Invalid address");
        paymentProcessor = IPaymentProcessor(_paymentProcessor);
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
