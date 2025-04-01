"use client"

import { useState, useEffect } from "react"
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import { ethers } from "ethers"
import Image from "next/image"
import { Loader2, AlertTriangle, CheckCircle2, Info, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getGenesisNFTContract } from "@/lib/contracts/GenesisNFT"
import { seismicDevnet } from "@/lib/chains"
import toast from "react-hot-toast"
import { Progress } from "./ui/progress"


export function GenesisNFTMinter() {
    const { isConnected } = useAccount()
    const { open } = useWeb3Modal()
    const [isMinting, setIsMinting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [mintAmount, setMintAmount] = useState(1)
    const [nftInfo, setNftInfo] = useState({
        price: "0.05",
        maxSupply: 10000,
        totalSupply: 0,
        maxMintPerTx: 5,
        saleIsActive: false,
    })
    const [userMinted, setUserMinted] = useState(0)

    // Add network check in the component
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()
    const [networkError, setNetworkError] = useState(chain?.id !== seismicDevnet.id)

    // Fetch NFT info
    useEffect(() => {
        async function fetchNFTInfo() {
            if (!isConnected || !window.ethereum) return

            try {
                if (!window.ethereum) {
                    throw new Error("Ethereum provider is not available.")
                }
                const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
                const genesisContract = getGenesisNFTContract(provider)

                const [price, maxSupply, totalSupply, maxMintPerTx, saleIsActive] = await Promise.all([
                    genesisContract.price(),
                    genesisContract.maxSupply(),
                    genesisContract.totalSupply(),
                    genesisContract.maxMintPerTx(),
                    genesisContract.saleIsActive(),
                ])

                setNftInfo({
                    price: ethers.utils.formatEther(price),
                    maxSupply: maxSupply.toNumber(),
                    totalSupply: totalSupply.toNumber(),
                    maxMintPerTx: maxMintPerTx.toNumber(),
                    saleIsActive,
                })

                // Get user's minted count
                const signer = provider.getSigner()
                const userAddress = await signer.getAddress()
                const minted = await genesisContract.getMintedCountByWallet(userAddress)
                setUserMinted(minted.toNumber())
            } catch (error) {
                console.error("Error fetching NFT info:", error)
            }
        }

        fetchNFTInfo()
    }, [isConnected, chain])

    // Check network
    useEffect(() => {
        setNetworkError(isConnected && chain?.id !== seismicDevnet.id)
    }, [chain, isConnected])

    async function mintNFT() {
        if (!isConnected) {
            open()
            return
        }

        if (chain?.id !== seismicDevnet.id) {
            if (switchNetwork) {
                switchNetwork(seismicDevnet.id)
            } else {
                toast.error("Please switch to the Seismic devnet to mint NFTs.")
            }
            return
        }

        if (!nftInfo.saleIsActive) {
            toast.error("NFT sale is not active.")
            return
        }

        setIsMinting(true)

        try {
            // Get the provider from window.ethereum
            if (!window.ethereum) {
                throw new Error("Ethereum provider is not available.")
            }
            const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)

            // Get the Genesis NFT contract
            const genesisContract = getGenesisNFTContract(provider)

            // Calculate total price
            const totalPrice = ethers.utils.parseEther((Number.parseFloat(nftInfo.price) * mintAmount).toString())

            // Mint the NFTs
            const tx = await genesisContract.mint(mintAmount, { value: totalPrice })

            // Wait for the transaction to be mined
            await tx.wait()

            setIsSuccess(true)
            setUserMinted(userMinted + mintAmount)

            toast.success(`Successfully minted ${mintAmount} NFT${mintAmount > 1 ? "s" : ""}!`)
        } catch (error) {
            console.error("Error minting NFT:", error)
            toast.error("Minting failed. Please try again.")
        } finally {
            setIsMinting(false)
        }
    }

    const decrementAmount = () => {
        if (mintAmount > 1) {
            setMintAmount(mintAmount - 1)
        }
    }

    const incrementAmount = () => {
        if (mintAmount < nftInfo.maxMintPerTx) {
            setMintAmount(mintAmount + 1)
        }
    }

    const totalPrice = (Number.parseFloat(nftInfo.price) * mintAmount).toFixed(3)
    const soldOutPercentage = (nftInfo.totalSupply / nftInfo.maxSupply) * 100

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* NFT Image */}
            <div className="relative rounded-lg overflow-hidden border border-seismic-sand shadow-lg h-[300px] sm:h-[400px] md:h-[500px]">
                <Image
                    src="/genesis.jpg"
                    alt="Genesis NFT"
                    fill
                    className="object-cover"
                />
            </div>

            {/* Mint Interface */}
            <div className="space-y-6">
                <Card className="seismic-card border-seismic-sand">
                    <CardContent className="p-6">
                        {networkError && (
                            <Alert variant="default" className="mb-6 bg-amber-50 border-amber-200">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-800">Wrong Network</AlertTitle>
                                <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 text-amber-700">
                                    <span>Please switch to the Seismic devnet to mint Genesis NFTs.</span>
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

                        {!nftInfo.saleIsActive && (
                            <Alert className="mb-6 bg-blue-50 border-blue-200">
                                <Info className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-800">Sale Not Active</AlertTitle>
                                <AlertDescription className="text-blue-700">
                                    The Genesis NFT sale is not currently active. Please check back later.
                                </AlertDescription>
                            </Alert>
                        )}

                        {isSuccess ? (
                            <div className="text-center py-8">
                                <div className="mx-auto mb-4">
                                    <div className="h-16 w-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle2 className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-semibold text-seismic-darkbrown mb-2">NFTs Minted Successfully!</h3>
                                <p className="text-seismic-brown mb-6">
                                    You have minted {mintAmount} Genesis NFT{mintAmount > 1 ? "s" : ""}.
                                </p>
                                <Button
                                    className="bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white"
                                    onClick={() => setIsSuccess(false)}
                                >
                                    Mint More
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-seismic-darkbrown mb-2">Genesis NFT Collection</h2>
                                    <p className="text-seismic-brown mb-4">Exclusive NFTs from the Seismic blockchain</p>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-seismic-stone">Minted</span>
                                                <span className="text-seismic-darkbrown font-medium">
                                                    {nftInfo.totalSupply} / {nftInfo.maxSupply}
                                                </span>
                                            </div>
                                            <Progress
                                                value={soldOutPercentage}
                                                className="h-2 bg-seismic-sand"
                                                style={{ backgroundColor: "var(--seismic-brown)" }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/60 rounded-lg border border-seismic-sand p-3">
                                                <p className="text-xs text-seismic-stone mb-1">Price</p>
                                                <p className="font-medium text-seismic-darkbrown">{nftInfo.price} ETH</p>
                                            </div>
                                            <div className="bg-white/60 rounded-lg border border-seismic-sand p-3">
                                                <p className="text-xs text-seismic-stone mb-1">Max Per Transaction</p>
                                                <p className="font-medium text-seismic-darkbrown">{nftInfo.maxMintPerTx}</p>
                                            </div>
                                            <div className="bg-white/60 rounded-lg border border-seismic-sand p-3">
                                                <p className="text-xs text-seismic-stone mb-1">You Minted</p>
                                                <p className="font-medium text-seismic-darkbrown">{userMinted}</p>
                                            </div>
                                            <div className="bg-white/60 rounded-lg border border-seismic-sand p-3">
                                                <p className="text-xs text-seismic-stone mb-1">Sale Status</p>
                                                <p className="font-medium text-seismic-darkbrown">
                                                    {nftInfo.saleIsActive ? (
                                                        <span className="text-green-600">Active</span>
                                                    ) : (
                                                        <span className="text-amber-600">Not Active</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/60 rounded-lg border border-seismic-sand p-4 mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-medium text-seismic-darkbrown">Mint Amount</p>
                                        <div className="flex items-center">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 border-seismic-sand"
                                                onClick={decrementAmount}
                                                disabled={mintAmount <= 1}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="mx-3 font-bold text-seismic-darkbrown">{mintAmount}</span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 border-seismic-sand"
                                                onClick={incrementAmount}
                                                disabled={mintAmount >= nftInfo.maxMintPerTx}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-seismic-stone">Total Price</span>
                                        <span className="font-medium text-seismic-darkbrown">{totalPrice} ETH</span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white py-6 text-lg font-medium"
                                    disabled={isMinting || !nftInfo.saleIsActive || networkError || userMinted >= 5}
                                    onClick={mintNFT}
                                >
                                    {isMinting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Minting...
                                        </>
                                    ) : (
                                        `Mint ${mintAmount} NFT${mintAmount > 1 ? "s" : ""} for ${totalPrice} ETH`
                                    )}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="bg-white/60 rounded-lg border border-seismic-sand p-4">
                        <h3 className="font-semibold text-seismic-darkbrown mb-2">About Genesis NFTs</h3>
                        <p className="text-seismic-brown text-sm">
                            The Genesis NFT Collection is the first official NFT release on the Seismic blockchain. These NFTs
                            represent the foundation of the Seismic ecosystem and provide holders with exclusive benefits and access
                            to future features.
                        </p>
                    </div>

                    
                </div>
            </div>
        </div>
    )
}

