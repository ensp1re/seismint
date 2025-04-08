"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccount, useNetwork } from "wagmi"
import { ethers } from "ethers"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Droplets } from "lucide-react"
import { getSimpleDexContract, TOKENS, formatTokenAmount } from "@/lib/contracts/SimpleDex"
import { seismicDevnet } from "@/lib/chains"

interface Pool {
    tokenA: {
        address: string
        symbol: string
        logo: string
    }
    tokenB: {
        address: string
        symbol: string
        logo: string
    }
    reserveA: string
    reserveB: string
    userLiquidity: string
}

export function PoolsList() {
    const { isConnected, address } = useAccount()
    const { chain } = useNetwork()
    const [isLoading, setIsLoading] = useState(true)
    const [allPools, setAllPools] = useState<Pool[]>([])
    const [userPools, setUserPools] = useState<Pool[]>([])
    const [activeTab, setActiveTab] = useState("all-pools")

    const isCorrectNetwork = chain?.id === seismicDevnet.id

    const fetchPools = useCallback(async () => {
        if (!window.ethereum) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
            const dexContract = getSimpleDexContract(provider)
            const userAddress = isConnected && address ? address : ethers.constants.AddressZero

            console.log("Fetching pools for user:", userAddress)

            // Create all possible token pairs
            const tokenSymbols = Object.keys(TOKENS)
            const pairs: [string, string][] = []

            for (let i = 0; i < tokenSymbols.length; i++) {
                for (let j = i + 1; j < tokenSymbols.length; j++) {
                    pairs.push([tokenSymbols[i], tokenSymbols[j]])
                }
            }

            // Fetch pool data for each pair
            const poolsData: Pool[] = []

            for (const [symbolA, symbolB] of pairs) {
                const tokenA = TOKENS[symbolA as keyof typeof TOKENS]
                const tokenB = TOKENS[symbolB as keyof typeof TOKENS]

                try {
                    console.log(`Checking pool ${symbolA}-${symbolB}`)

                    // Get pool reserves
                    const pool = await dexContract.liquidityPools(tokenA.address, tokenB.address)
                    console.log(`Pool reserves: ${pool.tokenAReserve.toString()}, ${pool.tokenBReserve.toString()}`)

                    // Skip if pool doesn't exist
                    if (pool.tokenAReserve.eq(0) && pool.tokenBReserve.eq(0)) {
                        console.log(`Pool ${symbolA}-${symbolB} doesn't exist, skipping`)
                        continue
                    }

                    // Get user's liquidity using the getUserLiquidity function
                    const userLiquidity = await dexContract.getUserLiquidity(tokenA.address, tokenB.address, userAddress)
                    console.log(`User liquidity for ${symbolA}-${symbolB}: ${userLiquidity.toString()}`)

                    poolsData.push({
                        tokenA: {
                            address: tokenA.address,
                            symbol: tokenA.symbol,
                            logo: tokenA.logo,
                        },
                        tokenB: {
                            address: tokenB.address,
                            symbol: tokenB.symbol,
                            logo: tokenB.logo,
                        },
                        reserveA: formatTokenAmount(pool.tokenAReserve, tokenA.decimals),
                        reserveB: formatTokenAmount(pool.tokenBReserve, tokenB.decimals),
                        userLiquidity: formatTokenAmount(userLiquidity, 18), // Liquidity tokens have 18 decimals
                    })
                } catch (error) {
                    console.error(`Error fetching pool for ${symbolA}-${symbolB}:`, error)
                }
            }

            console.log("All pools data:", poolsData)
            setAllPools(poolsData)

            const filteredUserPools = poolsData.filter((pool) => Number.parseFloat(pool.userLiquidity) > 0)
            console.log("User pools:", filteredUserPools)
            setUserPools(filteredUserPools)
        } catch (error) {
            console.error("Error fetching pools:", error)
        } finally {
            setIsLoading(false)
        }
    }, [isConnected, address, chain])

    useEffect(() => {
        fetchPools()
    }, [fetchPools])

    if (isLoading) {
        return (
            <Card className="seismic-card">
                <CardHeader>
                    <CardTitle className="text-seismic-darkbrown">Loading Pools</CardTitle>
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
        <Tabs defaultValue="all-pools" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 bg-seismic-sand/30">
                <TabsTrigger
                    value="all-pools"
                    className="data-[state=active]:bg-white data-[state=active]:text-seismic-darkbrown"
                >
                    All Pools
                </TabsTrigger>
                <TabsTrigger
                    value="my-pools"
                    className="data-[state=active]:bg-white data-[state=active]:text-seismic-darkbrown"
                >
                    My Pools
                </TabsTrigger>
            </TabsList>

            <TabsContent value="all-pools">
                {allPools.length === 0 ? (
                    <Card className="seismic-card">
                        <CardContent className="p-8 text-center">
                            <Droplets className="h-12 w-12 text-seismic-sand mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-seismic-darkbrown mb-2">No Liquidity Pools Found</h3>
                            <p className="text-seismic-brown mb-6">Be the first to add liquidity to a pool</p>
                            <Button
                                asChild
                                className="bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white"
                            >
                                <Link href="/liquidity/add">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Liquidity
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allPools.map((pool, index) => (
                            <PoolCard key={index} pool={pool} isUserPool={false} />
                        ))}
                    </div>
                )}
            </TabsContent>

            <TabsContent value="my-pools">
                {!isConnected ? (
                    <Card className="seismic-card">
                        <CardContent className="p-8 text-center">
                            <h3 className="text-xl font-semibold text-seismic-darkbrown mb-2">Connect Your Wallet</h3>
                            <p className="text-seismic-brown mb-6">Connect your wallet to view your liquidity positions</p>
                        </CardContent>
                    </Card>
                ) : userPools.length === 0 ? (
                    <Card className="seismic-card">
                        <CardContent className="p-8 text-center">
                            <Droplets className="h-12 w-12 text-seismic-sand mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-seismic-darkbrown mb-2">No Liquidity Positions</h3>
                            <p className="text-seismic-brown mb-6">You haven't added liquidity to any pools yet</p>
                            <Button
                                asChild
                                className="bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white"
                            >
                                <Link href="/liquidity/add">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Liquidity
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userPools.map((pool, index) => (
                            <PoolCard key={index} pool={pool} isUserPool={true} />
                        ))}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    )
}

