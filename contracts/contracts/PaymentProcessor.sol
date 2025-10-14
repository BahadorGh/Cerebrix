// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPaymentProcessor.sol";
import "./interfaces/IAgentRegistry.sol";

contract PaymentProcessor is IPaymentProcessor, ReentrancyGuard {
    IERC20 public immutable pyusd;
    IAgentRegistry public immutable registry;

    uint256 public platformBalance;

    mapping(uint256 => uint256) public agentBalances;
    mapping(address => uint256) public developerBalances;
    mapping(uint256 => Payment[]) public agentPayments;

    constructor(address _pyusd, address _registry) {
        pyusd = IERC20(_pyusd);
        registry = IAgentRegistry(_registry);
    }

    function processPayment(uint256 agentId, address payer) external override nonReentrant {
        IAgentRegistry.Agent memory agent = registry.getAgent(agentId);
        require(agent.isActive, "Agent not active");

        uint256 amount = agent.pricePerExecution;
        require(pyusd.transferFrom(payer, address(this), amount), "Transfer failed");

        // Calculate splits
        uint256 developerShare = (amount * agent.revenueSharePercent) / 100;
        uint256 platformShare = amount - developerShare;

        // Update balances
        developerBalances[agent.owner] += developerShare;
        platformBalance += platformShare;

        // Record payment
        agentPayments[agentId].push(Payment({payer: payer, amount: amount, timestamp: block.timestamp, settled: false}));

        emit PaymentProcessed(agentId, payer, amount);
        emit RevenueSplit(agentId, amount, agent.owner, address(this));
    }

    function withdrawRevenue(uint256 agentId) external override nonReentrant {
        IAgentRegistry.Agent memory agent = registry.getAgent(agentId);
        require(agent.owner == msg.sender, "Not agent owner");

        uint256 balance = developerBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");

        developerBalances[msg.sender] = 0;
        require(pyusd.transfer(msg.sender, balance), "Transfer failed");

        emit RevenueWithdrawn(agentId, msg.sender, balance);
    }

    function getPendingRevenue(uint256 agentId) external view override returns (uint256) {
        IAgentRegistry.Agent memory agent = registry.getAgent(agentId);
        return developerBalances[agent.owner];
    }
}
