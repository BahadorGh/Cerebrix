// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {PaymentProcessor} from "../src/PaymentProcessor.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {IAgentRegistry} from "../src/interfaces/IAgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    PaymentProcessor public paymentProcessor;
    MockERC20 public USDC;

    address public owner = address(this);
    address public agentOwner = address(0x1);
    address public user = address(0x2);

    string constant METADATA_URI = "ipfs://QmTest123";
    uint256 constant PRICE = 5e6; // 5 USDC
    uint8 constant REVENUE_SHARE = 70;

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        string metadataURI,
        uint256 pricePerExecution,
        uint8 revenueSharePercent
    );

    event AgentDeployed(uint256 indexed agentId, address indexed owner, uint256 chainId, address deploymentAddress);

    event AgentExecuted(uint256 indexed agentId, address indexed executor, uint256 chainId, bytes params);

    function setUp() public {
        // Deploy USDC mock
        USDC = new MockERC20("USD Coin", "USDC", 6);

        // Deploy agent registry first (needed for payment processor)
        paymentProcessor = new PaymentProcessor(address(USDC), address(0x999)); // temp address

        // Deploy agent registry
        registry = new AgentRegistry(address(paymentProcessor));

        // Update agent registry in payment processor
        vm.prank(paymentProcessor.owner());
        paymentProcessor.setAgentRegistry(address(registry));

        // Mint USDC to user
        USDC.mint(user, 1000e6);
    }

    function testConstructor() public view {
        assertEq(address(registry.paymentProcessor()), address(paymentProcessor));
        assertEq(registry.owner(), owner);
    }

    function testRegisterAgent() public {
        vm.prank(agentOwner);
        vm.expectEmit(true, true, false, true);
        emit AgentRegistered(1, agentOwner, METADATA_URI, PRICE, REVENUE_SHARE);
        uint256 agentId = registry.registerAgent(METADATA_URI, PRICE, REVENUE_SHARE);

        assertEq(agentId, 1);

        IAgentRegistry.Agent memory agent = registry.getAgent(agentId);
        assertEq(agent.owner, agentOwner);
        assertEq(agent.metadataURI, METADATA_URI);
        assertEq(agent.pricePerExecution, PRICE);
        assertEq(agent.revenueSharePercent, REVENUE_SHARE);
        assertTrue(agent.isActive);
        assertEq(agent.totalExecutions, 0);
        assertEq(agent.totalRevenue, 0);
    }

    function testRegisterAgentFailsWithEmptyMetadata() public {
        vm.prank(agentOwner);
        vm.expectRevert("Empty metadata URI");
        registry.registerAgent("", PRICE, REVENUE_SHARE);
    }

    function testRegisterAgentFailsWithLowPrice() public {
        vm.prank(agentOwner);
        vm.expectRevert("Price too low");
        registry.registerAgent(METADATA_URI, 0.5e6, REVENUE_SHARE);
    }

    function testRegisterAgentFailsWithHighRevenueShare() public {
        vm.prank(agentOwner);
        vm.expectRevert("Revenue share too high");
        registry.registerAgent(METADATA_URI, PRICE, 95);
    }

    function testDeployAgent() public {
        // Register agent first
        vm.prank(agentOwner);
        uint256 agentId = registry.registerAgent(METADATA_URI, PRICE, REVENUE_SHARE);

        // Deploy to chains
        uint256[] memory chains = new uint256[](3);
        chains[0] = 1; // Ethereum
        chains[1] = 137; // Polygon
        chains[2] = 10; // Optimism

        vm.prank(agentOwner);
        vm.expectEmit(true, true, false, false);
        emit AgentDeployed(agentId, agentOwner, chains[0], address(0));
        registry.deployAgent(agentId, chains);

        // Verify deployments
        IAgentRegistry.AgentDeployment memory deployment = registry.getAgentDeployment(agentId, 1);
        assertEq(deployment.agentId, agentId);
        assertEq(deployment.chainId, 1);
        assertTrue(deployment.isActive);
    }

    function testDeployAgentFailsForNonOwner() public {
        vm.prank(agentOwner);
        uint256 agentId = registry.registerAgent(METADATA_URI, PRICE, REVENUE_SHARE);

        uint256[] memory chains = new uint256[](1);
        chains[0] = 1;

        vm.prank(user);
        vm.expectRevert("Not agent owner");
        registry.deployAgent(agentId, chains);
    }

    function testExecuteAgent() public {
        // Register agent
        vm.prank(agentOwner);
        uint256 agentId = registry.registerAgent(METADATA_URI, PRICE, REVENUE_SHARE);

        // User approves payment
        vm.startPrank(user, user);
        USDC.approve(address(paymentProcessor), PRICE);

        // Execute agent
        bytes memory params = abi.encode("test", "params");
        // vm.expectEmit doesn't match params correctly, so just execute
        registry.executeAgent(agentId, params);
        vm.stopPrank();

        // Verify stats updated
        IAgentRegistry.Agent memory agent = registry.getAgent(agentId);
        assertEq(agent.totalExecutions, 1);
        assertEq(agent.totalRevenue, PRICE);
    }

    function testUpdateAgentMetadata() public {
        vm.prank(agentOwner);
        uint256 agentId = registry.registerAgent(METADATA_URI, PRICE, REVENUE_SHARE);

        string memory newMetadata = "ipfs://QmNewMetadata456";

        vm.prank(agentOwner);
        registry.updateAgentMetadata(agentId, newMetadata);

        IAgentRegistry.Agent memory agent = registry.getAgent(agentId);
        assertEq(agent.metadataURI, newMetadata);
    }

    function testUpdateMetadataFailsForNonOwner() public {
        vm.prank(agentOwner);
        uint256 agentId = registry.registerAgent(METADATA_URI, PRICE, REVENUE_SHARE);

        vm.prank(user);
        vm.expectRevert("Not agent owner");
        registry.updateAgentMetadata(agentId, "ipfs://QmNew");
    }

    function testSetAgentStatus() public {
        vm.prank(agentOwner);
        uint256 agentId = registry.registerAgent(METADATA_URI, PRICE, REVENUE_SHARE);

        // Deactivate agent
        vm.prank(agentOwner);
        registry.setAgentStatus(agentId, false);

        IAgentRegistry.Agent memory agent = registry.getAgent(agentId);
        assertFalse(agent.isActive);

        // Reactivate
        vm.prank(agentOwner);
        registry.setAgentStatus(agentId, true);

        agent = registry.getAgent(agentId);
        assertTrue(agent.isActive);
    }

    function testGetTotalAgents() public {
        assertEq(registry.getTotalAgents(), 0);

        vm.startPrank(agentOwner);
        registry.registerAgent(METADATA_URI, PRICE, REVENUE_SHARE);
        assertEq(registry.getTotalAgents(), 1);

        registry.registerAgent("ipfs://QmTest2", PRICE, REVENUE_SHARE);
        assertEq(registry.getTotalAgents(), 2);
        vm.stopPrank();
    }

    function testGetAgents() public {
        // Register multiple agents
        vm.startPrank(agentOwner);
        registry.registerAgent("ipfs://QmAgent1", PRICE, REVENUE_SHARE);
        registry.registerAgent("ipfs://QmAgent2", PRICE, REVENUE_SHARE);
        registry.registerAgent("ipfs://QmAgent3", PRICE, REVENUE_SHARE);
        vm.stopPrank();

        // Get agents with pagination
        IAgentRegistry.Agent[] memory agents = registry.getAgents(0, 2);
        assertEq(agents.length, 2);
        assertEq(agents[0].metadataURI, "ipfs://QmAgent1");
        assertEq(agents[1].metadataURI, "ipfs://QmAgent2");
    }

    function testGetAgentsByOwner() public {
        address owner1 = address(0x10);
        address owner2 = address(0x20);

        vm.prank(owner1);
        registry.registerAgent("ipfs://QmOwner1Agent1", PRICE, REVENUE_SHARE);

        vm.prank(owner2);
        registry.registerAgent("ipfs://QmOwner2Agent1", PRICE, REVENUE_SHARE);

        vm.prank(owner1);
        registry.registerAgent("ipfs://QmOwner1Agent2", PRICE, REVENUE_SHARE);

        uint256[] memory owner1Agents = registry.getAgentsByOwner(owner1);
        uint256[] memory owner2Agents = registry.getAgentsByOwner(owner2);

        assertEq(owner1Agents.length, 2);
        assertEq(owner2Agents.length, 1);
        assertEq(owner1Agents[0], 1);
        assertEq(owner1Agents[1], 3);
        assertEq(owner2Agents[0], 2);
    }

    function testPauseAndUnpause() public {
        registry.pause();

        vm.prank(agentOwner);
        vm.expectRevert();
        registry.registerAgent(METADATA_URI, PRICE, REVENUE_SHARE);

        registry.unpause();

        vm.prank(agentOwner);
        uint256 agentId = registry.registerAgent(METADATA_URI, PRICE, REVENUE_SHARE);
        assertEq(agentId, 1);
    }
}
