import React, { useState } from 'react';
import { OnIntentHookData } from '@avail-project/nexus-core';

interface IntentModalProps {
  data: OnIntentHookData | null;
  onClose: () => void;
}

export const IntentModal: React.FC<IntentModalProps> = ({ data, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!data) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      console.log('User approved intent, proceeding with transaction...');
      
      if (typeof (data as any).allow === 'function') {
        console.log('Calling data.allow()...');
        const allowPromise = (data as any).allow();
        console.log('Waiting for bridge transaction to process...');
        
        await allowPromise;
        
        console.log('Intent allowed! Bridge transaction initiated.');
        console.log('Bridge may continue processing in the background.');
        
        // Wait a moment to ensure intent has been processed 
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.warn('No allow() method found on intent data');
      }
      
      onClose();
    } catch (error) {
      console.error('Error approving intent:', error);
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    try {
      console.log('User rejected intent');
      
      if (typeof (data as any).deny === 'function') {
        console.log('Calling data.deny()...');
        (data as any).deny();
        console.log('Intent denied. Transaction cancelled.');
      } else {
        console.warn('No deny() method found on intent data');
      }
    } catch (error) {
      console.error('Error rejecting intent:', error);
    }
    onClose();
  };

  // Extract intent details for display
  const intent = (data as any)?.intent;
  const source = intent?.sources?.[0];
  const destination = intent?.destination;
  const token = intent?.token;
  const fees = intent?.fees;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Cross-Chain Transaction</h2>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-3">
            The Nexus SDK is ready to process your cross-chain agent deployment.
          </p>

          {/* Transaction Details */}
          {source && destination && token && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4 rounded-lg mb-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">From:</span>
                  <span className="font-medium">{source.chainName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">To:</span>
                  <span className="font-medium">{destination.chainName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-mono font-medium">{source.amount} {token.symbol}</span>
                </div>
                {fees?.total && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-blue-300">
                    <span className="text-gray-500">Total Fees:</span>
                    <span className="font-mono">{fees.total} {token.symbol}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-3">
            <p className="text-sm text-blue-800 font-medium mb-1">What will happen:</p>
            <ul className="text-sm text-blue-700 space-y-1 ml-4">
              <li>• Bridge {source?.amount || '1'} {token?.symbol || 'USDC'} to {destination?.chainName || 'target chain'}</li>
              <li>• Register your agent on the target chain</li>
              <li>• You'll sign the transaction in your wallet</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : (
              'Proceed'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
