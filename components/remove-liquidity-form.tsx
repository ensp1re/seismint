"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ethers } from "ethers"
import { ArrowLeft, AlertTriangle, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { seismicDevnet } from "@/lib/chains"
import { getSimpleDexContract, TOKENS, formatTokenAmount, getRemovableLiquidity } from "@/lib/contracts/SimpleDex"
import { TokenSelector } from "@/components/token-selector"
import toast from "react-hot-toast"

export function RemoveLiquidityForm() {
    const { isConnected, address } = useAccount()
    const { open } = useWeb3Modal()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isRemoving, setIsRemoving] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [tokenASymbol, setTokenASymbol] = useState(searchParams.get("tokenA") || "USDT")
    const [tokenBSymbol, setTokenBSymbol] = useState(searchParams.get("tokenB") || "USDC")
    const [percentage, setPercentage] = useState(50)
    const [userLiquidity, setUserLiquidity] = useState("0")
    const [tokenAAmount, setTokenAAmount] = useState("0")
    const [tokenBAmount, setTokenBAmount] = useState("0")
    const [poolExists, setPoolExists] = useState(false)
    const [poolReserves, setPoolReserves] = useState<{
        tokenAReserve: ethers.BigNumber
        tokenBReserve: ethers.BigNumber
    } | null>(null)

    // Add network check in the component
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()
    const [networkError, setNetworkError] = useState(chain?.id !== seismicDevnet.id)

    const tokenA = TOKENS[tokenASymbol as keyof typeof TOKENS]
    const tokenB = TOKENS[tokenBSymbol as keyof typeof TOKENS]

    // Check network
    useEffect(() => {
        setNetworkError(isConnected && chain?.id !== seismicDevnet.id)
    }, [chain, isConnected])

    // Update URL when tokens change
    useEffect(() => {
        const params = new URLSearchParams()
        params.set("tokenA", tokenASymbol)
        params.set("tokenB", tokenBSymbol)
        router.replace(`/liquidity/remove?${params.toString()}`)
    }, [tokenASymbol, tokenBSymbol, router])

    // Fetch pool info and user liquidity
    const fetchPoolData = useCallback(async () => {
        if (!isConnected || !window.ethereum || networkError || !address) {
            return
        }

        setIsLoading(true)
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
            const dexContract = getSimpleDexContract(provider)

            // Get pool info
            try {
                console.log("Fetching pool data for", tokenA.address, tokenB.address)
                const pool = await dexContract.liquidityPools(tokenA.address, tokenB.address)
                console.log("Pool reserves:", pool.tokenAReserve.toString(), pool.tokenBReserve.toString())

                const hasLiquidity = pool.tokenAReserve.gt(0) && pool.tokenBReserve.gt(0)
                setPoolExists(hasLiquidity)
                setPoolReserves(hasLiquidity ? pool : null)

                // Get user's liquidity using the getUserLiquidity function
                console.log("Fetching user liquidity for", address)
                const userLiquidity = await dexContract.getUserLiquidity(tokenA.address, tokenB.address, address)
                console.log("User liquidity:", userLiquidity.toString())

                const formattedLiquidity = formatTokenAmount(userLiquidity, 18)
                console.log("Formatted liquidity:", formattedLiquidity)
                setUserLiquidity(formattedLiquidity)

                if (hasLiquidity && userLiquidity.gt(0)) {
                    // Use the new helper function to calculate token amounts
                    const { tokenAAmount, tokenBAmount } = await getRemovableLiquidity(
                        tokenA.address,
                        tokenB.address,
                        address,
                        percentage,
                        provider,
                    )

                    setTokenAAmount(formatTokenAmount(tokenAAmount, tokenA.decimals))
                    setTokenBAmount(formatTokenAmount(tokenBAmount, tokenB.decimals))
                } else {
                    setTokenAAmount("0")
                    setTokenBAmount("0")
                }
            } catch (error) {
                console.error("Error checking pool:", error)
                setPoolExists(false)
                setUserLiquidity("0")
                setTokenAAmount("0")
                setTokenBAmount("0")
                setPoolReserves(null)
            }
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setIsLoading(false)
        }
    }, [isConnected, networkError, tokenA, tokenB, address, percentage])

    // Calculate token amounts based on percentage of user's liquidity

    // Fetch data when component mounts or dependencies change
    useEffect(() => {
        fetchPoolData()
    }, [fetchPoolData])

    // Recalculate token amounts when percentage changes
    useEffect(() => {
        if (poolExists && Number(userLiquidity) > 0 && address) {
            const updateAmounts = async () => {
                try {
                    const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
                    const { tokenAAmount, tokenBAmount } = await getRemovableLiquidity(
                        tokenA.address,
                        tokenB.address,
                        address,
                        percentage,
                        provider,
                    )

                    setTokenAAmount(formatTokenAmount(tokenAAmount, tokenA.decimals))
                    setTokenBAmount(formatTokenAmount(tokenBAmount, tokenB.decimals))
                } catch (error) {
                    console.error("Error updating token amounts:", error)
                }
            }

            updateAmounts()
        }
    }, [percentage, userLiquidity, poolExists, address, tokenA.address, tokenB.address, tokenA.decimals, tokenB.decimals])

    // Update the handleRemoveLiquidity function to include a gas limit and better error handling
    const handleRemoveLiquidity = async () => {
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

        if (!poolExists || Number.parseFloat(userLiquidity) === 0) {
            toast.error("No liquidity found in this pool.")
            return
        }

        setIsRemoving(true)

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
            const dexContract = getSimpleDexContract(provider)

            // Use the helper function to calculate the safe amount to remove
            const { liquidityAmount } = await getRemovableLiquidity(
                tokenA.address,
                tokenB.address,
                address!,
                percentage,
                provider,
            )

            console.log("Removing liquidity:", liquidityAmount.toString())
            console.log("Token addresses:", tokenA.address, tokenB.address)

            // Add gas limit to avoid estimation errors
            const tx = await dexContract.removeLiquidity(tokenA.address, tokenB.address, liquidityAmount, {
                gasLimit: 500000, // Set a reasonable gas limit
            })
            await tx.wait()

            toast.success("Liquidity removed successfully!", { duration: 5000 })

            // Redirect to pools page
            router.push("/liquidity")
        } catch (error) {
            console.error("Error removing liquidity:", error)

            // Provide more specific error messages
            let errorMessage = "There was an error removing your liquidity."
            if (error instanceof Error) {
                if (error.message.includes("Not enough pool liquidity")) {
                    errorMessage = "Not enough liquidity in the pool. Try removing a smaller percentage."
                } else if (error.message.includes("user rejected transaction")) {
                    errorMessage = "Transaction was rejected."
                } else if (error.message.includes("insufficient")) {
                    errorMessage = "Insufficient liquidity. Try removing a smaller percentage."
                } else {
                    errorMessage = error.message
                }
            }

            toast.success(
                errorMessage,
                {
                    icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
                    duration: 5000,
                },
            )
        } finally {
            setIsRemoving(false)
        }
    }

    return (
        <Card className="seismic-card border-seismic-sand">
            <CardContent className="p-6">
                <div className="flex items-center mb-6">
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-seismic-brown hover:text-seismic-darkbrown hover:bg-seismic-sand/50"
                    >
                        <Link href="/liquidity">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Pools
                        </Link>
                    </Button>
                </div>

                {networkError && (
                    <Alert variant="destructive" className="mb-6 bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Wrong Network</AlertTitle>
                        <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 text-amber-700">
                            <span>Please switch to the Seismic devnet to remove liquidity.</span>
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

                <div className="space-y-6">
                    {/* Pool Selection */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-seismic-darkbrown">Pool</span>
                            <span className="text-xs text-seismic-stone">
                                Your Liquidity: {isLoading ? "Loading..." : `${Number.parseFloat(userLiquidity).toFixed(6)} LP`}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <TokenSelector selectedToken={tokenASymbol} onSelectToken={setTokenASymbol} excludeToken={tokenBSymbol} />
                            <TokenSelector selectedToken={tokenBSymbol} onSelectToken={setTokenBSymbol} excludeToken={tokenASymbol} />
                        </div>
                    </div>

                    {!poolExists || Number.parseFloat(userLiquidity) === 0 ? (
                        <Alert className="bg-amber-50 border-amber-200">
                            <Info className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800">No Liquidity Found</AlertTitle>
                            <AlertDescription className="text-amber-700">
                                You don't have any liquidity in this pool. Please select a different pool or add liquidity first.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <>
                            {/* Percentage Slider */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-seismic-darkbrown">Amount to Remove</span>
                                    <span className="text-sm font-medium text-seismic-darkbrown">{percentage}%</span>
                                </div>
                                <Slider
                                    value={[percentage]}
                                    onValueChange={(values) => setPercentage(values[0])}
                                    min={1}
                                    max={100}
                                    step={1}
                                    className="my-4"
                                />
                                <div className="flex justify-between gap-2">
                                    {[25, 50, 75, 100].map((value) => (
                                        <Button
                                            key={value}
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 border-seismic-sand hover:bg-seismic-sand/50 text-seismic-brown"
                                            onClick={() => setPercentage(value)}
                                        >
                                            {value}%
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Token Amounts */}
                            <div className="bg-white/60 rounded-lg border border-seismic-sand p-4 space-y-3">
                                <h3 className="text-sm font-medium text-seismic-darkbrown">You Will Receive</h3>
                                <div className="flex justify-between items-center">
                                    <span className="text-seismic-stone">{tokenASymbol}</span>
                                    <span className="font-medium text-seismic-darkbrown">
                                        {isLoading ? "Loading..." : Number.parseFloat(tokenAAmount).toFixed(6)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-seismic-stone">{tokenBSymbol}</span>
                                    <span className="font-medium text-seismic-darkbrown">
                                        {isLoading ? "Loading..." : Number.parseFloat(tokenBAmount).toFixed(6)}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Action Button */}
                    {!isConnected ? (
                        <Button
                            className="w-full bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white py-6 text-lg font-medium"
                            onClick={() => open()}
                        >
                            Connect Wallet
                        </Button>
                    ) : !poolExists || Number.parseFloat(userLiquidity) === 0 ? (
                        <Button
                            asChild
                            className="w-full bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white py-6 text-lg font-medium"
                        >
                            <Link href="/liquidity/add">Add Liquidity Instead</Link>
                        </Button>
                    ) : (
                        <Button
                            className="w-full bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white py-6 text-lg font-medium"
                            disabled={isRemoving || isLoading}
                            onClick={handleRemoveLiquidity}
                        >
                            {isRemoving ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Removing Liquidity...
                                </>
                            ) : (
                                `Remove ${percentage}% Liquidity`
                            )}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
