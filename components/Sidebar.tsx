"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Coins, ImageIcon, Menu, X, Droplet, Wallet } from "lucide-react"
import { ReactElement, useState } from "react"
import { useAccount, useBalance, useNetwork } from "wagmi"
import { ethers } from "ethers"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { seismicDevnet } from "@/lib/chains"
import { WalletConnect } from "./WalletConnect"
import Image from "next/image"

export function Sidebar(): ReactElement {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const { address, isConnected } = useAccount()
    const { chain } = useNetwork()
    const { data: balance, isLoading: isBalanceLoading } = useBalance({
        address: address,
        chainId: chain?.id,
    })

    const toggleSidebar = () => setIsOpen(!isOpen)

    const routes = [
        {
            name: "Dashboard",
            path: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            name: "Tokens",
            path: "/tokens",
            icon: Coins,
        },
        {
            name: "NFTs",
            path: "/nfts",
            icon: ImageIcon,
        },
        {
            name: "Faucet",
            path: "https://faucet-2.seismicdev.net/",
            icon: Droplet,
            external: true,
        },
    ]

    const isCorrectNetwork = chain?.id === seismicDevnet.id

    return (
        <>
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-seismic-beige border-b border-seismic-sand p-4 flex justify-between items-center">
                <Link href="/" className="flex items-center">
                <Image
                    src="/logo.png"
                    alt="Seismint Logo"
                    width={32}
                    height={32}
                    className="mr-2"
                />
                    <span className="text-xl font-bold text-seismic-darkbrown">Seismint</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-seismic-darkbrown">
                    <Menu className="h-6 w-6" />
                </Button>
            </div>

            <div
                className={cn(
                    "fixed inset-0 z-50 bg-seismic-beige transform transition-transform duration-300 md:relative md:translate-x-0 md:w-72 md:min-h-screen md:border-r md:border-seismic-sand",
                    isOpen ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="p-4 flex justify-between items-center border-b border-seismic-sand md:h-16">
                    <Link href="/" className="flex items-center">
                        <span className="text-xl font-bold text-seismic-darkbrown">Seismint</span>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden text-seismic-darkbrown">
                        <X className="h-6 w-6" />
                    </Button>
                </div>

                <div className="p-4">
                    <WalletConnect className="w-full mb-6" />

                    {isConnected && (
                        <div className="mb-6 p-4 bg-card-gradient rounded-lg border border-seismic-sand">
                            <div className="flex items-center gap-2 mb-2">
                                <Wallet className="h-4 w-4 text-seismic-brown" />
                                <span className="text-sm font-medium text-seismic-darkbrown">Wallet Balance</span>
                            </div>
                            {isBalanceLoading ? (
                                <Skeleton className="h-7 w-full" />
                            ) : (
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold text-seismic-darkbrown">
                                        {balance ? ethers.utils.formatEther(balance.value).substring(0, 8) : "0.0"} {balance?.symbol}
                                    </span>
                                    {!isCorrectNetwork && (
                                        <span className="text-xs text-amber-600 mt-1">
                                            Switch to Seismic network to see accurate balance
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <nav className="space-y-2">
                        {routes.map((route) =>
                            route.external ? (
                                <a
                                    key={route.path}
                                    href={route.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-seismic-sand",
                                        "text-seismic-darkbrown",
                                    )}
                                >
                                    <route.icon className="h-5 w-5" />
                                    <span>{route.name}</span>
                                </a>
                            ) : (
                                <Link
                                    key={route.path}
                                    href={route.path}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                                        pathname === route.path
                                            ? "bg-seismic-brown text-white"
                                            : "text-seismic-darkbrown hover:bg-seismic-sand",
                                    )}
                                    onClick={() => setIsOpen(false)}
                                >
                                    <route.icon className="h-5 w-5" />
                                    <span>{route.name}</span>
                                </Link>
                            ),
                        )}
                    </nav>
                </div>
            </div>

            {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen(false)} />}

            <div className="md:hidden h-16" />
        </>
    )
}

