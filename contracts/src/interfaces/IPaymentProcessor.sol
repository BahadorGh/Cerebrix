// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IPaymentProcessor
 * @notice Interface for handling USDC payments and revenue splits
 * @dev Manages fee collection, revenue distribution, and withdrawals
 */
interface IPaymentProcessor {
    struct Payment {
        address payer;
        uint256 amount;
        uint256 timestamp;
        bool settled;
        uint256 agentId;
    }

    struct RevenueBalance {
        uint256 totalEarned;
        uint256 withdrawn;
        uint256 pending;
    }

    event PaymentProcessed(uint256 indexed agentId, address indexed payer, uint256 amount, uint256 timestamp);
    event RevenueWithdrawn(uint256 indexed agentId, address indexed recipient, uint256 amount);
    event FeeCollected(uint256 indexed agentId, uint256 amount, uint256 developerShare, uint256 platformShare);
    event PlatformFeeUpdated(uint8 newFee);

    /**
     * @notice Process a payment for agent execution
     * @param agentId The ID of the agent being executed
     * @param amount Amount to pay in USDC
     */
    function processPayment(uint256 agentId, uint256 amount) external;

    /**
     * @notice Collect fee and split revenue between developer and platform
     * @param agentId The ID of the agent
     * @param amount Total fee amount
     * @param developerShare Developer's share percentage
     */
    function collectFee(uint256 agentId, uint256 amount, uint8 developerShare) external;

    /**
     * @notice Withdraw pending revenue for an agent
     * @param agentId The ID of the agent
     */
    function withdrawRevenue(uint256 agentId) external;

    /**
     * @notice Withdraw platform fees (admin only)
     * @param amount Amount to withdraw
     */
    function withdrawPlatformFees(uint256 amount) external;

    /**
     * @notice Get pending revenue for an agent
     * @param agentId The ID of the agent
     * @return amount Pending revenue amount
     */
    function getPendingRevenue(uint256 agentId) external view returns (uint256 amount);

    /**
     * @notice Get total revenue balance for an agent
     * @param agentId The ID of the agent
     * @return balance RevenueBalance struct
     */
    function getRevenueBalance(uint256 agentId) external view returns (RevenueBalance memory balance);

    /**
     * @notice Get payment history for an agent
     * @param agentId The ID of the agent
     * @param offset Starting index
     * @param limit Number of payments to return
     * @return payments Array of Payment structs
     */
    function getPaymentHistory(uint256 agentId, uint256 offset, uint256 limit)
        external
        view
        returns (Payment[] memory payments);

    /**
     * @notice Get total platform fees collected
     * @return amount Total platform fees
     */
    function getPlatformFees() external view returns (uint256 amount);

    /**
     * @notice Get USDC token address
     * @return token USDC token contract address
     */
    function getUSDCToken() external view returns (IERC20 token);
}
