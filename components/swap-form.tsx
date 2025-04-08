"use client"

import { useState, useEffect } from "react"
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import { ethers } from "ethers"
import { ArrowDown, AlertTriangle, Loader2, Clock, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { seismicDevnet } from "@/lib/chains"
import {
    getSimpleDexContract,
    getTokenContract,
    TOKENS,
    formatTokenAmount,
    parseTokenAmount,
} from "@/lib/contracts/SimpleDex"
import { TokenSelector } from "@/components/token-selector"
import { TokenInput } from "@/components/token-input"
import { TradeHistoryModal } from "@/components/trade-history-modal"
import Link from "next/link"
import toast from "react-hot-toast"

export function SwapForm() {
    const { isConnected } = useAccount()
    const { open } = useWeb3Modal()
    const [isSwapping, setIsSwapping] = useState(false)
    const [isApproving, setIsApproving] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [tokenInSymbol, setTokenInSymbol] = useState("USDT")
    const [tokenOutSymbol, setTokenOutSymbol] = useState("USDC")
    const [tokenInAmount, setTokenInAmount] = useState("")
    const [tokenOutAmount, setTokenOutAmount] = useState("")
    const [tokenInBalance, setTokenInBalance] = useState("0")
    const [tokenOutBalance, setTokenOutBalance] = useState("0")
    const [tokenInAllowance, setTokenInAllowance] = useState("0")
    const [priceImpact, setPriceImpact] = useState("0.00")
    const [exchangeRate, setExchangeRate] = useState("1.00")
    const [showTradeHistory, setShowTradeHistory] = useState(false)
    // Add a new state variable to track if the user has liquidity in the pool
    const [hasLiquidity, setHasLiquidity] = useState(false)

    // Add network check in the component
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()
    const [networkError, setNetworkError] = useState(chain?.id !== seismicDevnet.id)

    const tokenIn = TOKENS[tokenInSymbol as keyof typeof TOKENS]
    const tokenOut = TOKENS[tokenOutSymbol as keyof typeof TOKENS]

    // Check network
    useEffect(() => {
        setNetworkError(isConnected && chain?.id !== seismicDevnet.id)
    }, [chain, isConnected])

    // Fetch balances and allowances
    useEffect(() => {
        if (!isConnected || !window.ethereum || networkError) return

        // Update the fetchData function in the first useEffect to check for user liquidity
        const fetchData = async () => {
            setIsLoading(true)
            try {
                if (!window.ethereum) {
                    throw new Error("Ethereum provider is not available");
                }
                const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
                const signer = provider.getSigner()
                const userAddress = await signer.getAddress()

                // Get token contracts
                const tokenInContract = getTokenContract(tokenIn.address, provider)
                const tokenOutContract = getTokenContract(tokenOut.address, provider)
                const dexContract = getSimpleDexContract(provider)

                // Get balances
                const [inBalance, outBalance, inAllowance, userLiquidity] = await Promise.all([
                    tokenInContract.balanceOf(userAddress),
                    tokenOutContract.balanceOf(userAddress),
                    tokenInContract.allowance(userAddress, dexContract.address),
                    dexContract.liquidity(tokenIn.address, tokenOut.address),
                ])

                setTokenInBalance(formatTokenAmount(inBalance, tokenIn.decimals))
                setTokenOutBalance(formatTokenAmount(outBalance, tokenOut.decimals))
                setTokenInAllowance(formatTokenAmount(inAllowance, tokenIn.decimals))
                setHasLiquidity(userLiquidity.gt(0))

                // Get exchange rate
                try {
                    const pool = await dexContract.liquidityPools(tokenIn.address, tokenOut.address)
                    if (pool.tokenAReserve.gt(0) && pool.tokenBReserve.gt(0)) {
                        const rate = pool.tokenBReserve.mul(ethers.utils.parseUnits("1", 18)).div(pool.tokenAReserve)
                        setExchangeRate(ethers.utils.formatUnits(rate, 18))
                    }
                } catch (error) {
                    console.error("Error fetching exchange rate:", error)
                }
            } catch (error) {
                console.error("Error fetching data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [isConnected, networkError, tokenIn, tokenOut])

    // Calculate output amount when input amount changes
    useEffect(() => {
        if (!tokenInAmount || !isConnected || !window.ethereum || networkError) return

        const calculateOutput = async () => {
            try {
                if (!window.ethereum) {
                    throw new Error("Ethereum provider is not available");
                }
                const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
                const dexContract = getSimpleDexContract(provider)

                // Get pool reserves
                const pool = await dexContract.liquidityPools(tokenIn.address, tokenOut.address)

                let reserveIn, reserveOut
                if (tokenIn.address < tokenOut.address) {
                    reserveIn = pool.tokenAReserve
                    reserveOut = pool.tokenBReserve
                } else {
                    reserveIn = pool.tokenBReserve
                    reserveOut = pool.tokenAReserve
                }

                if (reserveIn.gt(0) && reserveOut.gt(0)) {
                    const amountIn = parseTokenAmount(tokenInAmount, tokenIn.decimals)
                    const amountOut = await dexContract.getAmountOut(amountIn, reserveIn, reserveOut)
                    setTokenOutAmount(formatTokenAmount(amountOut, tokenOut.decimals))

                    // Calculate price impact
                    const impact = amountIn.mul(10000).div(reserveIn.add(amountIn))
                    setPriceImpact((impact.toNumber() / 100).toFixed(2))
                }
            } catch (error) {
                console.error("Error calculating output:", error)
                setTokenOutAmount("")
                setPriceImpact("0.00")
            }
        }

        calculateOutput()
    }, [tokenInAmount, tokenIn, tokenOut, isConnected, networkError])

    const handleSwapTokens = () => {
        const tempSymbol = tokenInSymbol
        setTokenInSymbol(tokenOutSymbol)
        setTokenOutSymbol(tempSymbol)
        setTokenInAmount("")
        setTokenOutAmount("")
    }

    const handleMaxInput = () => {
        setTokenInAmount(tokenInBalance)
    }

    const handleApprove = async () => {
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

        setIsApproving(true)

        try {
            if (!window.ethereum) {
                throw new Error("Ethereum provider is not available");
            }
            const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
            const tokenContract = getTokenContract(tokenIn.address, provider)
            const dexContract = getSimpleDexContract(provider)

            const amountToApprove = ethers.constants.MaxUint256
            const tx = await tokenContract.approve(dexContract.address, amountToApprove)
            await tx.wait()

            // Update allowance
            const signer = provider.getSigner()
            const userAddress = await signer.getAddress()
            const allowance = await tokenContract.allowance(userAddress, dexContract.address)
            setTokenInAllowance(formatTokenAmount(allowance, tokenIn.decimals))

            toast.success(`Successfully approved ${tokenInSymbol} for swapping!`)
        } catch (error) {
            console.error("Error approving token:", error)
            toast.error(
                error instanceof Error ? error.message : "There was an error approving the token. Please try again.",
            )
        } finally {
            setIsApproving(false)
        }
    }

    const handleSwap = async () => {
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

        if (!tokenInAmount || !tokenOutAmount) {
            toast.error("Please enter an amount to swap.")
            return
        }

        const amountIn = parseTokenAmount(tokenInAmount, tokenIn.decimals)
        const allowance = parseTokenAmount(tokenInAllowance, tokenIn.decimals)

        if (amountIn.gt(allowance)) {
            toast.error("Please approve the token before swapping.")
            return
        }

        setIsSwapping(true)

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
            const dexContract = getSimpleDexContract(provider)

            const tx = await dexContract.swapTokens(tokenIn.address, tokenOut.address, amountIn)
            await tx.wait()

            // Update balances
            const signer = provider.getSigner()
            const userAddress = await signer.getAddress()
            const tokenInContract = getTokenContract(tokenIn.address, provider)
            const tokenOutContract = getTokenContract(tokenOut.address, provider)

            const [inBalance, outBalance] = await Promise.all([
                tokenInContract.balanceOf(userAddress),
                tokenOutContract.balanceOf(userAddress),
            ])

            setTokenInBalance(formatTokenAmount(inBalance, tokenIn.decimals))
            setTokenOutBalance(formatTokenAmount(outBalance, tokenOut.decimals))

            // Reset form
            setTokenInAmount("")
            setTokenOutAmount("")

            toast.success(
                `Successfully swapped ${tokenInAmount} ${tokenInSymbol} for ${formatTokenAmount(
                    amountIn.mul(parseTokenAmount(exchangeRate, 18)).div(ethers.utils.parseUnits("1", 18)),
                    tokenOut.decimals,
                )} ${tokenOutSymbol}!`,
            )
        } catch (error) {
            console.error("Error swapping tokens:", error)
            toast.error(
                error instanceof Error ? error.message : "There was an error swapping the tokens. Please try again.",
            )
        } finally {
            setIsSwapping(false)
        }
    }

    const insufficientBalance = Number.parseFloat(tokenInAmount) > Number.parseFloat(tokenInBalance)
    const needsApproval = parseTokenAmount(tokenInAmount || "0", tokenIn.decimals).gt(
        parseTokenAmount(tokenInAllowance || "0", tokenIn.decimals),
    )

    return (
        <Card className="seismic-card border-seismic-sand p-8">
            <CardContent className="p-6">
                {networkError && (
                    <Alert variant="destructive" className="mb-6 bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Wrong Network</AlertTitle>
                        <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 text-amber-700">
                            <span>Please switch to the Seismic devnet to swap tokens.</span>
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

                {isConnected && !hasLiquidity && !isLoading && (
                    <Alert className="mb-6 bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">No Liquidity</AlertTitle>
                        <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 text-blue-700">
                            <span>You haven't added liquidity to this pool yet. Add liquidity to enable trading.</span>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200"
                            >
                                <Link href={`/liquidity/add?tokenA=${tokenInSymbol}&tokenB=${tokenOutSymbol}`}>Add Liquidity</Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Add a warning message if the user doesn't have liquidity in the pool */}
                {!hasLiquidity && isConnected && (
                    <Alert variant="destructive" className="mb-6 bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">No Liquidity</AlertTitle>
                        <AlertDescription className="text-amber-700">
                            You don't have any liquidity in this pool. Consider adding some!
                        </AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4">
                    {/* Token Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-seismic-darkbrown">From</span>
                            <span className="text-xs text-seismic-stone">
                                Balance: {isLoading ? "Loading..." : `${Number.parseFloat(tokenInBalance).toFixed(6)} ${tokenInSymbol}`}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <TokenSelector
                                selectedToken={tokenInSymbol}
                                onSelectToken={setTokenInSymbol}
                                excludeToken={tokenOutSymbol}
                            />
                            <TokenInput
                                value={tokenInAmount}
                                onChange={setTokenInAmount}
                                onMax={handleMaxInput}
                                disabled={isSwapping || isLoading}
                            />
                        </div>
                    </div>

                    {/* Swap Button */}
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full h-10 w-10 border-seismic-sand bg-white hover:bg-seismic-sand/50"
                            onClick={handleSwapTokens}
                        >
                            <ArrowDown className="h-5 w-5 text-seismic-brown" />
                        </Button>
                    </div>

                    {/* Token Output */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-seismic-darkbrown">To</span>
                            <span className="text-xs text-seismic-stone">
                                Balance:{" "}
                                {isLoading ? "Loading..." : `${Number.parseFloat(tokenOutBalance).toFixed(6)} ${tokenOutSymbol}`}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <TokenSelector
                                selectedToken={tokenOutSymbol}
                                onSelectToken={setTokenOutSymbol}
                                excludeToken={tokenInSymbol}
                            />
                            <TokenInput value={tokenOutAmount} onChange={setTokenOutAmount} disabled={true} placeholder="0.0" />
                        </div>
                    </div>

                    {/* Exchange Rate */}
                    {tokenInAmount && tokenOutAmount && (
                        <div className="bg-white/60 rounded-lg border border-seismic-sand p-3 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-seismic-stone">Exchange Rate</span>
                                <span className="text-xs font-medium text-seismic-darkbrown">
                                    1 {tokenInSymbol} ≈ {Number.parseFloat(exchangeRate).toFixed(6)} {tokenOutSymbol}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-seismic-stone">Price Impact</span>
                                <span className="text-xs font-medium text-seismic-darkbrown">{priceImpact}%</span>
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    {!isConnected ? (
                        <Button
                            className="w-full bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white py-6 text-lg font-medium"
                            onClick={() => open()}
                        >
                            Connect Wallet
                        </Button>
                    ) : insufficientBalance ? (
                        <Button className="w-full bg-red-500 hover:bg-red-600 text-white py-6 text-lg font-medium" disabled={true}>
                            Insufficient {tokenInSymbol} Balance
                        </Button>
                    ) : needsApproval ? (
                        <Button
                            className="w-full bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white py-6 text-lg font-medium"
                            disabled={isApproving || !tokenInAmount}
                            onClick={handleApprove}
                        >
                            {isApproving ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Approving {tokenInSymbol}...
                                </>
                            ) : (
                                `Approve ${tokenInSymbol}`
                            )}
                        </Button>
                    ) : (
                        <Button
                            className="w-full bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white py-6 text-lg font-medium"
                            disabled={isSwapping || !tokenInAmount || !tokenOutAmount || !hasLiquidity}
                            onClick={handleSwap}
                        >
                            {isSwapping ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Swapping...
                                </>
                            ) : !hasLiquidity ? (
                                "Add Liquidity First"
                            ) : (
                                "Swap"
                            )}
                        </Button>
                    )}
                    {isConnected && (
                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={() => setShowTradeHistory(true)}
                                className="flex items-center gap-1.5 text-sm text-seismic-brown hover:text-seismic-darkbrown transition-colors"
                            >
                                <Clock className="h-4 w-4" />
                                <span>View Trade History</span>
                            </button>
                        </div>
                    )}
                </div>
            </CardContent>
            <TradeHistoryModal open={showTradeHistory} onOpenChange={setShowTradeHistory} />
        </Card>
    )
}
