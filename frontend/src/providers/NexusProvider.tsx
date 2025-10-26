import {
  OnAllowanceHookData,
  OnIntentHookData,
  EthereumProvider,
} from '@avail-project/nexus-core';
import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useMemo,
  useCallback,
  Dispatch,
  SetStateAction,
} from 'react';
import { useAccount } from 'wagmi';
import { sdk } from '../lib/nexus'; // Single SDK instance following Avail best practices
import { AllowanceModal } from '../components/AllowanceModal';
import { IntentModal } from '../components/IntentModal';

interface NexusContextType {
  nexusSdk: typeof sdk | undefined;
  isInitialized: boolean;
  allowanceModal: OnAllowanceHookData | null;
  setAllowanceModal: Dispatch<SetStateAction<OnAllowanceHookData | null>>;
  intentModal: OnIntentHookData | null;
  setIntentModal: Dispatch<SetStateAction<OnIntentHookData | null>>;
  cleanupSDK: () => void;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

interface NexusProviderProps {
  children: ReactNode;
  isConnected: boolean;
}

export const NexusProvider: React.FC<NexusProviderProps> = ({
  children,
  isConnected,
}) => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [allowanceModal, setAllowanceModal] =
    useState<OnAllowanceHookData | null>(null);
  const [intentModal, setIntentModal] = useState<OnIntentHookData | null>(null);

  const { connector } = useAccount();

  // Separate effect for initialization
  useEffect(() => {
    let mounted = true;

    console.log('🔍 NexusProvider useEffect triggered:', {
      isConnected,
      hasConnector: !!connector,
      isInitialized,
      timestamp: new Date().toISOString()
    });

    const initializeSDK = async () => {
      // Only initialize if connected and not already initialized
      if (!isConnected) {
        console.log('⏸️  Skipping SDK init: wallet not connected');
        return;
      }
      
      if (isInitialized) {
        console.log('⏸️  Skipping SDK init: SDK already initialized');
        return;
      }
      
      if (!connector) {
        console.log('⏸️  Skipping SDK init: no connector available');
        return;
      }

      try {
        console.log('🔄 Attempting to initialize Nexus SDK...');
        console.log('Connection status:', { isConnected, hasConnector: !!connector });
        
        // Get the EIP-1193 provider from the wagmi connector
        // Different connectors expose provider differently:
        // - Some have getProvider() method (MetaMask, WalletConnect)
        // - Some expose provider directly (Rabby, Coinbase)
        let provider: EthereumProvider | undefined;
        
        if (typeof connector.getProvider === 'function') {
          console.log('📞 Using connector.getProvider() method');
          provider = (await connector.getProvider()) as EthereumProvider;
        } else if ((connector as any).provider) {
          console.log('📦 Using connector.provider directly');
          provider = (connector as any).provider as EthereumProvider;
        } else {
          // Fallback: try to get provider from window
          console.log('🌐 Falling back to window.ethereum');
          provider = (window as any).ethereum as EthereumProvider;
        }

        if (!provider) {
          throw new Error('No EIP-1193 provider available from connector, provider property, or window.ethereum');
        }

        console.log('✅ Got EIP-1193 provider from connector');

        // Initialize the single SDK instance (created at module level)
        console.log('⏳ Initializing SDK with provider...');
        await sdk.initialize(provider);
        
        if (!mounted) return; // Don't update state if unmounted

        console.log('✅ Nexus SDK initialized successfully');
        console.log('Supported chains:', sdk.utils.getSupportedChains());
        setIsInitialized(true);

        // Warm-up: fetch unified balances to allow SDK to discover testnet chains.
        // Some Nexus SDK flows populate testnet chains only after a unified-balance query.
        try {
          console.log('⏳ Warming Nexus SDK (fetching unified balances to discover testnet chains)...');
          const _balances = await sdk.getUnifiedBalances();
          console.log('✅ Warm-up balances fetched (SDK should now recognize testnet chains):', _balances);
        } catch (warmErr) {
          console.warn('⚠️ Nexus SDK warm-up failed (this is non-fatal):', warmErr);
        }

        // Set up allowance hook (for token approvals)
        sdk.setOnAllowanceHook(async (data: OnAllowanceHookData) => {
          setAllowanceModal(data);
        });

        // Set up intent hook (for transaction confirmation)
        sdk.setOnIntentHook((data: OnIntentHookData) => {
          setIntentModal(data);
        });
      } catch (error) {
        console.error('❌ Failed to initialize NexusSDK:', error);
        if (mounted) {
          setIsInitialized(false);
        }
      }
    };

    if (isConnected) {
      initializeSDK();
    } else {
      console.log('⏸️  Wallet not connected, waiting...');
    }

    return () => {
      mounted = false;
    };
  }, [isConnected, connector, isInitialized]);

  // Separate effect for cleanup when disconnecting
  useEffect(() => {
    if (!isConnected && isInitialized) {
      console.log('🧹 Cleaning up Nexus SDK due to disconnect');
      sdk.deinit();
      setIsInitialized(false);
    }
  }, [isConnected, isInitialized]);

  const cleanupSDK = useCallback(() => {
    if (isInitialized) {
      sdk.deinit();
      setIsInitialized(false);
      console.log('🧹 Nexus SDK cleaned up');
    }
  }, [isInitialized]);

  const contextValue: NexusContextType = useMemo(
    () => ({
      nexusSdk: isInitialized ? sdk : undefined,
      isInitialized,
      allowanceModal,
      setAllowanceModal,
      intentModal,
      setIntentModal,
      cleanupSDK,
    }),
    [isInitialized, allowanceModal, intentModal, cleanupSDK]
  );

  return (
    <NexusContext.Provider value={contextValue}>
      {children}
      {allowanceModal && (
        <AllowanceModal 
          data={allowanceModal} 
          onClose={() => setAllowanceModal(null)} 
        />
      )}
      {intentModal && (
        <IntentModal 
          data={intentModal} 
          onClose={() => setIntentModal(null)} 
        />
      )}
    </NexusContext.Provider>
  );
};

export const useNexus = (): NexusContextType => {
  const context = useContext(NexusContext);
  if (context === undefined) {
    throw new Error('useNexus must be used within a NexusProvider');
  }
  return context;
};
