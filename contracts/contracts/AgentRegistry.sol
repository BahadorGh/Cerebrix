// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IAgentRegistry.sol";

contract AgentRegistry is IAgentRegistry, Ownable, ReentrancyGuard, Pausable {
    uint256 public constant MAX_REVENUE_SHARE = 95;
    uint256 public constant MIN_PRICE = 1e6; // 1 PYUSD minimum

    uint256 private _nextAgentId = 1;

    mapping(uint256 => Agent) private _agents;
    mapping(address => uint256[]) private _ownerAgents;
    mapping(uint256 => mapping(uint256 => address)) private _deployments;

    constructor() Ownable(msg.sender) {}

    function registerAgent(string calldata metadataURI, uint256 price, uint8 revenueShare)
        external
        override
        returns (uint256)
    {
        require(bytes(metadataURI).length > 0, "Empty metadata URI");
        require(price >= MIN_PRICE, "Price too low");
        require(revenueShare <= MAX_REVENUE_SHARE, "Revenue share too high");

        uint256 agentId = _nextAgentId++;

        _agents[agentId] = Agent({
            owner: msg.sender,
            metadataURI: metadataURI,
            pricePerExecution: price,
            totalExecutions: 0,
            totalRevenue: 0,
            isActive: true,
            revenueSharePercent: revenueShare
        });

        _ownerAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender);
        return agentId;
    }

    function deployAgent(uint256 agentId, uint256[] calldata targetChains) external payable override nonReentrant {
        require(_agents[agentId].isActive, "Agent not active");
        require(targetChains.length > 0, "No target chains");
        require(msg.value >= targetChains.length * 0.01 ether, "Insufficient deployment fee");

        for (uint256 i = 0; i < targetChains.length; i++) {
            _deployments[agentId][targetChains[i]] = msg.sender;
            emit AgentDeployed(agentId, msg.sender, targetChains[i]);
        }
    }

    function executeAgent(uint256 agentId, bytes calldata params) external payable override nonReentrant {
        Agent storage agent = _agents[agentId];
        require(agent.isActive, "Agent not active");
        require(msg.value >= agent.pricePerExecution, "Insufficient payment");

        agent.totalExecutions++;
        agent.totalRevenue += msg.value;

        emit AgentExecuted(agentId, msg.sender, msg.value);

        // Revenue split will be handled by PaymentProcessor
    }

    function getAgent(uint256 agentId) external view override returns (Agent memory) {
        return _agents[agentId];
    }

    function toggleAgentStatus(uint256 agentId) external {
        require(_agents[agentId].owner == msg.sender, "Not owner");
        _agents[agentId].isActive = !_agents[agentId].isActive;
    }
}
