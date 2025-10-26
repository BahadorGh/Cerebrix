import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { useNotification, useTransactionPopup } from '@blockscout/app-sdk';
import { API_BASE_URL } from '../config/constants';
import { getChainDeployment } from '../config/deployments';
import CrossChainDeployment from '../components/CrossChainDeployment';
import { UnifiedBalance } from '../components/UnifiedBalance';
import { SmartChainSelector } from '../components/SmartChainSelector';
import { useNexus } from '../providers/NexusProvider';
import type { BridgeAndExecuteParams, SUPPORTED_CHAINS_IDS, SUPPORTED_TOKENS } from '@avail-project/nexus-core';
import { getAddress } from 'viem';

// Contract ABIs
const AGENT_REGISTRY_ABI = [
  {
    inputs: [{ name: 'agentId', type: 'uint256' }],
    name: 'getAgent',
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
    type: 'function'
  },
  {
    inputs: [],
    name: 'paymentProcessor',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'params', type: 'bytes' }
    ],
    name: 'executeAgent',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  }
] as const;

const USDC_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

// Payment processor addresses for each chain
// NOTE: These are DIFFERENT from AgentRegistry addresses!
// PaymentProcessor is the contract that actually transfers USDC
// ✅ NEW DEPLOYMENT: Same address on all chains (deterministic deployment)
const PAYMENT_PROCESSOR_ADDRESSES: Record<number, `0x${string}`> = {
  31337: '0x5FbDB2315678afccb333f8a9c0a02bab1b0ecd83', // Anvil Local (mock)
  11155111: '0x2735Add35103A97F4a474043998b054766539dc8', // Sepolia ✅ NEW USDC deployment
  80002: '0x2735Add35103A97F4a474043998b054766539dc8', // Polygon Amoy ✅ SAME ADDRESS
  421614: '0x2735Add35103A97F4a474043998b054766539dc8', // Arbitrum Sepolia ✅ SAME ADDRESS
  11155420: '0x2735Add35103A97F4a474043998b054766539dc8', // Optimism Sepolia ✅ SAME ADDRESS
  84532: '0x2735Add35103A97F4a474043998b054766539dc8', // Base Sepolia ✅ SAME ADDRESS
};

// USDC addresses for each chain
const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  31337: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318', // Anvil Local (mock)
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
  421614: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia USDC
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
  11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // Optimism Sepolia USDC
  80002: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Polygon Amoy USDC
};

interface AgentMetadata {
  name: string;
  description: string;
  capabilities: string[];
  version?: string;
  author?: string;
  createdAt?: string;
}

interface ExecutionResult {
  executionId: string;
  agentId: number;
  executor: string;
  timestamp: number;
  results: any;
  txHash?: string;
}

