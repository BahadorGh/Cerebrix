// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PaymentProcessor} from "../src/PaymentProcessor.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

/**
 * @title DeployMarketplace
 * @notice Deployment script for Agent Marketplace contracts
 * @dev Usage: forge script script/Deploy.s.sol:DeployMarketplace --rpc-url $RPC_URL --broadcast --verify
 */
contract DeployMarketplace is Script {
    // USDC addresses on different networks (6 decimals)
    address constant SEPOLIA_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant MAINNET_USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant ARBITRUM_SEPOLIA_USDC = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
    address constant OPTIMISM_SEPOLIA_USDC = 0x5fd84259d66Cd46123540766Be93DFE6D43130D7;
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant POLYGON_AMOY_USDC = 0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address usdcAddress = getUSDCAddress();

        console.log("\n========================================");
        console.log("Deploying Agent Marketplace");
        console.log("========================================");
        console.log("Chain ID:", block.chainid);
        console.log("Network:", getNetworkName());
        console.log("Deployer:", deployer);
        console.log("USDC Address:", usdcAddress);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy PaymentProcessor
        console.log("Step 1: Deploying PaymentProcessor...");
        PaymentProcessor paymentProcessor = new PaymentProcessor(
            usdcAddress,
            address(1) // Temporary placeholder
        );
        console.log("  PaymentProcessor:", address(paymentProcessor));

        // Step 2: Deploy AgentRegistry
        console.log("\nStep 2: Deploying AgentRegistry...");
        AgentRegistry agentRegistry = new AgentRegistry(address(paymentProcessor));
        console.log("  AgentRegistry:", address(agentRegistry));

        // Step 3: Update PaymentProcessor with correct AgentRegistry
        console.log("\nStep 3: Updating PaymentProcessor with AgentRegistry...");
        paymentProcessor.setAgentRegistry(address(agentRegistry));
        console.log("  Updated successfully!");

        vm.stopBroadcast();

        // Print deployment summary
        console.log("\n========================================");
        console.log("DEPLOYMENT SUCCESSFUL");
        console.log("========================================");
        console.log("Network:", getNetworkName());
        console.log("Chain ID:", block.chainid);
        console.log("");
        console.log("Contract Addresses:");
        console.log("  PaymentProcessor:", address(paymentProcessor));
        console.log("  AgentRegistry:", address(agentRegistry));
        console.log("  USDC Token:", usdcAddress);
        console.log("");
        console.log("Next Steps:");
        console.log("1. Update backend/.env:");
        console.log("   PAYMENT_PROCESSOR_ADDRESS=", address(paymentProcessor));
        console.log("   AGENT_REGISTRY_ADDRESS=", address(agentRegistry));
        console.log("");
        console.log("2. Update frontend/src/config/deployments.ts");
        console.log("");
        console.log("3. Verify contracts:");
        console.log("   forge verify-contract", address(paymentProcessor), "PaymentProcessor --chain-id", block.chainid);
        console.log("   forge verify-contract", address(agentRegistry), "AgentRegistry --chain-id", block.chainid);
        console.log("");
        console.log("NOTE: For deterministic addresses across chains:");
        console.log("Use a FRESH WALLET and deploy on all chains starting from NONCE 0!");
        console.log("========================================\n");
    }

    function getUSDCAddress() internal view returns (address) {
        if (block.chainid == 11155111) {
            // Sepolia
            return SEPOLIA_USDC;
        } else if (block.chainid == 1) {
            // Mainnet
            return MAINNET_USDC;
        } else if (block.chainid == 421614) {
            // Arbitrum Sepolia
            return ARBITRUM_SEPOLIA_USDC;
        } else if (block.chainid == 11155420) {
            // Optimism Sepolia
            return OPTIMISM_SEPOLIA_USDC;
        } else if (block.chainid == 84532) {
            // Base Sepolia
            return BASE_SEPOLIA_USDC;
        } else if (block.chainid == 80002) {
            // Polygon Amoy
            return POLYGON_AMOY_USDC;
        } else {
            revert("Unsupported network - add USDC address for this chain");
        }
    }

    function getNetworkName() internal view returns (string memory) {
        if (block.chainid == 1) return "Ethereum Mainnet";
        if (block.chainid == 11155111) return "Sepolia";
        if (block.chainid == 137) return "Polygon";
        if (block.chainid == 80002) return "Polygon Amoy";
        if (block.chainid == 10) return "Optimism";
        if (block.chainid == 11155420) return "Optimism Sepolia";
        if (block.chainid == 42161) return "Arbitrum";
        if (block.chainid == 421614) return "Arbitrum Sepolia";
        if (block.chainid == 8453) return "Base";
        if (block.chainid == 84532) return "Base Sepolia";
        if (block.chainid == 31337) return "Local";
        return "Unknown";
    }
}
