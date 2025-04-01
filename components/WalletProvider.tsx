"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi/react";
import { WagmiConfig, useAccount, useNetwork } from "wagmi";
import { seismicDevnet } from "@/lib/chains";

// Define the context type
type WalletContextType = {
    address: string | null;
    isConnected: boolean;
    chainId: number | null;
};

// Create the context
const WalletContext = createContext<WalletContextType>({
    address: null,
    isConnected: false,
    chainId: null,
});

// Hook to use the context
export const useWallet = () => useContext(WalletContext);

if (!process.env.NEXT_PUBLIC_PROJECT_ID) {
    throw new Error("NEXT_PUBLIC_PROJECT_ID is not defined. Please set it in your environment variables.");
}

// Configure Wagmi
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "demo";

const chains = [seismicDevnet];
const wagmiConfig = defaultWagmiConfig({
    chains,
    projectId,
    metadata: {
        name: "Seismint",
        description: "Create and manage tokens and NFTs on the blockchain",
        url: "https://seismint.com",
        icons: ["/logo.png"],
    },
});

createWeb3Modal({
    wagmiConfig,
    projectId,
    chains,
    themeMode: "light",
});

// Provider component
export function WalletProvider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiConfig config={wagmiConfig}>
            <WalletContextProvider>{children}</WalletContextProvider>
        </WagmiConfig>
    );
}

// Internal provider to manage wallet state
function WalletContextProvider({ children }: { children: React.ReactNode }) {
    const { address, isConnected } = useAccount();
    const { chain } = useNetwork();

    const [walletState, setWalletState] = useState<WalletContextType>({
        address: address || null,
        isConnected,
        chainId: chain?.id || null,
    });

    useEffect(() => {
        setWalletState({
            address: address || null,
            isConnected,
            chainId: chain?.id || null,
        });
    }, [address, isConnected, chain]);

    return (
        <WalletContext.Provider value={walletState}>
            {children}
        </WalletContext.Provider>
    );
}
