// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPaymentProcessor} from "./interfaces/IPaymentProcessor.sol";

/**
 * @title PaymentProcessor
 * @notice Handles USDC payments and revenue distribution for the marketplace
 * @dev Implements IPaymentProcessor with secure payment processing and revenue splits
 */
contract PaymentProcessor is IPaymentProcessor, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable i_usdc;

    address public agentRegistry;
    uint256 public platformFees;
    uint8 public platformFeePercent = 30;

    mapping(uint256 agentId => uint256 revenueBalance) public agentBalances;
    mapping(uint256 agentId => uint256 amounts) public withdrawnAmounts;
    mapping(uint256 agentId => uint256 earned) public totalEarned;
    mapping(uint256 agentId => Payment[]) private _paymentHistory;

    modifier onlyAgentRegistry() {
        require(msg.sender == agentRegistry, "Only agent registry");
        _;
    }

    constructor(address _usdc, address _agentRegistry) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_agentRegistry != address(0), "Invalid registry address");

        i_usdc = IERC20(_usdc);
        agentRegistry = _agentRegistry;
    }

    /**
     * @inheritdoc IPaymentProcessor
     */
    function processPayment(uint256 agentId, uint256 amount) external onlyAgentRegistry whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be positive");

        // Transfer i_usdc from payer to this contract
        i_usdc.safeTransferFrom(tx.origin, address(this), amount);

        // Record payment
        _paymentHistory[agentId].push(
            Payment({payer: tx.origin, amount: amount, timestamp: block.timestamp, settled: false, agentId: agentId})
        );

        emit PaymentProcessed(agentId, tx.origin, amount, block.timestamp);
    }

    /**
     * @inheritdoc IPaymentProcessor
     */
    function collectFee(uint256 agentId, uint256 amount, uint8 developerShare)
        external
        onlyAgentRegistry
        whenNotPaused
    {
        require(amount > 0, "Amount must be positive");
        require(developerShare <= 100, "Invalid developer share");

        // Calculate splits
        uint256 developerAmount = (amount * developerShare) / 100;
        uint256 platformAmount = amount - developerAmount;

        // Update balances
        agentBalances[agentId] += developerAmount;
        totalEarned[agentId] += developerAmount;
        platformFees += platformAmount;

        // Mark payment as settled
        uint256 historyLength = _paymentHistory[agentId].length;
        if (historyLength > 0) {
            _paymentHistory[agentId][historyLength - 1].settled = true;
        }

        emit FeeCollected(agentId, amount, developerAmount, platformAmount);
    }

    /**
     * @inheritdoc IPaymentProcessor
     */
    function withdrawRevenue(uint256 agentId) external whenNotPaused nonReentrant {
        uint256 pending = agentBalances[agentId];
        require(pending > 0, "No pending revenue");

        // Reset balance before transfer (checks-effects-interactions)
        agentBalances[agentId] = 0;
        withdrawnAmounts[agentId] += pending;

        // Transfer i_usdc to caller
        i_usdc.safeTransfer(msg.sender, pending);

        emit RevenueWithdrawn(agentId, msg.sender, pending);
    }

    /**
     * @inheritdoc IPaymentProcessor
     */
    function withdrawPlatformFees(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(amount <= platformFees, "Insufficient platform fees");

        platformFees -= amount;
        i_usdc.safeTransfer(owner(), amount);
    }

    /**
     * @inheritdoc IPaymentProcessor
     */
    function getPendingRevenue(uint256 agentId) external view returns (uint256) {
        return agentBalances[agentId];
    }

    /**
     * @inheritdoc IPaymentProcessor
     */
    function getRevenueBalance(uint256 agentId) external view returns (RevenueBalance memory) {
        return RevenueBalance({
            totalEarned: totalEarned[agentId],
            withdrawn: withdrawnAmounts[agentId],
            pending: agentBalances[agentId]
        });
    }

    /**
     * @inheritdoc IPaymentProcessor
     */
    function getPaymentHistory(uint256 agentId, uint256 offset, uint256 limit)
        external
        view
        returns (Payment[] memory payments)
    {
        Payment[] storage history = _paymentHistory[agentId];
        uint256 total = history.length;

        if (offset >= total) {
            return new Payment[](0);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 length = end - offset;
        payments = new Payment[](length);

        for (uint256 i = 0; i < length; i++) {
            payments[i] = history[offset + i];
        }
    }

    /**
     * @inheritdoc IPaymentProcessor
     */
    function getPlatformFees() external view returns (uint256) {
        return platformFees;
    }

    /**
     * @inheritdoc IPaymentProcessor
     */
    function getUSDCToken() external view returns (IERC20) {
        return i_usdc;
    }

    /**
     * @notice Update agent registry address
     * @param _agentRegistry New registry address
     */
    function setAgentRegistry(address _agentRegistry) external onlyOwner {
        require(_agentRegistry != address(0), "Invalid address");
        agentRegistry = _agentRegistry;
    }

    /**
     * @notice Update platform fee percentage
     * @param _platformFeePercent New fee percentage (0-100)
     */
    function setPlatformFeePercent(uint8 _platformFeePercent) external onlyOwner {
        require(_platformFeePercent <= 100, "Invalid percentage");
        platformFeePercent = _platformFeePercent;
        emit PlatformFeeUpdated(_platformFeePercent);
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
