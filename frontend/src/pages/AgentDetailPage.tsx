import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { fetchAgent } from '../lib/api';
import ChainSelector from '../components/ChainSelector';
import { AGENT_REGISTRY_ADDRESS, AGENT_REGISTRY_ABI, PAYMENT_TOKEN_ADDRESS } from '../config/contracts';
import { useBalance } from 'wagmi';
import { bridgeAndExecute } from '../lib/nexus';


function AgentDetailPage() {
  const { id } = useParams();
  const { address, isConnected, chainId } = useAccount();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [selectedChain, setSelectedChain] = useState<number>(11155111);

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: balance } = useBalance({
    address: address,
    token: PAYMENT_TOKEN_ADDRESS,
    chainId: chainId,
    });

  useEffect(() => {
    if (id) {
      fetchAgent(Number(id))
        .then(data => {
          setAgent(data);
          // Set selected chain to first deployed chain
          if (data.deployedChains?.length > 0) {
            setSelectedChain(data.deployedChains[0]);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const needsBridge = () => {
  if (!chainId || !balance) return false;
  
  // If on different chain, needs bridge
  if (chainId !== selectedChain) return true;
  
  // Check if have enough balance
  const priceInWei = parseUnits(agent.price, 6);
  return balance.value < priceInWei;
};

const handleExecute = async () => {
  if (!agent || !address || !chainId) return;
  
  setExecuting(true);
  try {
    // Check if bridge needed
    if (needsBridge()) {
      console.log('Using bridge & execute...');
      const priceInWei = parseUnits(agent.price, 6);
      
      await bridgeAndExecute(
        { chainId },
        selectedChain,
        priceInWei.toString(),
        agent.id,
        selectedChain
      );
      
      alert('Bridge transaction initiated! Check Nexus Explorer for status.');
    } else {
      // Direct execution on current chain
      console.log('Direct execution...');
      await writeContract({
        address: AGENT_REGISTRY_ADDRESS,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'executeAgent',
        args: [BigInt(agent.id), BigInt(selectedChain), '0x'],
        value: parseUnits(agent.price, 6),
      });
    }
  } catch (error) {
    console.error('Execution failed:', error);
    alert('Execution failed. Check console for details.');
  } finally {
    setExecuting(false);
  }
};

  if (loading) return <div>Loading...</div>;
  if (!agent) return <div>Agent not found</div>;

  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">{agent.name}</h1>
      <p className="text-gray-400 mb-8">{agent.description}</p>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-400">Price:</span>
            <p className="text-xl">{agent.price} USDC</p>
          </div>
          <div>
            <span className="text-gray-400">Total Executions:</span>
            <p className="text-xl">{agent.totalExecutions}</p>
          </div>
        </div>
      </div>

      <ChainSelector
        selectedChain={selectedChain}
        onSelectChain={setSelectedChain}
        availableChains={agent.deployedChains || [11155111]}
      />

{!isConnected ? (
  <p className="text-yellow-500">Please connect your wallet</p>
) : needsBridge() ? (
  <div className="bg-yellow-900/30 border border-yellow-700 p-4 rounded-lg mb-4">
    <p className="text-yellow-400">
      🌉 Cross-chain execution detected. Bridge & Execute will be used.
    </p>
    <p className="text-sm text-gray-400 mt-2">
      Funds will be bridged from {chainId === 11155111 ? 'Sepolia' : 'your current chain'} to execute on the target chain.
    </p>
  </div>
) : null}

      {isSuccess && (
        <p className="mt-4 text-green-500">✅ Execution successful!</p>
      )}
    </div>
  );
}

export default AgentDetailPage;