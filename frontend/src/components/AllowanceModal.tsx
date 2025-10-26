import React, { useState } from 'react';
import { OnAllowanceHookData } from '@avail-project/nexus-core';

interface AllowanceModalProps {
  data: OnAllowanceHookData | null;
  onClose: () => void;
}

export const AllowanceModal: React.FC<AllowanceModalProps> = ({ data, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!data) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      console.log('Modal is waiting for permit signature in wallet...');
      
      if (typeof (data as any).allow === 'function') {
        // Get the sources array from the allowance data
        const sources = (data as any).sources || [];
        
        if (sources.length > 0) {
          // Extract the minimum allowance values from each source
          const allowanceValues = sources.map((source: any) => {
            const minimum = source.allowance?.minimum;
            console.log(`AllowanceModal: Source requires minimum allowance: ${minimum}`);
            return minimum;
          });
          
          console.log(`AllowanceModal: Calling allow() with allowance values: [${allowanceValues.join(', ')}]`);
          
          // Pass array of allowance amounts - this triggers wallet signature
          const permitStartTime = Date.now();
          await (data as any).allow(allowanceValues);
          const permitDuration = Date.now() - permitStartTime;
          
          console.log(`AllowanceModal: USDC permit signed! (took ${permitDuration}ms)`);
          console.log('AllowanceModal approved: Waiting 2 seconds for SDK to process permit...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log('AllowanceModal: Allowance flow complete. Modal will close now.');
          console.log('The bridge transaction should continue processing in the background.');
        } else {
          console.error('AllowanceModal: No sources found in allowance data');
        }
      } else {
        console.warn('AllowanceModal: No allow() method found on allowance data');
      }
      
      // Close modal after everything completes
      console.log('AllowanceModal: Closing...');
      onClose();
    } catch (error) {
      console.error('AllowanceModal: Error approving allowance:', error);
      setIsProcessing(false);
      // Don't close on error so user can see what happened
    }
  };

  const handleReject = () => {
    try {
      console.log('User rejected allowance');
      
      if (typeof (data as any).deny === 'function') {
        console.log('Calling data.deny()...');
        (data as any).deny();
        console.log('Allowance denied. Transaction cancelled.');
      } else {
        console.warn('No deny() method found on allowance data');
      }
    } catch (error) {
      console.error('Error rejecting allowance:', error);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Token Approval Required</h2>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-3">
            We need permission to spend your tokens for cross-chain bridging.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-3">
            <p className="text-sm text-yellow-800 font-medium mb-1">Important:</p>
            <p className="text-sm text-yellow-700">
              This allows bridging tokens across chains. You'll need to approve this in your wallet.
            </p>
          </div>
          {data && (
            <div className="bg-gray-50 p-3 rounded text-xs">
              <p className="text-gray-600">Token: USDC</p>
              <p className="text-gray-600">Amount: Required for bridging</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Approving...
              </>
            ) : (
              'Approve'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
