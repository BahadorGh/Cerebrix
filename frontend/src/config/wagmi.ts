import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, arbitrumSepolia, baseSepolia, optimismSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'AgentMarketplace',
    projectId: 'demo-project-id',
    chains: [sepolia, arbitrumSepolia, baseSepolia, optimismSepolia],
    ssr: false,
});