export default function AgentDetailPage() {
  const { agentId: agentIdParam } = useParams<{ agentId: string }>();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  // Parse the agent ID from the URL parameter
  // Supports both formats:
  // - New slug format: "anvil-1-weather-oracle" or "sepolia-1-agent-name"
  // - Legacy format: "31337-1" or "11155111-1"
  const parseAgentId = (param: string | undefined): number => {
    if (!param) return 0;
    
    console.log('🔍 Parsing agent ID from URL param:', param);
    
    // Try new slug format first (e.g., "anvil-1-weather-oracle")
    const slugMatch = param.match(/^(?:anvil|sepolia|polygon|arbitrum|base|chain\d+)-(\d+)-/);
    if (slugMatch) {
      console.log('✅ Matched slug format, agent ID:', slugMatch[1]);
      return parseInt(slugMatch[1]);
    }
    
    // Try legacy format (e.g., "31337-1" or just "1")
    const legacyMatch = param.match(/^(?:\d+-)?(\d+)$/);
    if (legacyMatch) {
      console.log('✅ Matched legacy format, agent ID:', legacyMatch[1]);
      return parseInt(legacyMatch[1]);
    }
    
    // Fallback: try to parse as integer
    console.log('⚠️ Using fallback parse, result:', parseInt(param) || 0);
    return parseInt(param) || 0;
  };
  
  const agentId = parseAgentId(agentIdParam);
  console.log('🎯 Final parsed agent ID:', agentId, 'on chain:', chainId);

  // Blockscout SDK hooks
  const { openTxToast } = useNotification();
  const { openPopup } = useTransactionPopup();

  // Supported chain IDs - Anvil for local development, plus all testnets and mainnets
  const SUPPORTED_CHAIN_IDS = [
    31337,      // Anvil (local)
    11155111,   // Sepolia
    80002,      // Polygon Amoy
    421614,     // Arbitrum Sepolia
    11155420,   // Optimism Sepolia
    84532,      // Base Sepolia
    1,          // Ethereum Mainnet
    137,        // Polygon
    42161,      // Arbitrum
    10,         // Optimism
    8453,       // Base
  ];
  const isWrongNetwork = !SUPPORTED_CHAIN_IDS.includes(chainId);
  
  // Support execution on all chains where AgentRegistry is deployed
  const EXECUTION_SUPPORTED_CHAINS = [
    31337,      // Anvil Local (for development)
    11155111,   // Ethereum Sepolia
    421614,     // Arbitrum Sepolia
    11155420,   // Optimism Sepolia
    84532,      // Base Sepolia
    80002,      // Polygon Amoy
  ];
  const isSupportedForExecution = EXECUTION_SUPPORTED_CHAINS.includes(chainId);

  // State
  const [metadata, setMetadata] = useState<AgentMetadata | null>(null);
  const [executionParams, setExecutionParams] = useState('{}');
  const [executionHistory, setExecutionHistory] = useState<ExecutionResult[]>([]);
  const [latestResult, setLatestResult] = useState<ExecutionResult | null>(null);
  const [, setIsLoadingMetadata] = useState(true);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [backendAgentData, setBackendAgentData] = useState<any>(null);
  const [blockscoutAnalytics, setBlockscoutAnalytics] = useState<any>(null);
  const [actualDeployedChains, setActualDeployedChains] = useState<number[]>([]);
  
  // Smart Chain Selector state
  const [selectedExecutionChain, setSelectedExecutionChain] = useState<number | undefined>(chainId);
  const [needsBridgeForExecution, setNeedsBridgeForExecution] = useState(false);

  // Fetch agent data from backend API
  useEffect(() => {
    console.log('🔍 useEffect triggered, agentId:', agentId, 'type:', typeof agentId);
    
    const fetchAgentFromBackend = async () => {
      try {
        console.log('🔍 Fetching agent from backend:', agentId);
        const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}`);
        console.log('📡 Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Received agent data:', data);
          setBackendAgentData(data);
          setMetadata(data.metadataCached);
          setExecutionHistory(data.executions || []);
          setIsLoadingMetadata(false);
        } else {
          console.error('❌ Failed to fetch agent:', response.status);
        }

        // Also fetch deployments to get accurate deployed chains list
        try {
          const deploymentsResponse = await fetch(`${API_BASE_URL}/api/agents/${agentId}/deployments`);
          if (deploymentsResponse.ok) {
            const deployments = await deploymentsResponse.json();
            console.log('✅ Received deployments from backend:', deployments);
            // Extract unique chain IDs from deployments
            const chainIds = [...new Set(deployments.map((d: any) => Number(d.chainId)))];
            console.log('📍 Deployed chains from database:', chainIds);
            if (chainIds.length > 0) {
              setActualDeployedChains(chainIds as number[]);
            } else {
              console.log('⚠️  No deployments in database, will use contract deployedChains array');
            }
          } else {
            console.log('⚠️  Deployments endpoint failed, will use contract deployedChains array');
          }
        } catch (error) {
          console.error('❌ Failed to fetch deployments:', error);
          console.log('   Will use contract deployedChains array as fallback');
        }
      } catch (error) {
        console.error('❌ Failed to fetch agent from backend:', error);
      }
    };

    if (agentId && agentId > 0) {
      console.log('✅ Condition met, fetching...');
      fetchAgentFromBackend();
    } else {
      console.log('❌ Condition not met, agentId:', agentId);
    }
  }, [agentId]);

  // Fetch Blockscout analytics
  useEffect(() => {
    const fetchBlockscoutAnalytics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/agent-analytics/${agentId}?chainId=31337`);
        if (response.ok) {
          const data = await response.json();
          setBlockscoutAnalytics(data.blockscoutAnalytics);
          console.log('📊 Blockscout analytics loaded:', data.blockscoutAnalytics);
        }
      } catch (error) {
        console.error('❌ Failed to fetch Blockscout analytics:', error);
      }
    };

    if (agentId && agentId > 0) {
      fetchBlockscoutAnalytics();
    }
  }, [agentId]);

  // Read agent data from contract
  const currentChainDeployment = getChainDeployment(chainId);
  const { data: agentData, refetch: refetchAgent } = useReadContract({
    address: currentChainDeployment?.registryAddress as `0x${string}`,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'getAgent',
    args: [BigInt(agentId)],
    chainId: chainId,
  });

  // 🔧 FIX: Read PaymentProcessor address dynamically from AgentRegistry
  // This solves the bug where we were approving the wrong contract!
  const { data: dynamicPaymentProcessorAddress } = useReadContract({
    address: currentChainDeployment?.registryAddress as `0x${string}`,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'paymentProcessor',
    chainId: chainId,
  });

  // Get payment processor address for current chain
  // Use dynamic address from contract if available, fallback to hardcoded addresses
  const paymentProcessorAddress = (dynamicPaymentProcessorAddress || PAYMENT_PROCESSOR_ADDRESSES[chainId]) as `0x${string}` | undefined;
  
  // 🔧 NEW FIX: Read the actual payment token address from PaymentProcessor contract
  // The contract uses PYUSD, not USDC!
  const { data: paymentTokenAddress } = useReadContract({
    address: paymentProcessorAddress,
    abi: [
      {
        name: 'pyusd',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'address' }],
      },
    ] as const,
    functionName: 'pyusd',
    chainId: chainId,
    query: {
      enabled: !!paymentProcessorAddress,
    },
  });
  
  // Use the actual payment token from contract (PYUSD), not hardcoded USDC
  const paymentToken = (paymentTokenAddress || USDC_ADDRESSES[chainId]) as `0x${string}` | undefined;

  console.log('💰 Payment token info:', {
    paymentProcessorAddress,
    paymentTokenAddress,
    paymentToken,
    chainId,
  });

  // Read payment token allowance for PaymentProcessor (not AgentRegistry)
  // CRITICAL: We check allowance for PaymentProcessor, not AgentRegistry!
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: paymentToken,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address && paymentProcessorAddress ? [address, paymentProcessorAddress] : undefined,
    query: {
      enabled: !!address && !!paymentProcessorAddress && !!paymentToken,
    },
  });

  // Write contracts
  const { writeContract: writeApproval, data: approvalHash } = useWriteContract();
  const { writeContract: writeExecution, data: executionHash, isPending: isExecuting } = useWriteContract();
  
  const { isLoading: isApprovingConfirming, isSuccess: isApprovalConfirmed, status: approvalStatus } = useWaitForTransactionReceipt({ hash: approvalHash });
  const { isLoading: isExecutionConfirming, isSuccess: isExecutionConfirmed, status: executionStatus } = useWaitForTransactionReceipt({ hash: executionHash });

  // Log transaction status changes
  useEffect(() => {
    if (approvalStatus === 'error') {
      console.error('❌ Approval transaction failed!');
    }
    if (approvalStatus === 'success') {
      console.log('✅ Approval transaction succeeded!');
    }
  }, [approvalStatus]);

  useEffect(() => {
    if (executionStatus === 'error') {
      console.error('❌ Execution transaction failed!');
      console.error('Transaction details:', {
        agentId,
        chainId,
        registryAddress: currentChainDeployment?.registryAddress,
        agentExists: !!agentData,
        agentOwner: agentData?.owner,
        executionHash
      });
      alert('❌ Execution transaction failed! Check browser console for details.');
    }
    if (executionStatus === 'success') {
      console.log('✅ Execution transaction succeeded!');
    }
  }, [executionStatus, agentId, chainId, currentChainDeployment, agentData, executionHash]);

  // Load metadata from IPFS
  useEffect(() => {
    if (agentData && agentData.metadataURI) {
      loadMetadata(agentData.metadataURI);
    }
  }, [agentData]);

  // Check if approval is needed
  useEffect(() => {
    if (agentData && allowance !== undefined) {
      const price = agentData.pricePerExecution;
      const needsApprovalCheck = allowance < price;
      
      console.log('💰 Allowance check:', {
        userAddress: address,
        paymentToken,
        paymentProcessorAddress,
        currentAllowance: allowance?.toString(),
        priceRequired: price?.toString(),
        needsApproval: needsApprovalCheck,
        chainId,
      });
      
      setNeedsApproval(needsApprovalCheck);
    }
  }, [agentData, allowance, address, paymentToken, paymentProcessorAddress, chainId]);

  // Set deployed chains from backend or contract data
  useEffect(() => {
    console.log('🔍 Checking deployed chains:', {
      backendDeployedChains: backendAgentData?.deployedChains,
      contractDeployedChains: agentData?.deployedChains,
      actualDeployedChains
    });
    
    // Priority 1: Use database deployments if available
    if (actualDeployedChains.length > 0) {
      console.log('📍 Using deployed chains already set:', actualDeployedChains);
      return; // Already set from database fetch
    }
    
    // Priority 2: Use backend data (from current chain's contract)
    if (backendAgentData?.deployedChains && Array.isArray(backendAgentData.deployedChains)) {
      console.log('📍 Setting deployed chains from backend:', backendAgentData.deployedChains);
      setActualDeployedChains(backendAgentData.deployedChains);
    } 
    // Priority 3: Fallback to contract data
    else if (agentData?.deployedChains && (agentData.deployedChains as bigint[]).length > 0) {
      const chains = (agentData.deployedChains as bigint[]).map((c: bigint) => Number(c));
      console.log('📍 Setting deployed chains from contract:', chains);
      setActualDeployedChains(chains);
    }
    // Priority 4: If all else fails, assume agent exists on current chain only
    else if (agentData && agentData.owner !== '0x0000000000000000000000000000000000000000') {
      console.log('📍 No deployedChains data, assuming agent exists on current chain:', chainId);
      setActualDeployedChains([chainId]);
    }
  }, [backendAgentData, agentData, actualDeployedChains, chainId]);

  // Refetch allowance after approval
  useEffect(() => {
    if (isApprovalConfirmed && approvalHash) {
      // Show Blockscout toast notification for approval (gracefully handle unsupported chains)
      try {
        openTxToast(chainId.toString(), approvalHash);
      } catch (error) {
        console.log('Blockscout toast not available for this chain:', error);
      }
      refetchAllowance();
      refetchAgent();
    }
  }, [isApprovalConfirmed, approvalHash, chainId, openTxToast]);

  // Handle execution confirmation
  useEffect(() => {
    if (isExecutionConfirmed && executionHash) {
      // Show Blockscout toast notification for execution (gracefully handle unsupported chains)
      try {
        openTxToast(chainId.toString(), executionHash);
      } catch (error) {
        console.log('Blockscout toast not available for this chain:', error);
      }
      // Refetch agent data to show updated stats
      refetchAgent();
      // Load execution history
      loadExecutionHistory();
    }
  }, [isExecutionConfirmed, executionHash, chainId, openTxToast]);

  // Load execution history on mount
  useEffect(() => {
    if (agentId) {
      loadExecutionHistory();
    }
  }, [agentId]);

  // WebSocket listener for real-time results
  useEffect(() => {
    if (!agentId) return;

    // Connect to WebSocket for real-time updates
    const ws = new WebSocket('ws://localhost:3002');

    ws.onopen = () => {
      console.log('📡 Connected to WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'executionComplete' && data.agentId === agentId) {
          console.log('✅ Received execution result:', data);
          setLatestResult(data);
          loadExecutionHistory(); // Refresh history
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.warn('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [agentId]);

  const loadMetadata = async (metadataURI: string) => {
    setIsLoadingMetadata(true);
    try {
      // Extract IPFS hash
      const ipfsHash = metadataURI.replace('ipfs://', '');
      
      // Fetch from backend proxy
      const response = await fetch(`${API_BASE_URL}/api/ipfs/${ipfsHash}`);
      if (!response.ok) throw new Error('Failed to fetch metadata');
      
      const data = await response.json();
      setMetadata(data);
    } catch (error) {
      console.error('Failed to load metadata:', error);
      // Fallback metadata
      setMetadata({
        name: `Agent #${agentId}`,
        description: 'Agent metadata could not be loaded',
        capabilities: [],
      });
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const loadExecutionHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}/executions`);
      if (response.ok) {
        const data = await response.json();
        setExecutionHistory(data.executions || []);
      }
    } catch (error) {
      console.error('Failed to load execution history:', error);
    }
  };

  const handleApprove = async () => {
    if (!agentData || !paymentProcessorAddress || !paymentToken) return;

    if (!displayData) return;

    try {
      // Approve PaymentProcessor (not AgentRegistry) since it's the one that transfers payment token
      writeApproval({
        address: paymentToken,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [paymentProcessorAddress, displayData.pricePerExecution],
      });
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const { nexusSdk, isInitialized: isNexusInitialized } = useNexus();

  const handleExecute = async () => {
    if (!agentData || !isConnected) return;

    // Check if approval is still needed
    if (needsApproval) {
      alert('❌ USDC approval required first!\n\nPlease click "✅ Approve 10 USDC" button and confirm the transaction before executing.');
      console.error('Execution blocked: USDC not approved', { 
        allowance: allowance?.toString(),
        pricePerExecution: agentData.pricePerExecution.toString(),
        needsApproval 
      });
      return;
    }

    try {
      // Parse and encode parameters
      let params: any;
      try {
        params = JSON.parse(executionParams);
      } catch {
        params = {};
      }
      
      const paramsString = JSON.stringify(params);
      const paramsBytes = new TextEncoder().encode(paramsString);
      const paramsHex = `0x${Array.from(paramsBytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;

      // Check if we need to bridge & execute (user selected a different chain)
      // Use bridge & execute if selected chain is different, regardless of balance
      if (selectedExecutionChain && selectedExecutionChain !== chainId) {
        if (!isNexusInitialized || !nexusSdk) {
          alert('❌ Nexus SDK not initialized. Please refresh the page.');
          return;
        }

        const targetDeployment = getChainDeployment(selectedExecutionChain);
        if (!targetDeployment) {
          alert(`❌ Target chain ${selectedExecutionChain} not configured.`);
          return;
        }

        // ⚠️ CRITICAL: Check if agent is deployed on target chain
        const deployedChainsList = actualDeployedChains.length > 0 
          ? actualDeployedChains 
          : (displayData?.deployedChains || []).map((c: bigint) => Number(c));
        
        const isDeployedOnTarget = deployedChainsList.includes(selectedExecutionChain);
        
        if (!isDeployedOnTarget) {
          alert(
            `❌ Agent Not Deployed on ${targetDeployment.chainName}\n\n` +
            `This agent (ID ${agentId}) is only deployed on:\n` +
            `${deployedChainsList.map((id: number) => getChainDeployment(id)?.chainName || `Chain ${id}`).join(', ')}\n\n` +
            `To execute on ${targetDeployment.chainName}:\n` +
            `1. Go to the "🌐 Cross-Chain Deployment" section below\n` +
            `2. Deploy the agent to ${targetDeployment.chainName}\n` +
            `3. Then try executing again\n\n` +
            `💡 Tip: You can execute on any chain where it's already deployed without bridging!`
          );
          return;
        }

        let bridgeAmount = 0; // Declare outside try block for error handling

        try {
          // Get unified balances to calculate deficit
          console.log('🔍 Getting unified balances from Nexus SDK...');
          const unifiedBalances = await nexusSdk.getUnifiedBalances();
          const usdcAsset = unifiedBalances.find((asset: any) => asset.symbol === 'USDC');
          
          if (!usdcAsset || !usdcAsset.breakdown) {
            alert('❌ Could not fetch USDC balances. Please try again.');
            return;
          }

          // Find balance on target chain
          const targetChainBalance = usdcAsset.breakdown.find(
            (b: any) => Number(b.chain?.id) === Number(selectedExecutionChain)
          );
          const currentBalance = parseFloat(targetChainBalance?.balance || '0');
          const priceInUSDC = parseFloat(formatUnits(agentData.pricePerExecution, 6));
          const deficit = priceInUSDC - currentBalance;

          console.log('🌉 Bridge & Execute via Nexus SDK:', {
            fromChain: chainId,
            toChain: selectedExecutionChain,
            agentId,
            currentBalance,
            priceInUSDC,
            deficit,
            params: paramsString,
            targetRegistry: targetDeployment.registryAddress,
          });

          // Determine bridge amount
          bridgeAmount = deficit;
          let bridgeMessage = '';
          
          if (deficit <= 0) {
            // User has enough on target chain, but wants to bridge anyway
            bridgeAmount = priceInUSDC; // Bridge the execution amount
            bridgeMessage = `✅ You have sufficient USDC (${currentBalance.toFixed(2)}) on ${targetDeployment.chainName}.\n\nHowever, you can still use Bridge & Execute to:\n1. Bridge ${priceInUSDC.toFixed(2)} USDC from ${getChainDeployment(chainId)?.chainName || 'current chain'}\n2. Execute the agent on ${targetDeployment.chainName}\n\n`;
          } else {
            // User needs to bridge the deficit
            bridgeMessage = `🌉 Bridge & Execute Required\n\nYou need ${priceInUSDC.toFixed(2)} USDC to execute this agent.\nYou currently have ${currentBalance.toFixed(2)} USDC on ${targetDeployment.chainName}.\n\n`;
          }

          // Confirm with user
          const confirmMessage = bridgeMessage + 
            `This will:\n` +
            `1. Bridge ${bridgeAmount.toFixed(2)} USDC from ${getChainDeployment(chainId)?.chainName || 'current chain'} to ${targetDeployment.chainName}\n` +
            `2. Execute the agent on ${targetDeployment.chainName}\n` +
            `3. Use Avail Nexus SDK for cross-chain messaging\n\n` +
            `⏱️  This may take 2-5 minutes to complete.\n\n` +
            `Proceed?`;
          
          if (!window.confirm(confirmMessage)) {
            return;
          }

          // Prepare bridge & execute parameters
          const bridgeAmountInBaseUnits = Math.ceil(bridgeAmount * 1e6); // Convert to 6 decimals and round up
          const checksummedRegistryAddress = getAddress(targetDeployment.registryAddress);

          const buildParams = (_token: SUPPORTED_TOKENS) => {
            console.log('🔧 Building executeAgent params:', { agentId, paramsHex, token: _token });
            return {
              functionParams: [BigInt(agentId), paramsHex]
            };
          };

          const bridgeParams: BridgeAndExecuteParams = {
            token: 'USDC' as SUPPORTED_TOKENS,
            amount: bridgeAmountInBaseUnits.toString(),
            toChainId: selectedExecutionChain as SUPPORTED_CHAINS_IDS,
            execute: {
              contractAddress: checksummedRegistryAddress as `0x${string}`,
              contractAbi: AGENT_REGISTRY_ABI,
              functionName: 'executeAgent',
              buildFunctionParams: buildParams,
              value: '0',
            },
            waitForReceipt: true,
            receiptTimeout: 300000, // 5 minutes
          };

          console.log('🚀 Calling nexusSdk.bridgeAndExecute with params:', bridgeParams);
          
          // Show loading message
          const loadingAlert = `🌉 Initiating Bridge & Execute...\n\n` +
            `Step 1: Approve USDC transfer on ${getChainDeployment(chainId)?.chainName}\n` +
            `Step 2: Submit bridge transaction\n` +
            `Step 3: Wait for Avail DA confirmation (~2-5 minutes)\n` +
            `Step 4: Execute agent on ${targetDeployment.chainName}\n\n` +
            `Please approve the transaction in your wallet.`;
          alert(loadingAlert);

          const result = await nexusSdk.bridgeAndExecute(bridgeParams);

          console.log('✅ Bridge & Execute result:', result);
          
          // Extract transaction info
          const txHash = result.executeTransactionHash || result.bridgeTransactionHash || 'Unknown';
          const intentId = (result as any).intentId || (result as any).intentHash;
          
          let successMessage = `✅ Bridge & Execute Successful!\n\n`;
          successMessage += `Bridged ${bridgeAmount.toFixed(2)} USDC from ${getChainDeployment(chainId)?.chainName} to ${targetDeployment.chainName}\n`;
          successMessage += `Agent executed on ${targetDeployment.chainName}\n`;
          
          if (txHash !== 'Unknown') {
            successMessage += `\n📝 Transaction: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
          }
          if (intentId) {
            successMessage += `\n\n🔍 Intent ID: ${intentId}`;
            successMessage += `\n\n🌐 View in Nexus Explorer:\nhttps://explorer.nexus-folly.availproject.org/intent/${intentId}`;
          }
          
          successMessage += `\n\n⏱️ Cross-chain execution completed via Avail DA!`;
          alert(successMessage);
          
          // Refetch agent data after execution
          setTimeout(() => {
            refetchAgent();
          }, 3000);

        } catch (error: any) {
          console.error('❌ Bridge & Execute failed:', error);
          
          let errorMessage = `❌ Bridge & Execute Failed\n\n`;
          
          // Provide more specific error messages
          if (error?.message?.includes('insufficient')) {
            errorMessage += `Insufficient USDC balance on ${getChainDeployment(chainId)?.chainName}.\n\n`;
            errorMessage += `You need ${bridgeAmount.toFixed(2)} USDC to bridge.\n`;
            errorMessage += `Please add USDC to your wallet and try again.`;
          } else if (error?.message?.includes('rejected')) {
            errorMessage += `Transaction was rejected in your wallet.\n\n`;
            errorMessage += `Please try again and approve the transaction.`;
          } else if (error?.message?.includes('timeout')) {
            errorMessage += `Transaction timed out waiting for confirmation.\n\n`;
            errorMessage += `The bridge transaction may still be processing.\n`;
            errorMessage += `Check Nexus Explorer for status.`;
          } else {
            errorMessage += error?.message || 'Unknown error';
            errorMessage += `\n\nCheck browser console for details.`;
          }
          
          alert(errorMessage);
        }
        return;
      }

      console.log('🚀 Executing agent on current chain:', {
        agentId,
        params: paramsString,
        paramsHex,
        registryAddress: currentChainDeployment?.registryAddress,
        chainId,
        allowance: allowance?.toString(),
        pricePerExecution: agentData.pricePerExecution.toString(),
        agentOwner: agentData.owner,
        agentExists: agentData.owner !== '0x0000000000000000000000000000000000000000',
        deployedChains: actualDeployedChains,
      });

      // ⚠️ Final safety check before execution
      if (agentData.owner === '0x0000000000000000000000000000000000000000') {
        alert(
          `❌ Cannot Execute Agent #${agentId}\n\n` +
          `This agent does not exist on ${getChainDeployment(chainId)?.chainName || 'this chain'}.\n\n` +
          `Please switch to a chain where the agent is deployed:\n` +
          `${actualDeployedChains.map(id => getChainDeployment(id)?.chainName || `Chain ${id}`).join(', ')}`
        );
        return;
      }

      writeExecution({
        address: currentChainDeployment?.registryAddress as `0x${string}`,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'executeAgent',
        args: [BigInt(agentId), paramsHex],
        chainId: chainId,
      });
    } catch (error) {
      console.error('❌ Execution failed:', error);
      alert('❌ Execution failed. Check console for details.');
    }
  };

  // Use backend data or contract data (prefer contract data when available)
  const displayData = agentData || (backendAgentData ? {
    owner: backendAgentData.owner,
    metadataURI: backendAgentData.metadataURI,
    pricePerExecution: BigInt(backendAgentData.pricePerExecution),
    totalExecutions: BigInt(backendAgentData.totalExecutions),
    totalRevenue: BigInt(backendAgentData.totalRevenue),
    isActive: backendAgentData.isActive,
    revenueSharePercent: backendAgentData.revenueSharePercent,
    createdAt: BigInt(backendAgentData.createdAt),
    deployedChains: (backendAgentData.deployedChains || []).map((c: number) => BigInt(c)),
  } : null);

  console.log('🔍 Display data:', {
    agentData,
    backendAgentData,
    displayData
  });

  // Show loading only if we don't have any data yet
  if (!displayData && !backendAgentData) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="card h-64"></div>
        </div>
      </div>
    );
  }

  if (!displayData) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Agent Not Found</h2>
          <p className="text-gray-600 mb-6">The agent you're looking for doesn't exist.</p>
          <Link to="/explore" className="btn btn-primary">
            Browse Agents
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = address && displayData.owner.toLowerCase() === address.toLowerCase();
  const priceInUSDC = parseFloat(formatUnits(displayData.pricePerExecution, 6));
  const totalRevenueInUSDC = parseFloat(formatUnits(displayData.totalRevenue, 6));
  const ownerShare = totalRevenueInUSDC * (Number(displayData.revenueSharePercent) / 100);

  // Get network name
  const getNetworkName = (id: number) => {
    const networks: Record<number, string> = {
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia',
      80002: 'Polygon Amoy',
      421614: 'Arbitrum Sepolia',
      11155420: 'Optimism Sepolia',
      84532: 'Base Sepolia',
      137: 'Polygon',
      42161: 'Arbitrum',
      10: 'Optimism',
      8453: 'Base',
      31337: 'Anvil Local'
    };
    return networks[id] || `Chain ${id}`;
  };

  // Check if agent exists on current chain (zero address = doesn't exist)
  const agentExistsOnCurrentChain = displayData.owner !== '0x0000000000000000000000000000000000000000';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Agent Not On Current Chain Warning */}
      {!agentExistsOnCurrentChain && (
        <div className="card bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400">
          <div className="flex items-start gap-4">
            <div className="text-4xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-900 mb-2">Agent Not Deployed on {getNetworkName(chainId)}</h3>
              <p className="text-sm text-yellow-700 mb-3">
                Agent #{agentId} exists in the marketplace but is <strong>not deployed on {getNetworkName(chainId)}</strong>.
              </p>
              {actualDeployedChains.length > 0 && (
                <p className="text-sm text-yellow-700 mb-3">
                  This agent is deployed on: <strong>{actualDeployedChains.map(id => getNetworkName(id)).join(', ')}</strong>
                </p>
              )}
              <p className="text-sm text-yellow-800 font-semibold">
                💡 Please switch to one of the deployed chains to view and execute this agent.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Wrong Network Warning */}
      {isWrongNetwork && (
        <div className="card bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300">
          <div className="flex items-start gap-4">
            <div className="text-4xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">Unsupported Network</h3>
              <p className="text-sm text-red-700 mb-3">
                You're currently connected to <strong>{getNetworkName(chainId)}</strong>, which is not supported 
                by this marketplace.
              </p>
              <div className="bg-red-100 rounded p-3 text-sm text-red-800">
                <strong>📡 Please switch to a supported network:</strong>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <strong>For Testing:</strong>
                    <ul className="ml-4 list-disc text-xs">
                      <li>Anvil Local (31337)</li>
                      <li>Sepolia (11155111)</li>
                      <li>Polygon Amoy (80002)</li>
                      <li>Arbitrum Sepolia (421614)</li>
                    </ul>
                  </div>
                  <div>
                    <strong>For Production:</strong>
                    <ul className="ml-4 list-disc text-xs">
                      <li>Ethereum (1)</li>
                      <li>Polygon (137)</li>
                      <li>Arbitrum (42161)</li>
                      <li>Optimism (10)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-bold">{metadata?.name || `Agent #${agentId}`}</h1>
            {displayData.isActive ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                ✅ Active
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                ⛔ Inactive
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isWrongNetwork 
                ? 'bg-red-100 text-red-800 border border-red-300' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {isWrongNetwork ? '⚠️' : '🔗'} {getNetworkName(chainId)}
            </span>
          </div>
          <p className="text-gray-600">
            Created by{' '}
            <a
              href={`https://etherscan.io/address/${displayData.owner}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              {displayData.owner.slice(0, 6)}...{displayData.owner.slice(-4)}
            </a>
            {isOwner && <span className="ml-2 text-green-600 font-semibold">(You)</span>}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-indigo-600">{priceInUSDC} USDC</div>
          <div className="text-sm text-gray-600">per execution</div>
        </div>
      </div>

      {/* Network Info Card - Show when not on Anvil but on supported network */}
      {!isWrongNetwork && !isSupportedForExecution && (
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300">
          <div className="flex items-start gap-4">
            <div className="text-3xl">ℹ️</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900 mb-2">Network Information</h3>
              <p className="text-sm text-blue-700 mb-2">
                You're connected to <strong>{getNetworkName(chainId)}</strong>.
              </p>
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <div className="bg-green-50 rounded p-3 border border-green-200">
                  <div className="font-semibold text-green-800 mb-1">✅ Available:</div>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• View agent details</li>
                    <li>• Browse marketplace</li>
                    {isOwner && <li>• Cross-chain deployment (owner only)</li>}
                  </ul>
                </div>
                <div className="bg-yellow-50 rounded p-3 border border-yellow-200">
                  <div className="font-semibold text-yellow-800 mb-1">⚠️ Not Available:</div>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• Execute agent (requires Sepolia)</li>
                    <li>• Approve USDC (requires Sepolia)</li>
                  </ul>
                </div>
              </div>
              {!isOwner && (
                <p className="text-xs text-blue-600 mt-3">
                  💡 To execute this agent, switch to Ethereum Sepolia where the agent is registered.
                </p>
              )}
              {isOwner && (
                <p className="text-xs text-blue-600 mt-3">
                  💡 You can deploy to other chains using the Cross-Chain Deployment section, or switch to Ethereum Sepolia to execute the agent.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Description Card */}
      <div className="card">
        <h2 className="text-xl font-bold mb-3">📋 Description</h2>
        <p className="text-gray-700 leading-relaxed">{metadata?.description}</p>
      </div>

      {/* Capabilities */}
      {metadata?.capabilities && metadata.capabilities.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-3">🔧 Capabilities</h2>
          <div className="flex flex-wrap gap-2">
            {metadata.capabilities.map((capability, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold"
              >
                {capability}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-indigo-600">{Number(displayData.totalExecutions)}</div>
          <div className="text-sm text-gray-600">Total Executions</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{totalRevenueInUSDC.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Revenue (USDC)</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">{displayData.revenueSharePercent}%</div>
          <div className="text-sm text-gray-600">Creator Share</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">
            {actualDeployedChains.length > 0 ? actualDeployedChains.length : displayData.deployedChains.length}
          </div>
          <div className="text-sm text-gray-600">Deployed Chains</div>
        </div>
      </div>

      {/* Blockscout On-Chain Analytics */}
      {blockscoutAnalytics && (
        <div className="card bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                🔍
              </div>
              <div>
                <h3 className="text-lg font-bold text-green-900">Blockscout On-Chain Analytics</h3>
                <p className="text-xs text-green-700">Powered by Blockscout SDK • Real-time transaction tracking</p>
              </div>
            </div>
            <button
              onClick={() => {
                try {
                  openPopup({ 
                    chainId: chainId.toString(), 
                    address: currentChainDeployment?.registryAddress || '' 
                  });
                } catch (error) {
                  console.log('Blockscout popup not available for this chain');
                  alert('⚠️ Blockscout explorer is not available for Anvil local testnet (chainId 31337).\n\n' +
                    'The Blockscout SDK works with supported chains like:\n' +
                    '• Ethereum Mainnet (chainId 1)\n' +
                    '• Optimism (chainId 10)\n' +
                    '• Polygon (chainId 137)\n' +
                    '• Arbitrum (chainId 42161)\n' +
                    '• Base (chainId 8453)\n\n' +
                    'Deploy to a supported chain to see transaction history in production!');
                }
              }}
              className="text-sm text-green-600 hover:underline font-semibold cursor-pointer"
            >
              📊 View Transaction History
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-green-600">{blockscoutAnalytics.totalTransactions || 0}</div>
              <div className="text-xs text-gray-600">On-Chain Txs</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-teal-600">{blockscoutAnalytics.uniqueUsers || 0}</div>
              <div className="text-xs text-gray-600">Unique Users</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-blue-600">
                {blockscoutAnalytics.recentActivity?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Recent Activity</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-green-700 bg-green-100 rounded p-2">
            💡 <strong>Blockscout SDK Integration:</strong> Real-time transaction toasts and history popups work on Ethereum, Arbitrum, Optimism, Base, and Polygon. 
            Anvil testnet (chainId 31337) is not in the Blockscout registry, so SDK features are limited during local development. 
            Deploy to a supported chain to see full interactive explorer feedback!
          </div>
        </div>
      )}

      {/* Unified Balance - Show cross-chain balances */}
      {isConnected && (
        <UnifiedBalance />
      )}

      {/* Cross-Chain Deployment (Owner Only) */}
      {isOwner && displayData && (
        <CrossChainDeployment
          agentId={agentId}
          contractAddress={currentChainDeployment?.registryAddress || ''}
          isOwner={isOwner}
          agentData={{
            metadataURI: displayData.metadataURI,
            pricePerExecution: displayData.pricePerExecution,
            revenueSharePercent: displayData.revenueSharePercent,
          }}
        />
      )}

      {/* Owner Revenue Card */}
      {isOwner && totalRevenueInUSDC > 0 && (
        <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-green-900 mb-1">💰 Your Earnings</h3>
              <p className="text-sm text-green-700">
                You earn {displayData.revenueSharePercent}% of each execution
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">{ownerShare.toFixed(2)} USDC</div>
              <Link to="/my-agents" className="text-sm text-green-600 hover:underline">
                Withdraw →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Execute Agent Card */}
      {!isOwner && displayData.isActive && isConnected && (
        <div className="card bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200">
          <h2 className="text-xl font-bold mb-4">🚀 Execute Agent</h2>
          
          {/* Smart Chain Selector */}
          <div className="mb-6">
            <SmartChainSelector
              agentPrice={String(priceInUSDC)}
              onChainSelect={(chainId, needsBridge) => {
                setSelectedExecutionChain(chainId);
                setNeedsBridgeForExecution(needsBridge);
              }}
              selectedChainId={selectedExecutionChain}
              deployedChains={
                actualDeployedChains.length > 0 
                  ? actualDeployedChains 
                  : (displayData?.deployedChains || []).map((c: bigint) => Number(c))
              }
            />
          </div>

          {/* Bridge Warning */}
          {needsBridgeForExecution && selectedExecutionChain && selectedExecutionChain !== chainId && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <div className="text-3xl">🌉</div>
                <div className="flex-1">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    Bridge & Execute via Avail Nexus
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-normal">
                      Powered by Avail DA
                    </span>
                  </h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Execute on <strong>{getChainDeployment(selectedExecutionChain)?.chainName}</strong> from your current chain using cross-chain messaging!
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="bg-white p-3 rounded-lg border-2 border-green-300 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">✨</span>
                        <span className="font-semibold text-green-900">Bridge & Execute (Recommended)</span>
                      </div>
                      <p className="text-green-700 text-xs ml-7">
                        Click "Execute" below to automatically:
                      </p>
                      <ul className="text-green-700 text-xs ml-7 mt-1 space-y-0.5">
                        <li>• Bridge USDC from {getChainDeployment(chainId)?.chainName || 'current chain'} → {getChainDeployment(selectedExecutionChain)?.chainName}</li>
                        <li>• Execute agent on {getChainDeployment(selectedExecutionChain)?.chainName}</li>
                        <li>• All in one transaction via Avail Nexus SDK</li>
                      </ul>
                      <p className="text-xs text-green-600 mt-2 ml-7">⏱️ Takes ~2-5 minutes for cross-chain confirmation</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border border-gray-300">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🔄</span>
                        <span className="font-semibold text-gray-700">Alternative: Manual Execution</span>
                      </div>
                      <p className="text-gray-600 text-xs ml-7">
                        Switch to a chain where you have USDC and execute directly (faster, no bridging needed).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!isSupportedForExecution && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Agent execution is only available on <strong>Anvil Local</strong> (Chain ID: 31337) where the contracts are deployed.
                Please switch your wallet to Anvil to execute this agent.
              </p>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Parameters (JSON)
            </label>
            <textarea
              value={executionParams}
              onChange={(e) => setExecutionParams(e.target.value)}
              className="input font-mono text-sm"
              rows={4}
              placeholder='{"market": "BTC/ETH", "timeframe": "1h"}'
              disabled={!isSupportedForExecution}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Provide custom parameters for agent execution
            </p>
          </div>

          {needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={isApprovingConfirming || !isSupportedForExecution}
              className="btn btn-secondary w-full"
            >
              {!isSupportedForExecution ? (
                <>⚠️ Switch to Ethereum Sepolia to Execute</>
              ) : isApprovingConfirming ? (
                <>⏳ Approving USDC...</>
              ) : (
                <>✅ Approve {priceInUSDC} USDC</>
              )}
            </button>
          ) : (
            <button
              onClick={handleExecute}
              disabled={isExecuting || isExecutionConfirming || !isSupportedForExecution || !agentExistsOnCurrentChain}
              className="btn btn-primary w-full"
            >
              {!agentExistsOnCurrentChain ? (
                <>⚠️ Agent not deployed on this chain</>
              ) : !isSupportedForExecution ? (
                <>⚠️ Switch to Ethereum Sepolia to Execute</>
              ) : isExecuting || isExecutionConfirming ? (
                <>⏳ Executing Agent...</>
              ) : (
                <>🚀 Execute for {priceInUSDC} USDC</>
              )}
            </button>
          )}

          {isExecutionConfirming && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⏳ Transaction submitted. Waiting for confirmation...
              </p>
            </div>
          )}

          {isExecutionConfirmed && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ Agent executed successfully! Processing results...
              </p>
            </div>
          )}
        </div>
      )}

      {!isConnected && (
        <div className="card bg-yellow-50 border-2 border-yellow-200 text-center py-8">
          <p className="text-yellow-800 font-semibold mb-2">Connect your wallet to execute this agent</p>
          <p className="text-sm text-yellow-600">Click "Connect Wallet" in the header to get started</p>
        </div>
      )}

      {/* Latest Result */}
      {latestResult && (
        <div className="card bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
          <h2 className="text-xl font-bold mb-4">✅ Latest Execution Result</h2>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-600">Execution ID:</span>
                <span className="ml-2 font-mono">{latestResult.executionId}</span>
              </div>
              <div>
                <span className="text-gray-600">Time:</span>
                <span className="ml-2">{new Date(latestResult.timestamp).toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded p-4 font-mono text-sm overflow-auto max-h-64">
              <pre>{JSON.stringify(latestResult.results, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Execution History */}
      {executionHistory.length > 0 && (
        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-bold">📜 Execution History</h2>
            <div className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
              {currentChainDeployment?.chainName || `Chain ${chainId}`}
            </div>
          </div>
          <div className="mb-4 text-xs bg-green-50 text-green-700 rounded p-3 border border-green-200">
            <strong>🔍 Blockscout Integration:</strong> Transaction links open directly in Blockscout explorer. 
            Supported on Ethereum mainnet and L2s (Arbitrum, Optimism, Base, Polygon).
          </div>
          <div className="space-y-3">{executionHistory.slice(0, 5).map((execution, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    Execution #{execution.executionId}
                  </div>
                  <div className="text-sm text-gray-600">
                    By {execution.executor.slice(0, 6)}...{execution.executor.slice(-4)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {new Date(execution.timestamp).toLocaleDateString()}
                  </div>
                  {execution.txHash && (
                    <div className="mt-1 flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          if (!execution.txHash) return;
                          // Show Blockscout SDK transaction toast (gracefully handle unsupported chains)
                          try {
                            openTxToast(chainId.toString(), execution.txHash);
                          } catch (error) {
                            console.log('Blockscout toast not available for this chain');
                            // Fallback: copy hash to clipboard
                            navigator.clipboard.writeText(execution.txHash);
                            alert('Blockscout not available for Anvil testnet.\nTransaction hash copied to clipboard:\n' + execution.txHash);
                          }
                        }}
                        className="text-xs text-green-600 hover:underline cursor-pointer font-semibold"
                        title="View transaction details with Blockscout"
                      >
                        🔍 View Transaction Details
                      </button>
                      <button
                        onClick={() => {
                          if (execution.txHash) {
                            navigator.clipboard.writeText(execution.txHash);
                            alert('Transaction hash copied to clipboard!');
                          }
                        }}
                        className="text-xs text-gray-600 hover:underline cursor-pointer"
                        title={execution.txHash}
                      >
                        📋 Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {executionHistory.length > 5 && (
            <div className="mt-4 text-center">
              <button className="text-indigo-600 hover:underline text-sm font-semibold">
                View All {executionHistory.length} Executions
              </button>
            </div>
          )}
        </div>
      )}

      {executionHistory.length === 0 && !isOwner && (
        <div className="card text-center py-8 bg-gray-50">
          <p className="text-gray-600">No executions yet. Be the first to try this agent!</p>
        </div>
      )}
    </div>
  );
}