interface PoolCardProps {
    pool: Pool
    isUserPool: boolean
}

function PoolCard({ pool, isUserPool }: PoolCardProps) {
    return (
        <Card className="seismic-card overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-center mb-4">
                    <div className="relative h-10 w-16">
                        <Image
                            src={pool.tokenA.logo || "/placeholder.svg"}
                            alt={pool.tokenA.symbol}
                            width={32}
                            height={32}
                            className="absolute left-0 top-0 rounded-full border-2 border-white z-10"
                        />
                        <Image
                            src={pool.tokenB.logo || "/placeholder.svg"}
                            alt={pool.tokenB.symbol}
                            width={32}
                            height={32}
                            className="absolute left-6 top-0 rounded-full border-2 border-white"
                        />
                    </div>
                    <div className="ml-2">
                        <h3 className="font-semibold text-seismic-darkbrown">
                            {pool.tokenA.symbol}/{pool.tokenB.symbol}
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/60 rounded-lg border border-seismic-sand p-2">
                        <p className="text-xs text-seismic-stone mb-1">{pool.tokenA.symbol} Reserve</p>
                        <p className="font-medium text-seismic-darkbrown">{Number.parseFloat(pool.reserveA).toLocaleString()}</p>
                    </div>
                    <div className="bg-white/60 rounded-lg border border-seismic-sand p-2">
                        <p className="text-xs text-seismic-stone mb-1">{pool.tokenB.symbol} Reserve</p>
                        <p className="font-medium text-seismic-darkbrown">{Number.parseFloat(pool.reserveB).toLocaleString()}</p>
                    </div>
                </div>

                {isUserPool && (
                    <div className="bg-white/60 rounded-lg border border-seismic-sand p-2 mb-4">
                        <p className="text-xs text-seismic-stone mb-1">Your Liquidity</p>
                        <p className="font-medium text-seismic-darkbrown">
                            {pool.userLiquidity.toLocaleString()} LP
                        </p>
                    </div>
                )}

                <div className="flex gap-2">
                    <Button
                        asChild
                        variant="outline"
                        className="flex-1 border-seismic-sand hover:bg-seismic-sand/50 text-seismic-brown"
                    >
                        <Link href={`/liquidity/add?tokenA=${pool.tokenA.symbol}&tokenB=${pool.tokenB.symbol}`}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Link>
                    </Button>
                    {isUserPool && Number.parseFloat(pool.userLiquidity) > 0 && (
                        <Button
                            asChild
                            variant="outline"
                            className="flex-1 border-seismic-sand hover:bg-seismic-sand/50 text-seismic-brown"
                        >
                            <Link href={`/liquidity/remove?tokenA=${pool.tokenA.symbol}&tokenB=${pool.tokenB.symbol}`}>
                                <span>Remove</span>
                            </Link>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
