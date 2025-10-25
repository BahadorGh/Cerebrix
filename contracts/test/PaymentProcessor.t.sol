// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PaymentProcessor} from "../src/PaymentProcessor.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract PaymentProcessorTest is Test {
    PaymentProcessor public paymentProcessor;
    MockERC20 public USDC;

    address public owner = address(this);
    address public agentRegistry = address(0x1);
    address public agentOwner = address(0x2);
    address public user = address(0x3);

    uint256 constant AGENT_ID = 1;
    uint256 constant PRICE = 10e6; // 10 USDC
    uint8 constant REVENUE_SHARE = 70; // 70% to agent, 30% to platform

    event PaymentProcessed(uint256 indexed agentId, address indexed payer, uint256 amount, uint256 timestamp);

    event FeeCollected(uint256 indexed agentId, uint256 amount, uint256 platformFee, uint256 agentRevenue);

    event RevenueWithdrawn(uint256 indexed agentId, address indexed recipient, uint256 amount);

    function setUp() public {
        // Deploy mock USDC
        USDC = new MockERC20("USD Coin", "USDC", 6);

        // Deploy PaymentProcessor
        paymentProcessor = new PaymentProcessor(address(USDC), agentRegistry);

        // Mint USDC to user
        USDC.mint(user, 1000e6); // 1000 USDC
    }

    function testConstructor() public view {
        assertEq(address(paymentProcessor.i_usdc()), address(USDC));
        assertEq(paymentProcessor.owner(), owner);
        assertEq(paymentProcessor.platformFeePercent(), 30);
    }

    function testSetAgentRegistry() public {
        address newRegistry = address(0x4);
        paymentProcessor.setAgentRegistry(newRegistry);
        assertEq(paymentProcessor.agentRegistry(), newRegistry);
    }

    function testSetAgentRegistryFailsForNonOwner() public {
        vm.prank(user);
        vm.expectRevert();
        paymentProcessor.setAgentRegistry(address(0x4));
    }

    function testProcessPayment() public {
        // User approves and initiates transaction
        vm.startPrank(user, user); // Set both msg.sender and tx.origin to user
        USDC.approve(address(paymentProcessor), PRICE);
        vm.stopPrank();

        // Process payment as agent registry (but tx.origin is user)
        vm.prank(agentRegistry, user); // msg.sender = agentRegistry, tx.origin = user
        vm.expectEmit(true, true, false, true);
        emit PaymentProcessed(AGENT_ID, user, PRICE, block.timestamp);
        paymentProcessor.processPayment(AGENT_ID, PRICE);

        // Verify payment recorded (balance not updated until collectFee is called)
        assertEq(USDC.balanceOf(address(paymentProcessor)), PRICE);
    }

    function testCollectFee() public {
        // First process payment
        vm.startPrank(user, user);
        USDC.approve(address(paymentProcessor), PRICE);
        vm.stopPrank();

        vm.prank(agentRegistry, user);
        paymentProcessor.processPayment(AGENT_ID, PRICE);

        // Collect fee
        uint256 agentRevenue = (PRICE * REVENUE_SHARE) / 100; // 70%
        uint256 platformFee = PRICE - agentRevenue; // 30%

        vm.prank(agentRegistry);
        vm.expectEmit(true, false, false, true);
        emit FeeCollected(AGENT_ID, PRICE, agentRevenue, platformFee);
        paymentProcessor.collectFee(AGENT_ID, PRICE, REVENUE_SHARE);

        // Verify splits
        assertEq(paymentProcessor.platformFees(), platformFee);
        assertEq(paymentProcessor.agentBalances(AGENT_ID), agentRevenue);
        assertEq(paymentProcessor.totalEarned(AGENT_ID), agentRevenue);
    }

    function testWithdrawRevenue() public {
        // Setup: process payment and collect fee
        vm.startPrank(user, user);
        USDC.approve(address(paymentProcessor), PRICE);
        vm.stopPrank();

        vm.startPrank(agentRegistry, user);
        paymentProcessor.processPayment(AGENT_ID, PRICE);
        paymentProcessor.collectFee(AGENT_ID, PRICE, REVENUE_SHARE);
        vm.stopPrank();

        uint256 agentRevenue = (PRICE * REVENUE_SHARE) / 100;
        uint256 balanceBefore = USDC.balanceOf(agentOwner);

        // Withdraw
        vm.prank(agentOwner);
        vm.expectEmit(true, true, false, true);
        emit RevenueWithdrawn(AGENT_ID, agentOwner, agentRevenue);
        paymentProcessor.withdrawRevenue(AGENT_ID);

        // Verify withdrawal
        assertEq(USDC.balanceOf(agentOwner), balanceBefore + agentRevenue);
        assertEq(paymentProcessor.agentBalances(AGENT_ID), 0);
        assertEq(paymentProcessor.withdrawnAmounts(AGENT_ID), agentRevenue);
    }

    function testWithdrawPlatformFees() public {
        // Setup: collect some fees
        vm.startPrank(user, user);
        USDC.approve(address(paymentProcessor), PRICE);
        vm.stopPrank();

        vm.startPrank(agentRegistry, user);
        paymentProcessor.processPayment(AGENT_ID, PRICE);
        paymentProcessor.collectFee(AGENT_ID, PRICE, REVENUE_SHARE);
        vm.stopPrank();

        uint256 platformFee = (PRICE * (100 - REVENUE_SHARE)) / 100;
        uint256 balanceBefore = USDC.balanceOf(owner);

        // Withdraw platform fees
        paymentProcessor.withdrawPlatformFees(platformFee);

        // Verify
        assertEq(USDC.balanceOf(owner), balanceBefore + platformFee);
        assertEq(paymentProcessor.platformFees(), 0);
    }

    function testGetPaymentHistory() public {
        // Process multiple payments
        vm.startPrank(user, user);
        USDC.approve(address(paymentProcessor), PRICE * 3);
        vm.stopPrank();

        vm.startPrank(agentRegistry, user);
        paymentProcessor.processPayment(AGENT_ID, PRICE);
        paymentProcessor.processPayment(AGENT_ID, PRICE);
        paymentProcessor.processPayment(AGENT_ID, PRICE);
        vm.stopPrank();

        // Get payment history
        PaymentProcessor.Payment[] memory history = paymentProcessor.getPaymentHistory(AGENT_ID, 0, 10);
        assertEq(history.length, 3);
        assertEq(history[0].amount, PRICE);
        assertEq(history[0].payer, user);
    }

    function testPauseAndUnpause() public {
        paymentProcessor.pause();

        vm.startPrank(user, user);
        USDC.approve(address(paymentProcessor), PRICE);
        vm.stopPrank();

        // Should fail when paused
        vm.prank(agentRegistry, user);
        vm.expectRevert();
        paymentProcessor.processPayment(AGENT_ID, PRICE);

        // Unpause and try again
        paymentProcessor.unpause();

        vm.prank(agentRegistry, user);
        paymentProcessor.processPayment(AGENT_ID, PRICE);
        assertEq(USDC.balanceOf(address(paymentProcessor)), PRICE);
    }
}
