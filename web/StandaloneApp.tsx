import './init';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { http, createConfig } from 'wagmi'

import { WagmiProvider } from 'wagmi'
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  mainnet,
  sepolia,
  polygon,
  gnosis,
  base,
  baseSepolia,
} from "wagmi/chains";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { wallectConnectId } from './utils/constants';


const config = createConfig({
  chains: [mainnet, sepolia, polygon, gnosis, base, baseSepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [gnosis.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
  connectors: [
    injected({ shimDisconnect: true }),
  ],
});

createWeb3Modal({
  wagmiConfig: config,
  projectId: wallectConnectId,
  enableAnalytics: true,
  enableOnramp: true,
  // allWallets: "ONLY_MOBILE",
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
      <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
