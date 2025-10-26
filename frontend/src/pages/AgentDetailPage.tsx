import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { fetchAgent } from '../lib/api';
import { AGENT_REGISTRY_ADDRESS, AGENT_REGISTRY_ABI, PAYMENT_TOKEN_ADDRESS, ERC20_ABI } from '../config/contracts';

function AgentDetailPage() {
  const { id } = useParams();
  const { address, isConnected, chainId } = useAccount();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (id) {
      fetchAgent(Number(id))
        .then(setAgent)
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleExecute = async () => {
    if (!agent || !address) return;
    
    setExecuting(true);
    try {
      // Simple execution on current chain
      await writeContract({
        address: AGENT_REGISTRY_ADDRESS,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'executeAgent',
        args: [BigInt(agent.id), BigInt(chainId || 11155111), '0x'],
        value: parseUnits(agent.price, 6), // USDC has 6 decimals
      });
    } catch (error) {
      console.error('Execution failed:', error);
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

      {!isConnected ? (
        <p className="text-yellow-500">Please connect your wallet to execute</p>
      ) : (
        <button 
          onClick={handleExecute}
          disabled={executing || isConfirming}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg"
        >
          {executing || isConfirming ? 'Executing...' : 'Execute Agent'}
        </button>
      )}

      {isSuccess && (
        <p className="mt-4 text-green-500">✅ Execution successful!</p>
      )}
    </div>
  );
}

export default AgentDetailPage;