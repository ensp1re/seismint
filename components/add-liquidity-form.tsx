"use client"

import { useState, useEffect } from "react"
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import { ethers } from "ethers"
import { Plus, AlertTriangle, Loader2, Info } from "lucide-react"
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
import toast from "react-hot-toast"

export function AddLiquidityForm() {
    const { isConnected } = useAccount()
    const { open } = useWeb3Modal()
    const [isAdding, setIsAdding] = useState(false)
    const [isApprovingA, setIsApprovingA] = useState(false)
    const [isApprovingB, setIsApprovingB] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [tokenASymbol, setTokenASymbol] = useState("USDT")
    const [tokenBSymbol, setTokenBSymbol] = useState("USDC")
    const [tokenAAmount, setTokenAAmount] = useState("")
    const [tokenBAmount, setTokenBAmount] = useState("")
    const [tokenABalance, setTokenABalance] = useState("0")
    const [tokenBBalance, setTokenBBalance] = useState("0")
    const [tokenAAllowance, setTokenAAllowance] = useState("0")
    const [tokenBAllowance, setTokenBAllowance] = useState("0")
    const [poolExists, setPoolExists] = useState(false)
    const [poolRatio, setPoolRatio] = useState("1.00")

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

    // Fetch balances, allowances, and pool info
    useEffect(() => {
        if (!isConnected || !window.ethereum || networkError) return

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
                const tokenAContract = getTokenContract(tokenA.address, provider)
                const tokenBContract = getTokenContract(tokenB.address, provider)
                const dexContract = getSimpleDexContract(provider)

                // Get balances and allowances
                const [aBalance, bBalance, aAllowance, bAllowance] = await Promise.all([
                    tokenAContract.balanceOf(userAddress),
                    tokenBContract.balanceOf(userAddress),
                    tokenAContract.allowance(userAddress, dexContract.address),
                    tokenBContract.allowance(userAddress, dexContract.address),
                ])

                setTokenABalance(formatTokenAmount(aBalance, tokenA.decimals))
                setTokenBBalance(formatTokenAmount(bBalance, tokenB.decimals))
                setTokenAAllowance(formatTokenAmount(aAllowance, tokenA.decimals))
                setTokenBAllowance(formatTokenAmount(bAllowance, tokenB.decimals))

                // Check if pool exists and get ratio
                try {
                    const pool = await dexContract.liquidityPools(tokenA.address, tokenB.address)
                    const reversePool = await dexContract.liquidityPools(tokenB.address, tokenA.address)

                    const hasLiquidity =
                        (pool.tokenAReserve.gt(0) && pool.tokenBReserve.gt(0)) ||
                        (reversePool.tokenAReserve.gt(0) && reversePool.tokenBReserve.gt(0))

                    setPoolExists(hasLiquidity)

                    if (hasLiquidity) {
                        const ratio = pool.tokenAReserve.gt(0)
                            ? pool.tokenBReserve.mul(ethers.utils.parseUnits("1", 18)).div(pool.tokenAReserve)
                            : reversePool.tokenAReserve.mul(ethers.utils.parseUnits("1", 18)).div(reversePool.tokenBReserve)

                        setPoolRatio(ethers.utils.formatUnits(ratio, 18))
                    }
                } catch (error) {
                    console.error("Error checking pool:", error)
                    setPoolExists(false)
                }
            } catch (error) {
                console.error("Error fetching data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [isConnected, networkError, tokenA, tokenB])

    // Calculate token B amount when token A amount changes (if pool exists)
    useEffect(() => {
        if (!tokenAAmount || !poolExists || !isConnected) return

        try {
            const amountA = Number.parseFloat(tokenAAmount)
            const ratio = Number.parseFloat(poolRatio)
            const amountB = amountA * ratio
            setTokenBAmount(amountB.toFixed(6))
        } catch (error) {
            console.error("Error calculating amounts:", error)
        }
    }, [tokenAAmount, poolExists, poolRatio, isConnected])

    // Calculate token A amount when token B amount changes (if pool exists)
    useEffect(() => {
        if (!tokenBAmount || !poolExists || !isConnected) return

        try {
            const amountB = Number.parseFloat(tokenBAmount)
            const ratio = Number.parseFloat(poolRatio)
            const amountA = amountB / ratio
            setTokenAAmount(amountA.toFixed(6))
        } catch (error) {
            console.error("Error calculating amounts:", error)
        }
    }, [tokenBAmount, poolExists, poolRatio, isConnected])

    const handleMaxA = () => {
        setTokenAAmount(tokenABalance)
    }

    const handleMaxB = () => {
        setTokenBAmount(tokenBBalance)
    }

    const handleApproveA = async () => {
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

        setIsApprovingA(true)

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
            const tokenContract = getTokenContract(tokenA.address, provider)
            const dexContract = getSimpleDexContract(provider)

            const amountToApprove = ethers.constants.MaxUint256
            const tx = await tokenContract.approve(dexContract.address, amountToApprove)
            await tx.wait()

            // Update allowance
            const signer = provider.getSigner()
            const userAddress = await signer.getAddress()
            const allowance = await tokenContract.allowance(userAddress, dexContract.address)
            setTokenAAllowance(formatTokenAmount(allowance, tokenA.decimals))

            toast.success(
                `Approval Successful: You have approved ${tokenA.symbol} for adding liquidity.`,
            )
        } catch (error) {
            console.error("Error approving token:", error)
            toast.error(
                error instanceof Error ? error.message : "There was an error approving your token.",
            )
        } finally {
            setIsApprovingA(false)
        }
    }

    const handleApproveB = async () => {
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

        setIsApprovingB(true)

        try {
            if (!window.ethereum) {
                throw new Error("Ethereum provider is not available");
            }
            const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
            const tokenContract = getTokenContract(tokenB.address, provider)
            const dexContract = getSimpleDexContract(provider)

            const amountToApprove = ethers.constants.MaxUint256
            const tx = await tokenContract.approve(dexContract.address, amountToApprove)
            await tx.wait()

            // Update allowance
            const signer = provider.getSigner()
            const userAddress = await signer.getAddress()
            const allowance = await tokenContract.allowance(userAddress, dexContract.address)
            setTokenBAllowance(formatTokenAmount(allowance, tokenB.decimals))

            toast.success(
                `Approval Successful: You have approved ${tokenB.symbol} for adding liquidity.`,
            )
        } catch (error) {
            console.error("Error approving token:", error)
            toast.error(
                error instanceof Error ? error.message : "There was an error approving your token.",
            )
        } finally {
            setIsApprovingB(false)
        }
    }

    const handleAddLiquidity = async () => {
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

        if (!tokenAAmount || !tokenBAmount) {
            toast.error("Please enter amounts for both tokens.")
            return
        }

        const amountA = parseTokenAmount(tokenAAmount, tokenA.decimals)
        const amountB = parseTokenAmount(tokenBAmount, tokenB.decimals)
        const allowanceA = parseTokenAmount(tokenAAllowance, tokenA.decimals)
        const allowanceB = parseTokenAmount(tokenBAllowance, tokenB.decimals)

        if (amountA.gt(allowanceA)) {
            toast.error(
                `Insufficient Allowance: Please approve ${tokenA.symbol} first.`,
            )
            return
        }

        if (amountB.gt(allowanceB)) {
            toast.error(
                `Insufficient Allowance: Please approve ${tokenB.symbol} first.`,
            )
            return
        }

        setIsAdding(true)

        try {
            if (!window.ethereum) {
                throw new Error("Ethereum provider is not available");
            }
            const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
            const dexContract = getSimpleDexContract(provider)

            const tx = await dexContract.addLiquidity(tokenA.address, tokenB.address, amountA, amountB)
            await tx.wait()

            // Update balances
            const signer = provider.getSigner()
            const userAddress = await signer.getAddress()
            const tokenAContract = getTokenContract(tokenA.address, provider)
            const tokenBContract = getTokenContract(tokenB.address, provider)

            const [aBalance, bBalance] = await Promise.all([
                tokenAContract.balanceOf(userAddress),
                tokenBContract.balanceOf(userAddress),
            ])

            setTokenABalance(formatTokenAmount(aBalance, tokenA.decimals))
            setTokenBBalance(formatTokenAmount(bBalance, tokenB.decimals))

            // Reset form
            setTokenAAmount("")
            setTokenBAmount("")

            toast.success(
                `Liquidity Added: You have successfully added ${tokenA.symbol} and ${tokenB.symbol} to the pool.`,
            )
        } catch (error) {
            console.error("Error adding liquidity:", error)
            toast.success(
                error instanceof Error ? error.message : "There was an error adding liquidity.",
            )
        } finally {
            setIsAdding(false)
        }
    }

    const insufficientBalanceA = Number.parseFloat(tokenAAmount) > Number.parseFloat(tokenABalance)
    const insufficientBalanceB = Number.parseFloat(tokenBAmount) > Number.parseFloat(tokenBBalance)
    const needsApprovalA = parseTokenAmount(tokenAAmount || "0", tokenA.decimals).gt(
        parseTokenAmount(tokenAAllowance || "0", tokenA.decimals),
    )
    const needsApprovalB = parseTokenAmount(tokenBAmount || "0", tokenB.decimals).gt(
        parseTokenAmount(tokenBAllowance || "0", tokenB.decimals),
    )

    return (
        <Card className="seismic-card border-seismic-sand p-2">
            <CardContent className="p-6">
                {networkError && (
                    <Alert variant="default" className="mb-6 bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Wrong Network</AlertTitle>
                        <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 text-amber-700">
                            <span>Please switch to the Seismic devnet to add liquidity.</span>
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
                    {/* Pool Info */}
                    {poolExists && (
                        <Alert className="bg-blue-50 border-blue-200">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-blue-800">Existing Pool Found</AlertTitle>
                            <AlertDescription className="text-blue-700">
                                This pool already has liquidity. Adding tokens in the correct ratio will prevent slippage.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Token A Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-seismic-stone">
                                Balance: {isLoading ? "Loading..." : `${Number.parseFloat(tokenABalance).toFixed(6)} ${tokenASymbol}`}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <TokenSelector selectedToken={tokenASymbol} onSelectToken={setTokenASymbol} excludeToken={tokenBSymbol} />
                            <TokenInput
                                value={tokenAAmount}
                                onChange={setTokenAAmount}
                                onMax={handleMaxA}
                                disabled={isAdding || isLoading}
                            />
                        </div>
                        {needsApprovalA && tokenAAmount && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-1 border-seismic-sand hover:bg-seismic-sand/50 text-seismic-brown"
                                onClick={handleApproveA}
                                disabled={isApprovingA}
                            >
                                {isApprovingA ? (
                                    <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        Approving {tokenASymbol}...
                                    </>
                                ) : (
                                    `Approve ${tokenASymbol}`
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Plus Icon */}
                    <div className="flex justify-center">
                        <div className="bg-seismic-sand/30 rounded-full p-2">
                            <Plus className="h-5 w-5 text-seismic-brown" />
                        </div>
                    </div>

                    {/* Token B Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-seismic-stone">
                                Balance: {isLoading ? "Loading..." : `${Number.parseFloat(tokenBBalance).toFixed(6)} ${tokenBSymbol}`}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <TokenSelector selectedToken={tokenBSymbol} onSelectToken={setTokenBSymbol} excludeToken={tokenASymbol} />
                            <TokenInput
                                value={tokenBAmount}
                                onChange={setTokenBAmount}
                                onMax={handleMaxB}
                                disabled={isAdding || isLoading}
                            />
                        </div>
                        {needsApprovalB && tokenBAmount && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-1 border-seismic-sand hover:bg-seismic-sand/50 text-seismic-brown"
                                onClick={handleApproveB}
                                disabled={isApprovingB}
                            >
                                {isApprovingB ? (
                                    <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        Approving {tokenBSymbol}...
                                    </>
                                ) : (
                                    `Approve ${tokenBSymbol}`
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Pool Ratio */}
                    {poolExists && tokenAAmount && tokenBAmount && (
                        <div className="bg-white/60 rounded-lg border border-seismic-sand p-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-seismic-stone">Pool Ratio</span>
                                <span className="text-xs font-medium text-seismic-darkbrown">
                                    1 {tokenASymbol} = {Number.parseFloat(poolRatio).toFixed(6)} {tokenBSymbol}
                                </span>
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
                    ) : insufficientBalanceA || insufficientBalanceB ? (
                        <Button className="w-full bg-red-500 hover:bg-red-600 text-white py-6 text-lg font-medium" disabled={true}>
                            Insufficient {insufficientBalanceA ? tokenASymbol : tokenBSymbol} Balance
                        </Button>
                    ) : needsApprovalA || needsApprovalB ? (
                        <Button
                            className="w-full bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white py-6 text-lg font-medium"
                            disabled={true}
                        >
                            Approve Tokens Above
                        </Button>
                    ) : (
                        <Button
                            className="w-full bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white py-6 text-lg font-medium"
                            disabled={isAdding || !tokenAAmount || !tokenBAmount}
                            onClick={handleAddLiquidity}
                        >
                            {isAdding ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Adding Liquidity...
                                </>
                            ) : (
                                "Add Liquidity"
                            )}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
