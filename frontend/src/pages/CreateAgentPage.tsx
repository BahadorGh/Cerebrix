import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseUnits } from 'viem';
import { useNotification } from '@blockscout/app-sdk';
import { API_BASE_URL } from '../config/constants';
import { getChainDeployment } from '../config/deployments';
import { AGENT_REGISTRY_ABI } from '../config/abis';
import { useNexus } from '../providers/NexusProvider';
import { useCrossChainDeployment } from '../hooks/useCrossChainDeployment';

export default function CreateAgentPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContract, data: hash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const { nexusSdk, isInitialized: isNexusInitialized } = useNexus();
  const { deployToChains } = useCrossChainDeployment();
  
  // Blockscout SDK hook
  const { openTxToast } = useNotification();

  // Get chain deployment
  const chainDeployment = getChainDeployment(chainId);
  const isWrongNetwork = !chainDeployment;

  // Get network name
  const getNetworkName = (id: number) => {
    const deployment = getChainDeployment(id);
    return deployment?.chainName || `Chain ${id}`;
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capabilities: '',
    price: '5',
    revenueShare: '70',
  });

  const [file, setFile] = useState<File | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // JSON upload mode
  const [creationMode, setCreationMode] = useState<'form' | 'json'>('form');
  const [jsonConfig, setJsonConfig] = useState<any>(null);
  const [jsonPreview, setJsonPreview] = useState<string>('');
  
  // Multi-chain deployment
  const [selectedChains, setSelectedChains] = useState<number[]>([chainId]);
  const [deploymentStatus, setDeploymentStatus] = useState<Record<number, 'pending' | 'success' | 'error'>>({});

  // Show Blockscout toast when deployment transaction is confirmed
  useEffect(() => {
    if (isConfirmed && hash) {
      console.log('✅ Agent registration confirmed on chain:', chainDeployment?.chainName);
      // Gracefully handle unsupported chains - Blockscout doesn't support all testnets
      try {
        openTxToast(chainId.toString(), hash);
      } catch (error) {
        console.log(`ℹ️ Blockscout not available for ${chainDeployment?.chainName} (chainId: ${chainId})`);
      }
    }
  }, [isConfirmed, hash, chainId, openTxToast, chainDeployment?.chainName]);

  // Log when transaction is submitted
  useEffect(() => {
    if (hash) {
      console.log('📤 Transaction submitted to chain:', chainDeployment?.chainName, 'Hash:', hash);
    }
  }, [hash, chainDeployment?.chainName]);

  // Log any write errors
  useEffect(() => {
    if (isWritePending) {
      console.log('⏳ Waiting for user to approve transaction...');
    }
  }, [isWritePending]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Handle JSON config file upload
  const handleJsonFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const config = JSON.parse(text);
      
      // Validate basic structure
      if (!config.name || !config.description) {
        setUploadError('JSON must include "name" and "description" fields');
        return;
      }
      
      setJsonConfig(config);
      setJsonPreview(JSON.stringify(config, null, 2));
      
      // Pre-fill form data from JSON
      setFormData({
        ...formData,
        name: config.name || '',
        description: config.description || '',
        capabilities: config.capabilities?.join(', ') || '',
      });
      
      setUploadError('');
      console.log('✅ JSON config loaded:', config);
      
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      setUploadError('Invalid JSON file. Please check the format.');
      setJsonConfig(null);
      setJsonPreview('');
    }
  };

  // Upload metadata to IPFS via backend
  const handleUploadToIPFS = async () => {
    if (!formData.name || !formData.description) {
      setUploadError('Please fill in name and description first');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      // Create metadata object
      const metadata: any = {
        name: formData.name,
        description: formData.description,
        capabilities: formData.capabilities.split(',').map(c => c.trim()),
        version: '1.0.0',
        author: address,
        createdAt: new Date().toISOString(),
      };
      
      // Include execution config if from JSON
      if (jsonConfig?.execution) {
        metadata.execution = jsonConfig.execution;
        console.log('📋 Including execution config:', jsonConfig.execution);
      }

      // Upload to IPFS via backend (send as JSON)
      const response = await fetch(`${API_BASE_URL}/api/ipfs/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload to IPFS');
      }

      const data = await response.json();
      setIpfsHash(data.hash);
      console.log('✅ Uploaded to IPFS:', data);
    } catch (error) {
      console.error('IPFS upload error:', error);
      setUploadError('Failed to upload to IPFS. Make sure backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

  // Register agent on multiple blockchains using Nexus cross-chain orchestration
  const handleRegisterAgent = async () => {
    if (!ipfsHash) {
      setUploadError('Please upload to IPFS first');
      return;
    }

    if (!isConnected) {
      setUploadError('Please connect your wallet');
      return;
    }

    if (selectedChains.length === 0) {
      setUploadError('Please select at least one chain to deploy');
      return;
    }

    // Check if Nexus SDK is initialized for multi-chain deployment
    if (selectedChains.length > 1 && (!isNexusInitialized || !nexusSdk)) {
      setUploadError('Nexus SDK is not initialized. Please wait a moment or refresh the page.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setSuccessMessage('');

    try {
      const priceInUSDC = parseUnits(formData.price, 6);
      const metadataURI = `ipfs://${ipfsHash}`;
      const revenueShare = parseInt(formData.revenueShare);

      // Single chain deployment - simple direct registration
      if (selectedChains.length === 1) {
        const targetChainId = selectedChains[0];
        const deployment = getChainDeployment(targetChainId);
        
        if (!deployment) {
          setUploadError(`Chain ${targetChainId} not configured`);
          setIsUploading(false);
          return;
        }

        console.log(`Registering agent on ${deployment.chainName}...`);
        setDeploymentStatus({ [targetChainId]: 'pending' });

        // Direct registration on single chain
        writeContract({
          address: deployment.registryAddress as `0x${string}`,
          abi: AGENT_REGISTRY_ABI,
          functionName: 'registerAgent',
          args: [metadataURI, priceInUSDC, revenueShare],
        });

        // Wait for transaction confirmation
        // Success/error handling is in useEffect hooks
        setIsUploading(false);
        return;
      }

      // Multi-chain registration using Nexus SDK
      console.log('🌐 Starting Nexus cross-chain registration...');
      console.log(`📍 Registering to ${selectedChains.length} chains (${selectedChains.length} signatures required)`);
      
      // Mark all chains as pending
      const initialStatus: Record<number, 'pending' | 'success' | 'error'> = {};
      selectedChains.forEach(chainId => {
        initialStatus[chainId] = 'pending';
      });
      setDeploymentStatus(initialStatus);

      // Get source chain deployment
      const sourceChainId = chainId;
      const sourceDeployment = getChainDeployment(sourceChainId);
      
      if (!sourceDeployment) {
        setUploadError(`Source chain ${sourceChainId} not configured. Please switch to a supported network.`);
        setIsUploading(false);
        return;
      }

      // First, register on source chain (this creates the agent ID)
      console.log(`📝 Step 1: Registering agent on ${sourceDeployment.chainName} (source chain)...`);
      
      // Register on source chain to get agent ID
      await new Promise<string>((resolve, reject) => {
        writeContract({
          address: sourceDeployment.registryAddress as `0x${string}`,
          abi: AGENT_REGISTRY_ABI,
          functionName: 'registerAgent',
          args: [metadataURI, priceInUSDC, revenueShare],
        }, {
          onSuccess: (hash) => {
            console.log(`✅ Source chain registration tx: ${hash}`);
            resolve(hash);
          },
          onError: (error) => reject(error),
        });
      });

      setDeploymentStatus(prev => ({ ...prev, [sourceChainId]: 'success' }));

      // Wait a bit for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Filter out source chain from target chains
      const targetChains = selectedChains.filter(id => id !== sourceChainId);
      
      if (targetChains.length === 0) {
        setSuccessMessage(`✅ Successfully registered on ${sourceDeployment.chainName}!`);
        setIsUploading(false);
        return;
      }

      // Now use Nexus for cross-chain registration to remaining chains
      console.log(`🌐 Step 2: Using Nexus to register to ${targetChains.length} additional chains...`);
      console.log('   This will use Avail for cross-chain message passing');
      
      // Get the newly created agent ID (assuming sequential IDs)
      // In production, we'd query the blockchain for the exact ID
      const agentId = '1'; // Placeholder - should be fetched from event logs

      const nexusResult = await deployToChains({
        agentId,
        sourceChainId,
        targetChainIds: targetChains,
        contractAddress: sourceDeployment.registryAddress,
        agentMetadataURI: metadataURI,
        agentPrice: priceInUSDC.toString(),
        agentRevenueShare: revenueShare,
      });

      if (nexusResult.success) {
        // Mark all target chains as success
        const updatedStatus = { ...initialStatus };
        updatedStatus[sourceChainId] = 'success';
        targetChains.forEach(chainId => {
          updatedStatus[chainId] = 'success';
        });
        setDeploymentStatus(updatedStatus);
        setSuccessMessage(`✅ Successfully registered to ${selectedChains.length} chains! Nexus SDK orchestrated cross-chain registration via Avail.`);
      } else {
        // Mark target chains as error
        targetChains.forEach(chainId => {
          setDeploymentStatus(prev => ({ ...prev, [chainId]: 'error' }));
        });

        setUploadError(`Partial registration: Source chain succeeded, but Nexus registration failed: ${nexusResult.error}`);
      }

    } catch (error: any) {
      console.error('Multi-chain registration error:', error);
      setUploadError(`Failed to register agent: ${error.message || 'Unknown error'}`);
      
      // Mark all as error
      selectedChains.forEach(chainId => {
        setDeploymentStatus(prev => ({ ...prev, [chainId]: 'error' }));
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Create Agent</h1>
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
          isWrongNetwork 
            ? 'bg-red-100 text-red-800 border-2 border-red-300' 
            : 'bg-blue-100 text-blue-800'
        }`}>
          {isWrongNetwork ? '⚠️' : '🔗'} {getNetworkName(chainId)}
        </span>
      </div>
      <p className="text-gray-600 mb-8">Upload agent metadata and register on-chain</p>

      {/* Wrong Network Warning */}
      {isWrongNetwork && (
        <div className="mb-6 card bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300">
          <div className="flex items-start gap-4">
            <div className="text-4xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">Unsupported Network</h3>
              <p className="text-sm text-red-700 mb-3">
                You're currently on <strong>{getNetworkName(chainId)}</strong>, but agents can only be created on supported networks.
              </p>
              <div className="bg-red-100 rounded p-3 text-sm text-red-800">
                <strong>📡 Switch to one of these supported networks:</strong>
                <ul className="mt-2 ml-4 list-disc">
                  <li>Ethereum Sepolia (Chain ID 11155111)</li>
                  <li>Polygon Amoy (Chain ID 80002)</li>
                  <li>Arbitrum Sepolia (Chain ID 421614)</li>
                  <li>Optimism Sepolia (Chain ID 11155420)</li>
                  <li>Base Sepolia (Chain ID 84532)</li>
                  <li>Anvil Local Testnet (Chain ID 31337)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card space-y-6">
        {/* Creation Mode Selector */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-bold mb-4">Choose Creation Method</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {setCreationMode('form'); setJsonConfig(null); setJsonPreview('');}}
              className={`p-4 rounded-lg border-2 transition-all ${
                creationMode === 'form'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">📝</div>
              <div className="font-bold mb-1">Use Form</div>
              <div className="text-sm text-gray-600">Fill out form fields manually</div>
            </button>
            
            <button
              onClick={() => setCreationMode('json')}
              className={`p-4 rounded-lg border-2 transition-all ${
                creationMode === 'json'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">📄</div>
              <div className="font-bold mb-1">Upload JSON</div>
              <div className="text-sm text-gray-600">Advanced config with execution logic</div>
            </button>
          </div>
          
          {creationMode === 'json' && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-3">
                <strong>💡 JSON Mode:</strong> Upload a configuration file to define your agent's execution strategy.
              </p>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">📥 Download Examples:</p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="/examples/agent-config-template.json"
                      download
                      className="px-3 py-1 text-xs bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
                    >
                      📄 Basic Template
                    </a>
                    <a
                      href="/examples/momentum-example.json"
                      download
                      className="px-3 py-1 text-xs bg-white border border-green-300 text-green-700 rounded hover:bg-green-50 transition-colors"
                    >
                      📈 Momentum Strategy
                    </a>
                    <a
                      href="/examples/mean-reversion-example.json"
                      download
                      className="px-3 py-1 text-xs bg-white border border-purple-300 text-purple-700 rounded hover:bg-purple-50 transition-colors"
                    >
                      📊 Mean Reversion
                    </a>
                    <a
                      href="/examples/breakout-example.json"
                      download
                      className="px-3 py-1 text-xs bg-white border border-orange-300 text-orange-700 rounded hover:bg-orange-50 transition-colors"
                    >
                      � Breakout Detection
                    </a>
                    <a
                      href="/examples/hodl-example.json"
                      download
                      className="px-3 py-1 text-xs bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                    >
                      💎 HODL Strategy
                    </a>
                    <a
                      href="/examples/custom-endpoint-example.json"
                      download
                      className="px-3 py-1 text-xs bg-white border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors"
                    >
                      🔧 Custom API
                    </a>
                  </div>
                </div>
                
                <div>
                  <a
                    href="/AGENT_CONFIG_GUIDE.md"
                    target="_blank"
                    className="text-sm text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                  >
                    📚 View Complete Configuration Guide →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* JSON Upload Section */}
        {creationMode === 'json' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Upload Agent Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Configuration File (JSON) *
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleJsonFileUpload}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload a JSON file with your agent configuration including execution strategy
                </p>
              </div>
              
              {jsonPreview && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Configuration Preview
                  </label>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96 font-mono">
                    {jsonPreview}
                  </pre>
                  
                  {jsonConfig?.execution && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm font-semibold text-green-800 mb-1">
                        ✅ Execution Strategy Detected
                      </p>
                      <p className="text-sm text-green-700">
                        Type: <strong>{jsonConfig.execution.type}</strong>
                        {jsonConfig.execution.template && ` (${jsonConfig.execution.template})`}
                        {jsonConfig.execution.endpoint && ` → ${jsonConfig.execution.endpoint}`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Agent Information */}
        {creationMode === 'form' && (
        <div>
          <h2 className="text-xl font-bold mb-4">Step 1: Agent Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Data Analysis Agent"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe what your agent does..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capabilities (comma-separated)
              </label>
              <input
                type="text"
                name="capabilities"
                value={formData.capabilities}
                onChange={handleChange}
                placeholder="e.g., data analysis, prediction, automation"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent Code/Config (optional)
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".json,.yaml,.yml,.js,.py"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {file && (
                <p className="text-sm text-gray-500 mt-1">
                  Selected: {file.name}
                </p>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Step 2: Pricing */}
        <div>
          <h2 className="text-xl font-bold mb-4">Step 2: Pricing</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price per Execution (USDC) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="1"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Minimum: 1 USDC
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Revenue Share (%) *
              </label>
              <input
                type="number"
                name="revenueShare"
                value={formData.revenueShare}
                onChange={handleChange}
                min="0"
                max="90"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                You earn {formData.revenueShare}%, platform earns {100 - parseInt(formData.revenueShare || '0')}%
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Select Registration Chains */}
        <div>
          <h2 className="text-xl font-bold mb-4">Step 3: Select Registration Chains</h2>
          <p className="text-sm text-gray-600 mb-4">
            Choose which chains you want to register your agent on. You can register to multiple chains simultaneously.
          </p>
          
          <div className="space-y-2">
            {[
              { id: 11155111, name: 'Ethereum Sepolia', icon: '⚡' },
              { id: 421614, name: 'Arbitrum Sepolia', icon: '🔵' },
              { id: 11155420, name: 'Optimism Sepolia', icon: '🔴' },
              { id: 84532, name: 'Base Sepolia', icon: '🔷' },
              { id: 80002, name: 'Polygon Amoy', icon: '🟣' },
            ].map((chain) => (
              <label
                key={chain.id}
                className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedChains.includes(chain.id)
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedChains.includes(chain.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedChains([...selectedChains, chain.id]);
                    } else {
                      setSelectedChains(selectedChains.filter(id => id !== chain.id));
                    }
                  }}
                  className="w-5 h-5"
                />
                <span className="text-2xl">{chain.icon}</span>
                <span className="font-medium">{chain.name}</span>
                {deploymentStatus[chain.id] === 'success' && (
                  <span className="ml-auto text-green-600 font-semibold">✓ Deployed</span>
                )}
                {deploymentStatus[chain.id] === 'error' && (
                  <span className="ml-auto text-red-600 font-semibold">✗ Failed</span>
                )}
                {deploymentStatus[chain.id] === 'pending' && (
                  <span className="ml-auto text-yellow-600 font-semibold">⏳ Deploying...</span>
                )}
              </label>
            ))}
          </div>
          
          {selectedChains.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ✓ Selected {selectedChains.length} chain{selectedChains.length !== 1 ? 's' : ''} for registration
              </p>
            </div>
          )}
        </div>

        {/* Step 4: Upload to IPFS */}
        <div>
          <h2 className="text-xl font-bold mb-4">Step 4: Upload to IPFS</h2>
          
          <button
            onClick={handleUploadToIPFS}
            disabled={isUploading || !formData.name || !formData.description || isWrongNetwork}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWrongNetwork 
              ? '⚠️ Wrong Network - Switch to Anvil' 
              : isUploading 
              ? 'Uploading to IPFS...' 
              : 'Upload to IPFS'}
          </button>

          {ipfsHash && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-1">
                ✅ Uploaded to IPFS!
              </p>
              <p className="text-sm text-green-600 font-mono break-all">
                {ipfsHash}
              </p>
            </div>
          )}
        </div>

        {/* Step 5: Register on Blockchain */}
        <div>
          <h2 className="text-xl font-bold mb-4">Step 5: Register to Selected Chains</h2>
          
          {!isConnected ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Please connect your wallet to register the agent
              </p>
            </div>
          ) : selectedChains.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Please select at least one chain to register your agent
              </p>
            </div>
          ) : selectedChains.length > 1 && !isNexusInitialized ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⏳ Nexus SDK initializing... Please wait a moment for multi-chain registration capability.
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                Multi-chain registration requires Nexus SDK for cross-chain orchestration.
              </p>
            </div>
          ) : (
            <>
              {selectedChains.length > 1 && (
                <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🌐</span>
                    <p className="text-sm font-semibold text-purple-900">
                      Nexus Cross-Chain Deployment
                    </p>
                    <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                      ✅ SDK Ready
                    </span>
                  </div>
                  <p className="text-xs text-purple-700 mb-2">
                    You'll sign <strong>once per chain</strong> ({selectedChains.length} signatures total). 
                    Nexus SDK automatically handles bridging and execution on each chain.
                  </p>
                  <p className="text-xs text-purple-600">
                    💡 <strong>What happens:</strong> Register on source chain first, then Nexus orchestrates 
                    registration to remaining chains using Avail for cross-chain messaging.
                  </p>
                </div>
              )}
              
              <button
                onClick={handleRegisterAgent}
                disabled={!ipfsHash || isWritePending || isConfirming || isWrongNetwork || selectedChains.length === 0 || isUploading || (selectedChains.length > 1 && !isNexusInitialized)}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isWrongNetwork
                  ? '⚠️ Wrong Network - Switch to supported chain'
                  : isUploading
                  ? selectedChains.length > 1
                    ? `🌐 Deploying via Nexus... (${Object.values(deploymentStatus).filter(s => s === 'success').length}/${selectedChains.length})`
                    : `⏳ Deploying... (${Object.values(deploymentStatus).filter(s => s === 'success').length}/${selectedChains.length})`
                  : isWritePending
                  ? 'Waiting for approval...'
                  : isConfirming
                  ? 'Confirming transaction...'
                  : selectedChains.length > 1
                  ? `🌐 Deploy to ${selectedChains.length} Chains (Automated via Nexus)`
                  : `Deploy to ${selectedChains.length} Chain`}
              </button>

              {hash && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    Transaction submitted!
                  </p>
                  <p className="text-sm text-blue-600 font-mono break-all">
                    {hash}
                  </p>
                </div>
              )}

              {isConfirmed && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-lg font-bold text-green-800 mb-2">
                    🎉 Agent Registered Successfully!
                  </p>
                  <p className="text-sm text-green-600 mb-4">
                    Your agent has been registered on the blockchain.
                  </p>
                  <a
                    href="/my-agents"
                    className="btn-primary inline-block"
                  >
                    View My Agents
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-semibold">
              {successMessage}
            </p>
          </div>
        )}

        {/* Error Messages */}
        {uploadError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ❌ {uploadError}
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="card mt-8 bg-blue-50">
        <h3 className="font-bold text-blue-900 mb-2">ℹ️ How it works:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Fill in your agent details (name, description, capabilities)</li>
          <li>Set pricing and revenue share</li>
          <li>Upload metadata to IPFS (decentralized storage)</li>
          <li>Register agent on blockchain (requires wallet signature)</li>
          <li>Your agent is now live in the marketplace!</li>
        </ol>
      </div>
    </div>
  );
}
