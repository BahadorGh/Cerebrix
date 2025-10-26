// CRITICAL: Polyfills MUST be set up BEFORE any other imports
// This is required for Nexus SDK to work in the browser
import { Buffer } from 'buffer';

// @ts-ignore - Set up global polyfills for browser environment
window.Buffer = Buffer;
// @ts-ignore
window.process = window.process || { env: {} };
// @ts-ignore
window.global = window;

// Now we can safely import everything else
import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { NotificationProvider, TransactionPopupProvider } from '@blockscout/app-sdk';
import { NexusProvider } from './providers/NexusProvider';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

import App from './App';
import { config } from './config/wagmi';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient();

// Wrapper component to access useAccount hook
function AppProviders() {
  const { isConnected, address, connector } = useAccount();
  
  console.log('🔌 AppProviders - Wallet Status:', {
    isConnected,
    address,
    hasConnector: !!connector,
    connectorId: connector?.id
  });
  
  return (
    <NexusProvider isConnected={isConnected}>
      <NotificationProvider>
        <TransactionPopupProvider>
          <App />
        </TransactionPopupProvider>
      </NotificationProvider>
    </NexusProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <AppProviders />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
