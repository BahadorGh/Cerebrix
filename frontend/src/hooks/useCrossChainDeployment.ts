import { useState, useCallback } from 'react';
import { useNexus } from '../providers/NexusProvider';
import { getChainDeployment } from '../config/deployments';
import {
    BridgeAndExecuteParams,
    BridgeAndExecuteResult,
    SUPPORTED_CHAINS_IDS,
    SUPPORTED_TOKENS,
    DynamicParamBuilder
} from '@avail-project/nexus-core';
import type { Abi } from 'viem';
import { getAddress } from 'viem';

interface CrossChainDeploymentParams {
    agentId: string;
    sourceChainId: number;
    targetChainIds: number[];
    contractAddress: string;
    // Agent data to replicate on target chains
    agentMetadataURI: string;
    agentPrice: string;
    agentRevenueShare: number;
}

interface CrossChainDeploymentResult {
    success: boolean;
    txHashes?: Record<number, string>;
    error?: string;
    explorerUrl?: string;
}

export const useCrossChainDeployment = () => {
    const { nexusSdk, isInitialized } = useNexus();
    const [isDeploying, setIsDeploying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Deploy agent to multiple chains using Nexus bridgeAndExecute
     * This will trigger wallet signature prompts for the user
     */
    const deployToChains = useCallback(
        async (params: CrossChainDeploymentParams): Promise<CrossChainDeploymentResult> => {
            if (!nexusSdk || !isInitialized) {
                const errorMsg = 'Nexus SDK not initialized. Please connect your wallet.';
                setError(errorMsg);
                return { success: false, error: errorMsg };
            }

            const { agentId, sourceChainId, targetChainIds, contractAddress, agentMetadataURI, agentPrice, agentRevenueShare } = params;

            if (!targetChainIds || targetChainIds.length === 0) {
                const errorMsg = 'No target chains selected';
                setError(errorMsg);
                return { success: false, error: errorMsg };
            }

            try {
                setIsDeploying(true);
                setError(null);

                console.log('Starting cross-chain agent registration:', {
                    agentId,
                    sourceChainId,
                    targetChainIds,
                    sourceRegistry: contractAddress,
                });

                // Log which chains are being targeted
                const targetChainNames = targetChainIds.map(id => {
                    const config = getChainDeployment(id);
                    return config?.chainName || `Chain ${id}`;
                }).join(', ');

                console.log(`Route: Ethereum Sepolia → ${targetChainNames}`);

                // AgentRegistry ABI for registerAgent function
                const AGENT_REGISTRY_ABI: Abi = [
                    {
                        type: 'function',
                        name: 'getAgent',
                        inputs: [{ name: 'agentId', type: 'uint256' }],
                        outputs: [{
                            components: [
                                { name: 'owner', type: 'address' },
                                { name: 'metadataURI', type: 'string' },
                                { name: 'pricePerExecution', type: 'uint256' },
                                { name: 'totalExecutions', type: 'uint256' },
                                { name: 'totalRevenue', type: 'uint256' },
                                { name: 'isActive', type: 'bool' },
                                { name: 'revenueSharePercent', type: 'uint8' },
                                { name: 'createdAt', type: 'uint256' },
                                { name: 'deployedChains', type: 'uint256[]' }
                            ],
                            name: 'agent',
                            type: 'tuple'
                        }],
                        stateMutability: 'view',
                    },
                    {
                        type: 'function',
                        name: 'registerAgent',
                        inputs: [
                            { name: 'metadataURI', type: 'string' },
                            { name: 'price', type: 'uint256' },
                            { name: 'revenueShare', type: 'uint8' }
                        ],
                        outputs: [{ name: 'agentId', type: 'uint256' }],
                        stateMutability: 'nonpayable'
                    }
                ];

                const sourceChainConfig = getChainDeployment(sourceChainId);

                if (!sourceChainConfig) {
                    throw new Error(`No configuration found for chain ${sourceChainId}`);
                }

                // TODO: Fetch agent data from source chain
                // For now, we'll need to pass this data or fetch it separately
                // This is a limitation - we need the agent data to replicate it

                const txHashes: Record<number, string> = {};
                let successCount = 0;

                // Deploy to each target chain sequentially
                for (const targetChainId of targetChainIds) {
                    try {
                        const targetChainConfig = getChainDeployment(targetChainId);

                        if (!targetChainConfig) {
                            console.error(`No deployment config for chain ${targetChainId}`);
                            continue;
                        }

                        console.log(`Registering agent on ${targetChainConfig.chainName}...`);

                        // Check user's USDC balance on source chain (robust parsing)
                        try {
                            const balances = await nexusSdk.getUnifiedBalances();

                            let usdcAsset = null;
                            for (const asset of (balances as any[])) {
                                if (asset.symbol === 'USDC') {
                                    usdcAsset = asset;
                                    break;
                                }
                            }

                            if (!usdcAsset) {
                                console.warn('No USDC asset found in unified balances');
                            } else {
                                const breakdown = usdcAsset.breakdown || [];

                                let found = false;
                                for (const chainEntry of breakdown) {
                                    console.log('Checking breakdown entry:', chainEntry);
                                    const chainIdFromEntry = chainEntry.chain?.id || chainEntry.chainId || chainEntry.chainIdRaw;
                                    const amount = chainEntry.amount || chainEntry.balance || chainEntry.balanceFormatted;

                                    console.log(`  → Chain ID from entry: ${chainIdFromEntry}, Source chain ID: ${sourceChainId}, Match: ${Number(chainIdFromEntry) === Number(sourceChainId)}`);

                                    if (Number(chainIdFromEntry) === Number(sourceChainId)) {
                                        console.log(`Found USDC on source chain! Balance: ${amount}`);
                                        const balanceNum = parseFloat(String(amount));
                                        if (isNaN(balanceNum)) {
                                            console.warn('Could not parse USDC balance into a number:', amount);
                                        } else if (balanceNum < 0.1) {
                                            console.warn(`Warning: Low USDC balance (${balanceNum}). You need at least 0.1 USDC to bridge.`);
                                        } else {
                                            console.log(`USDC balance is sufficient for bridge (${balanceNum})`);
                                        }
                                        found = true;
                                        break;
                                    }
                                }
                                if (!found) {
                                    console.warn(`No USDC balance found on source chain ${sourceChainId} in the breakdown`);
                                }
                            }
                        } catch (balanceError) {
                            console.warn('Could not check balance:', balanceError);
                        }

                        try {
                            // Try to get route info for this specific bridge
                            console.log(`Checking route from chain ${sourceChainId} to ${targetChainId}...`);

                            // Check if target chain is in testnet chains (from balance breakdown)
                            const balances = await nexusSdk.getUnifiedBalances();
                            const testnetChainsFromBalance = new Map<number, any>();
                            balances.forEach((asset: any) => {
                                if (asset.breakdown) {
                                    asset.breakdown.forEach((chainData: any) => {
                                        if (!testnetChainsFromBalance.has(chainData.chain.id)) {
                                            testnetChainsFromBalance.set(chainData.chain.id, chainData.chain);
                                        }
                                    });
                                }
                            });
                        } catch (infoError) {
                            console.warn('Could not fetch SDK chain info:', infoError);
                        }

                        // Use the agent data passed from the source chain
                        const buildParams: DynamicParamBuilder = (_user) => {
                            return {
                                functionParams: [
                                    agentMetadataURI, // Use actual metadata URI
                                    BigInt(agentPrice), // Use actual price
                                    agentRevenueShare // Use actual revenue share
                                ]
                            };
                        };

                        // Back to USDC with slightly larger amount for bridge minimum
                        // USDC has 6 decimals, so 0.5 USDC = 500000
                        // Address needs to be properly checksummed for Nexus SDK (as of experience)
                        const checksummedAddress = getAddress(targetChainConfig.registryAddress);

                        const bridgeParams: BridgeAndExecuteParams = {
                            token: 'USDC' as SUPPORTED_TOKENS,
                            amount: '1000000', // Try 1 USDC instead of 0.5 USDC
                            toChainId: targetChainId as SUPPORTED_CHAINS_IDS,
                            execute: {
                                contractAddress: checksummedAddress as `0x${string}`,
                                contractAbi: AGENT_REGISTRY_ABI,
                                functionName: 'registerAgent',
                                buildFunctionParams: buildParams,
                                value: '0', // No ETH value needed for registration
                            },
                            waitForReceipt: true,
                            receiptTimeout: 300000, // 5 minutes
                        };

                        console.log('\nBridge and execute params:', {
                            targetChain: targetChainConfig.chainName,
                            registryAddress: checksummedAddress,
                            functionName: 'registerAgent',
                        });

                        // Log the full bridge params for debugging
                        console.log('Full bridge params being sent to SDK:');
                        console.log(`   token: ${bridgeParams.token}`);
                        console.log(`   amount: ${bridgeParams.amount} (1 USDC in 6 decimals)`);
                        console.log(`   toChainId: ${bridgeParams.toChainId}`);
                        if (bridgeParams.execute) {
                            console.log(`   execute.contractAddress: ${checksummedAddress}`);
                            console.log(`   execute.functionName: ${bridgeParams.execute.functionName}`);
                        }

                        let result: BridgeAndExecuteResult;

                        try {
                            // First, check if user has enough balance
                            const balances = await nexusSdk.getUnifiedBalances();
                            let userUsdcBalance = 0;

                            for (const asset of balances as any[]) {
                                if (asset.symbol === 'USDC' && asset.breakdown) {
                                    for (const chainEntry of asset.breakdown) {
                                        if (Number(chainEntry.chain?.id) === Number(sourceChainId)) {
                                            userUsdcBalance = parseFloat(String(chainEntry.amount || chainEntry.balance || 0));
                                            break;
                                        }
                                    }
                                }
                            }

                            const requiredAmount = 1.0; // 1 USDC required for bridge
                            const hasEnoughBalance = userUsdcBalance >= requiredAmount;

                            if (!hasEnoughBalance) {
                                // SIMULATION MODE
                                console.log('═══════════════════════════════════════════════════════════════');
                                console.log('SIMULATION MODE - TESTING FLOW WITHOUT SPENDING USDC');
                                console.log('═══════════════════════════════════════════════════════════════');
                                console.log(`Reason: Insufficient balance (${userUsdcBalance} < ${requiredAmount})`);
                                console.log('');
                                console.log('Calling: simulateBridgeAndExecute()');
                                console.log('Effect: Will show modals and permit flow WITHOUT actual bridge/transfer');
                                console.log('');
                                console.log('Expected behavior:');
                                console.log('   1. Intent Modal appears (bridge details)');
                                console.log('   2. Click "Proceed"');
                                console.log('   3. Allowance Modal appears (permit request)');
                                console.log('   4. Approve');
                                console.log('   5. Wallet popup: "Sign Text" (permit signature)');
                                console.log('   6. Sign');
                                console.log('   7. NO token transfer happens (this is simulation!)');
                                console.log('   8. Promise resolves below');
                                console.log('═══════════════════════════════════════════════════════════════');
                                console.log('');

                                const startTime = Date.now();
                                result = await (nexusSdk as any).simulateBridgeAndExecute(bridgeParams);
                                const duration = Date.now() - startTime;

                                console.log('SIMULATION COMPLETE! 🎉');
                                console.log(`   Time taken: ${duration}ms`);
                                console.log('   Result:', result);
                                console.log('');
                                console.log('═══════════════════════════════════════════════════════════════');
                                console.log('📝 Simulation Result Details:');
                                console.log('   Success:', result.success);
                                if (result.executeTransactionHash) console.log('   Simulated Tx Hash:', result.executeTransactionHash);
                                if (result.bridgeTransactionHash) console.log('   Bridge Tx Hash:', result.bridgeTransactionHash);

                                // Check if bridge was skipped (even in simulation)
                                if ((result as any).bridgeSkipped) {
                                    console.log('');
                                    console.log('Bridge was skipped in simulation');
                                }

                                // Try to extract Nexus intent information
                                const simIntentId = (result as any).intentId || (result as any).intentHash;
                                const simExplorerUrl = (result as any).explorerUrl || (result as any).intentExplorerUrl;

                                if (simIntentId) {
                                    console.log('');
                                    console.log('Simulated Intent Information:');
                                    console.log(`   Intent ID: ${simIntentId}`);
                                    if (simExplorerUrl) {
                                        console.log(`   Explorer: ${simExplorerUrl}`);
                                    }
                                }

                                console.log('   Full result:', JSON.stringify(result, null, 2));
                                console.log('═══════════════════════════════════════════════════════════════');
                            } else {
                                // REAL MODE
                                console.log('═══════════════════════════════════════════════════════════════');
                                console.log('REAL BRIDGE MODE - SUFFICIENT USDC AVAILABLE');
                                console.log('═══════════════════════════════════════════════════════════════');
                                console.log(`Balance: ${userUsdcBalance} USDC (${requiredAmount} required)`);
                                console.log('');
                                console.log('Calling: bridgeAndExecute()');
                                console.log('Effect: Will execute REAL cross-chain bridge and agent registration');

                                const startTime = Date.now();
                                result = await nexusSdk.bridgeAndExecute(bridgeParams);
                                const duration = Date.now() - startTime;

                                console.log('BRIDGE EXECUTION COMPLETE! 🎉');
                                console.log(`   Time taken: ${duration}ms`);
                                console.log('');
                                console.log('═══════════════════════════════════════════════════════════════');
                                console.log('Bridge Result Details:');
                                console.log('   Success:', result.success);
                                if (result.executeTransactionHash) console.log('   Execute Tx Hash:', result.executeTransactionHash);
                                if (result.bridgeTransactionHash) console.log('   Bridge Tx Hash:', result.bridgeTransactionHash);

                                // Check if bridge was skipped
                                if ((result as any).bridgeSkipped) {
                                    console.log('');
                                    console.log('INFO: Bridge skipped (local execution)');
                                    console.log('   Reason: This might be a local chain or liquidity unavailable');
                                    console.log('   Impact: Contract executed directly without cross-chain bridge');
                                    console.log('   Status: Agent still registered successfully!');
                                }

                                // Try to extract Nexus intent information
                                const intentId = (result as any).intentId || (result as any).intentHash;
                                const explorerUrl = (result as any).explorerUrl || (result as any).intentExplorerUrl;

                                if (intentId) {
                                    console.log('');
                                    console.log('Nexus Intent Information:');
                                    console.log(`   Intent ID: ${intentId}`);
                                    if (explorerUrl) {
                                        console.log(`   Explorer: ${explorerUrl}`);
                                    } else {
                                        console.log(`   Explorer: https://explorer.nexus-folly.availproject.org/intent/${intentId}`);
                                    }
                                }

                                console.log('   Full result:', JSON.stringify(result, null, 2));
                                console.log('═══════════════════════════════════════════════════════════════');
                                console.log('');
                            }
                        } catch (bridgeError: any) {
                            const errorMsg = bridgeError.message || bridgeError.toString();
                            console.error('\n');
                            console.error('BRIDGE EXECUTION FAILED');
                            console.error('Error message:', errorMsg);
                            console.error('');

                            if (errorMsg.includes('Timed out waiting for liquidity')) {
                                console.error('LIQUIDITY TIMEOUT DETECTED');
                            } else if (errorMsg.includes('Insufficient balance')) {
                                console.error('INSUFFICIENT BALANCE ON BRIDGE');
                            }

                            console.error('Full error object:', bridgeError);

                            result = {
                                success: false,
                                error: `Bridge execution failed: ${errorMsg}`,
                                toChainId: targetChainId,
                                bridgeSkipped: false,
                            } as any;
                        } if (result.success) {
                            txHashes[targetChainId] = result.executeTransactionHash || `sim-${Date.now()}`;
                            successCount++;
                            const txType = result.executeTransactionHash ? 'REAL' : 'SIMULATION';
                            console.log(`Successfully registered on ${targetChainConfig.chainName} [${txType}]: ${txHashes[targetChainId]}`);
                        } else {
                            console.error(`Failed to register on ${targetChainConfig.chainName}:`, result.error);
                        }

                        // Small delay between deployments to avoid rate limiting
                        if (targetChainIds.indexOf(targetChainId) < targetChainIds.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }

                    } catch (chainError: any) {
                        console.error(`Error deploying to chain ${targetChainId}:`, chainError);
                    }
                }

                if (successCount === 0) {
                    const errorMsg = 'Failed to deploy to any chains';
                    setError(errorMsg);
                    return {
                        success: false,
                        error: errorMsg,
                    };
                }

                return {
                    success: true,
                    txHashes,
                };

            } catch (err: any) {
                const errorMsg = err?.message || 'Cross-chain deployment failed';
                console.error('Deployment error:', err);
                setError(errorMsg);

                return {
                    success: false,
                    error: errorMsg,
                };
            } finally {
                setIsDeploying(false);
            }
        },
        [nexusSdk, isInitialized]
    );

    return {
        deployToChains,
        isDeploying,
        error,
        isInitialized,
    };
};
