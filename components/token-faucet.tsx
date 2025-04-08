"use client"

import { useState, useEffect } from "react"
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import { ethers } from "ethers"
import Image from "next/image"
import { Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { seismicDevnet } from "@/lib/chains"
import { getTokenContract, TOKENS, formatTokenAmount } from "@/lib/contracts/SimpleDex"
import toast from "react-hot-toast"

export function TokenFaucet() {
    const { isConnected, address } = useAccount()
    const { open } = useWeb3Modal()
    const [isLoading, setIsLoading] = useState(true)
    const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({})
    const [cooldowns, setCooldowns] = useState<Record<string, number>>({})
    const [requestingToken, setRequestingToken] = useState<string | null>(null)

    // Add network check in the component
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()
    const [networkError, setNetworkError] = useState(chain?.id !== seismicDevnet.id)

    // Check network
    useEffect(() => {
        setNetworkError(isConnected && chain?.id !== seismicDevnet.id)
    }, [chain, isConnected])

    // Fetch balances and cooldowns
    useEffect(() => {
        if (!isConnected || !window.ethereum || networkError) {
            setIsLoading(false)
            return
        }

        const fetchData = async () => {
            setIsLoading(true)
            try {
                if (!window.ethereum) {
                    throw new Error("Ethereum provider is not available");
                }
                const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
                const signer = provider.getSigner()
                const userAddress = await signer.getAddress()

                const balances: Record<string, string> = {}
                const cooldowns: Record<string, number> = {}

                // Fetch data for each token
                for (const [symbol, token] of Object.entries(TOKENS)) {
                    try {
                        const tokenContract = getTokenContract(token.address, provider)
                        const balance = await tokenContract.balanceOf(userAddress)
                        const timeUntilNextFaucet = await tokenContract.timeUntilNextFaucet(userAddress)

                        balances[symbol] = formatTokenAmount(balance, token.decimals)
                        cooldowns[symbol] = timeUntilNextFaucet.toNumber()
                    } catch (error) {
                        console.error(`Error fetching data for ${symbol}:`, error)
                        balances[symbol] = "0"
                        cooldowns[symbol] = 0
                    }
                }

                setTokenBalances(balances)
                setCooldowns(cooldowns)
            } catch (error) {
                console.error("Error fetching data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()

        // Set up interval to update cooldowns
        const interval = setInterval(() => {
            setCooldowns((prevCooldowns) => {
                const newCooldowns: Record<string, number> = {}
                for (const [symbol, cooldown] of Object.entries(prevCooldowns)) {
                    newCooldowns[symbol] = Math.max(0, cooldown - 1)
                }
                return newCooldowns
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [isConnected, networkError, address])

    const requestTokens = async (symbol: string) => {
        if (!isConnected) {
            open()
            return
        }

        if (networkError) {
            if (switchNetwork) {
                switchNetwork(seismicDevnet.id)
            }
            return
        }

        const token = TOKENS[symbol as keyof typeof TOKENS]
        setRequestingToken(symbol)

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
            const tokenContract = getTokenContract(token.address, provider)

            // Call the requestTokens function without any parameters
            // The contract should handle the amount internally
            const tx = await tokenContract.requestTokens()
            await tx.wait()

            // Update balance and cooldown
            const signer = provider.getSigner()
            const userAddress = await signer.getAddress()
            const balance = await tokenContract.balanceOf(userAddress)
            const timeUntilNextFaucet = await tokenContract.timeUntilNextFaucet(userAddress)

            setTokenBalances((prev) => ({
                ...prev,
                [symbol]: formatTokenAmount(balance, token.decimals),
            }))

            setCooldowns((prev) => ({
                ...prev,
                [symbol]: timeUntilNextFaucet.toNumber(),
            }))

            toast.success(`Successfully requested ${symbol} tokens!`)
        } catch (error) {
            console.error(`Error requesting ${symbol} tokens:`, error)
            toast.error(`Failed to request ${symbol} tokens. Please try again.`)
        } finally {
            setRequestingToken(null)
        }
    }

    const formatCooldown = (seconds: number) => {
        if (seconds <= 0) return "Available Now"

        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const remainingSeconds = seconds % 60

        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
    }

    return (
        <div className="space-y-6">
            {networkError && (
                <Alert variant="destructive" className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Wrong Network</AlertTitle>
                    <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 text-amber-700">
                        <span>Please switch to the Seismic devnet to use the faucet.</span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
                            onClick={() => switchNetwork?.(seismicDevnet.id)}
                        >
                            Switch Network
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <Card className="seismic-card">
                <CardHeader>
                    <CardTitle className="text-seismic-darkbrown">Available Tokens</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!isConnected ? (
                        <div className="text-center py-6">
                            <p className="text-seismic-brown mb-4">Connect your wallet to request tokens</p>
                            <Button
                                className="bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white"
                                onClick={() => open()}
                            >
                                Connect Wallet
                            </Button>
                        </div>
                    ) : isLoading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-8 w-8 animate-spin text-seismic-brown" />
                        </div>
                    ) : (
                        Object.entries(TOKENS).map(([symbol, token]) => (
                            <div key={symbol} className="bg-white/60 rounded-lg border border-seismic-sand p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Image
                                            src={token.logo || "/placeholder.svg"}
                                            alt={symbol}
                                            width={40}
                                            height={40}
                                            className="rounded-full"
                                        />
                                        <div>
                                            <h3 className="font-semibold text-seismic-darkbrown">{token.name}</h3>
                                            <p className="text-sm text-seismic-stone">{symbol}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-seismic-darkbrown">
                                            {Number.parseFloat(tokenBalances[symbol] || "0").toLocaleString()} {symbol}
                                        </p>
                                        <p className="text-xs text-seismic-stone">Balance</p>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <Button
                                        className="w-full bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white"
                                        disabled={requestingToken === symbol || (cooldowns[symbol] || 0) > 0 || networkError}
                                        onClick={() => requestTokens(symbol)}
                                    >
                                        {requestingToken === symbol ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Requesting...
                                            </>
                                        ) : (cooldowns[symbol] || 0) > 0 ? (
                                            `Next Request: ${formatCooldown(cooldowns[symbol] || 0)}`
                                        ) : (
                                            "Request 10 Tokens"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card className="seismic-card">
                <CardHeader>
                    <CardTitle className="text-seismic-darkbrown">About the Faucet</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-seismic-brown mb-4">
                        This faucet provides test tokens for the Seismint DEX. You can request each token once every 24 hours. These
                        tokens are for testing purposes only and have no real value.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-800 mb-2">How to use the DEX</h3>
                        <ol className="list-decimal list-inside text-blue-700 space-y-2">
                            <li>Request tokens from the faucet</li>
                            <li>Add liquidity to create a trading pair</li>
                            <li>Swap tokens on the exchange</li>
                            <li>Remove liquidity when you're done</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
