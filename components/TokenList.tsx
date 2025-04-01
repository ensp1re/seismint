"use client"

import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getTokenFactoryContract } from "@/lib/contracts/TokenFactory"
import { Coins, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Token {
    id: string
    name: string
    symbol: string
    initialSupply: string
    decimals: number
    isMintable: boolean
    isBurnable: boolean
    isPausable: boolean
    ownerAddress: string
    contractAddress: string
    createdAt: string
    fromBlockchain?: boolean
}

export function TokenList() {
    const [tokens, setTokens] = useState<Token[]>([])
    const [loading, setLoading] = useState(true)
    const { address, isConnected } = useAccount()

    useEffect(() => {
        async function fetchTokens() {
            try {
                // Fetch from database
                const response = await fetch("/api/tokens")
                const data = await response.json()
                let dbTokens = data.tokens || []

                // If connected to wallet, also fetch from blockchain
                if (window.ethereum && isConnected) {
                    try {
                        const provider = new ethers.providers.Web3Provider(window.ethereum)
                        const signer = provider.getSigner()
                        const userAddress = await signer.getAddress()

                        const tokenFactory = getTokenFactoryContract(provider)
                        const tokenAddresses = await tokenFactory.getTokensByCreator(userAddress)

                        // For each token address, check if it's already in dbTokens
                        // If not, we'll need to fetch its details and add it
                        const newTokens = []

                        for (const tokenAddress of tokenAddresses) {
                            const exists = dbTokens.some((t: Token) => t.contractAddress.toLowerCase() === tokenAddress.toLowerCase())

                            if (!exists) {
                                try {
                                    // Fetch token details from the blockchain
                                    const tokenContract = new ethers.Contract(
                                        tokenAddress,
                                        [
                                            "function name() view returns (string)",
                                            "function symbol() view returns (string)",
                                            "function totalSupply() view returns (uint256)",
                                            "function decimals() view returns (uint8)",
                                            "function isMintable() view returns (bool)",
                                            "function isBurnable() view returns (bool)",
                                            "function isPausable() view returns (bool)"
                                        ],
                                        provider
                                    )

                                    const [name, symbol, totalSupply, decimals, isMintable, isBurnable, isPausable] =
                                        await Promise.all([
                                            tokenContract.name(),
                                            tokenContract.symbol(),
                                            tokenContract.totalSupply(),
                                            tokenContract.decimals(),
                                            tokenContract.isMintable().catch(() => false),
                                            tokenContract.isBurnable().catch(() => false),
                                            tokenContract.isPausable().catch(() => false)
                                        ])

                                    newTokens.push({
                                        id: `blockchain-${tokenAddress}`,
                                        name,
                                        symbol,
                                        initialSupply: ethers.utils.formatUnits(totalSupply, decimals),
                                        decimals,
                                        isMintable,
                                        isBurnable,
                                        isPausable,
                                        ownerAddress: userAddress,
                                        contractAddress: tokenAddress,
                                        createdAt: new Date().toISOString(),
                                        fromBlockchain: true
                                    })
                                } catch (error) {
                                    console.error(`Error fetching details for token ${tokenAddress}:`, error)
                                }
                            }
                        }

                        dbTokens = [...dbTokens, ...newTokens]
                    } catch (error) {
                        console.error("Error fetching tokens from blockchain:", error)
                    }
                }

                setTokens(dbTokens)
            } catch (error) {
                console.error("Error fetching tokens:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchTokens()
    }, [address, isConnected])

    if (loading) {
        return (
            <Card className="seismic-card">
                <CardHeader>
                    <CardTitle className="text-seismic-darkbrown">Your Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full mb-3" />
                    ))}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="seismic-card">
            <CardHeader>
                <CardTitle className="text-seismic-darkbrown">Your Tokens</CardTitle>
            </CardHeader>
            <CardContent>
                {tokens.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 bg-white/60 rounded-lg border border-seismic-sand">
                        <Coins className="h-10 w-10 sm:h-12 sm:w-12 text-seismic-sand mx-auto mb-4" />
                        <p className="text-seismic-brown font-medium mb-2">You haven&apos;t created any tokens yet</p>
                        <p className="text-seismic-stone text-sm mb-6">Create your first token to see it here</p>
                        <Button
                            asChild
                            className="bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white"
                        >
                            <a href="/tokens">Create Token</a>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tokens.map((token) => (
                            <div
                                key={token.id}
                                className="bg-white/60 rounded-lg border border-seismic-sand p-3 sm:p-4 hover:bg-white/80 transition-colors"
                            >
                                <div className="flex flex-col gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-seismic-brown/10 p-2 rounded-full">
                                            <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-seismic-brown" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-seismic-darkbrown">{token.name}</h3>
                                            <p className="text-xs sm:text-sm text-seismic-brown">{token.symbol}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {token.fromBlockchain && (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                                From Blockchain
                                            </Badge>
                                        )}
                                        {token.isMintable && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                Mintable
                                            </Badge>
                                        )}
                                        {token.isBurnable && (
                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                                Burnable
                                            </Badge>
                                        )}
                                        {token.isPausable && (
                                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                                Pausable
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-seismic-stone space-y-1">
                                    <p>
                                        Supply: <span className="font-medium">{token.initialSupply}</span>
                                    </p>
                                    <p className="truncate max-w-full">
                                        Address: <span className="font-medium">{token.contractAddress}</span>
                                    </p>
                                    <p>
                                        Created: <span className="font-medium">{new Date(token.createdAt).toLocaleDateString()}</span>
                                    </p>
                                </div>
                                <div className="mt-2 pt-2 border-t border-seismic-sand">
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-seismic-sand hover:bg-seismic-sand/50 text-seismic-brown"
                                    >
                                        <a
                                            href={`https://explorer-2.seismicdev.net/address/${token.contractAddress}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            View on Explorer
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

