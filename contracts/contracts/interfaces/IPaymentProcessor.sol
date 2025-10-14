// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPaymentProcessor {
    struct Payment {
        address payer;
        uint256 amount;
        uint256 timestamp;
        bool settled;
    }

    event PaymentProcessed(uint256 indexed agentId, address indexed payer, uint256 amount);
    event RevenueWithdrawn(uint256 indexed agentId, address indexed recipient, uint256 amount);

    function processPayment(uint256 agentId, address payer) external;
    function withdrawRevenue(uint256 agentId) external;
    function getPendingRevenue(uint256 agentId) external view returns (uint256);
}
