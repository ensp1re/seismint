"use client"

import { useWeb3Modal } from "@web3modal/wagmi/react"
import { useAccount, useDisconnect, useNetwork, useSwitchNetwork } from "wagmi"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { seismicDevnet } from "@/lib/chains"
import { ChevronDown } from "lucide-react"

interface WalletConnectProps {
    className?: string
}

export function WalletConnect({ className }: WalletConnectProps) {
    const { open } = useWeb3Modal()
    const { address, isConnected } = useAccount()
    const { disconnect } = useDisconnect()
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const isCorrectNetwork = chain?.id === seismicDevnet.id

    return (
        <div className={cn("flex flex-col gap-2", className || "")}>
            {isConnected ? (
                <>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-between border-seismic-sand bg-white/50 text-seismic-darkbrown hover:text-seismic-darkbrown hover:bg-white/80",
                            isCorrectNetwork ? "" : "border-amber-300",
                        )}
                        onClick={() => open()}
                    >
                        <span className="font-medium">{formatAddress(address || "")}</span>
                        <ChevronDown className="h-4 w-4 ml-2 opacity-70" />
                    </Button>
                    {!isCorrectNetwork && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            onClick={() => switchNetwork?.(seismicDevnet.id)}
                        >
                            Switch to Seismic Network
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-seismic-brown hover:text-seismic-darkbrown hover:bg-seismic-sand/50"
                        onClick={() => disconnect()}
                    >
                        Disconnect
                    </Button>
                </>
            ) : (
                <Button className="w-full bg-seismic-brown hover:bg-seismic-darkbrown text-white" onClick={() => open()}>
                    Connect Wallet
                </Button>
            )}
        </div>
    )
}

