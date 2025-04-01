"use client"

import { useEffect, useState } from "react"
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import { ethers } from "ethers"
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getUserCollectionContract } from "@/lib/contracts/CollectionFactory"
import { seismicDevnet } from "@/lib/chains"
import toast from "react-hot-toast"

interface Collection {
    id: number
    name: string
    symbol: string
    mintPrice: string
    address: string
    creator: string
    createdAt: string
    totalSupply?: number
    maxSupply?: number
}

interface NFTMinterProps {
    collection: Collection
}

export function NFTMinter({ collection }: NFTMinterProps) {
    const { isConnected } = useAccount()
    const { open } = useWeb3Modal()
    const [isMinting, setIsMinting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [tokenId, setTokenId] = useState<number | null>(null)

    console.log("Collection:", collection)

    // Add network check in the component
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()
    const [networkError, setNetworkError] = useState(() => chain?.id !== seismicDevnet.id)

    useEffect(() => {
        if (chain?.id !== seismicDevnet.id) {
            setNetworkError(true)
        }
        else {
            setNetworkError(false)
        }

    }, [chain])

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

        setIsMinting(true)

        try {
            // Get the provider from window.ethereum
            if (!window.ethereum) {
                throw new Error("Ethereum provider is not available. Please install a wallet like MetaMask.")
            }
            const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)

            // Get the collection contract
            const collectionContract = getUserCollectionContract(collection.address, provider)

            // Get the mint price
            const mintPrice = await collectionContract.mintPrice()

            // Mint the NFT
            const tx = await collectionContract.mint({ value: mintPrice })

            // Wait for the transaction to be mined
            const receipt = await tx.wait()

            // Get the token ID from the event
            const event = receipt.events?.find((e: ethers.Event) => e.event === "TokenMinted")
            const tokenId = event?.args?.tokenId.toNumber()

            if (!tokenId) {
                throw new Error("Failed to get token ID from event")
            }

            setTokenId(tokenId)
            setIsSuccess(true)

            toast.success(`NFT minted successfully! Token ID: ${tokenId}`)

        } catch (error) {
            console.error("Error minting NFT:", error)
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            toast.success(`Error minting NFT: ${errorMessage}`)
        } finally {
            setIsMinting(false)
        }
    }

    return (
        <Card className="seismic-card border-seismic-sand">
            <CardHeader className="px-6 pt-6 pb-0 border-b-0">
                <CardTitle className="text-2xl text-seismic-darkbrown">Mint NFT from {collection.name}</CardTitle>
                <CardDescription className="text-seismic-brown">Mint a new NFT from this collection</CardDescription>
            </CardHeader>

            <CardContent className="px-6 pt-4 pb-6">
                {networkError && (
                    <Alert variant="default" className="mb-6 bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Wrong Network</AlertTitle>
                        <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 text-amber-700">
                            <span>Please switch to the Seismic devnet to mint NFTs.</span>
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

                {isSuccess ? (
                    <div className="text-center py-8 bg-white/60 rounded-lg border border-seismic-sand">
                        <div className="mx-auto mb-4">
                            <div className="h-16 w-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-8 w-8 text-white" />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-seismic-darkbrown mb-2">NFT Minted Successfully!</h3>
                        <p className="text-seismic-brown mb-4">
                            You have minted NFT #{tokenId} from the {collection.name} collection.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button
                                variant="outline"
                                className="border-seismic-sand hover:bg-seismic-sand/50 text-seismic-brown"
                                onClick={() => setIsSuccess(false)}
                            >
                                Mint Another
                            </Button>
                            <Button
                                asChild
                                className="bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white"
                            >
                                <a
                                    href={`https://explorer-2.seismicdev.net/address/${collection.address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    View on Explorer
                                </a>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white/60 rounded-lg border border-seismic-sand p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-seismic-stone mb-1">Collection Name</p>
                                    <p className="font-medium text-seismic-darkbrown">{collection.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-seismic-stone mb-1">Symbol</p>
                                    <p className="font-medium text-seismic-darkbrown">{collection.symbol}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-seismic-stone mb-1">Mint Price</p>
                                    <p className="font-medium text-seismic-darkbrown">{collection.mintPrice} ETH</p>
                                </div>
                                <div>
                                    <p className="text-xs text-seismic-stone mb-1">Total Supply</p>
                                    <p className="font-medium text-seismic-darkbrown">{collection.maxSupply || 0} NFTs</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                            <p>
                                When you mint an NFT, you&apos;ll pay the mint price set by the collection creator. The NFT will be
                                transferred to your wallet immediately.
                            </p>
                        </div>

                        <Button
                            className="w-full bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white py-6 text-lg font-medium"
                            disabled={isMinting}
                            onClick={mintNFT}
                        >
                            {isMinting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Minting NFT...
                                </>
                            ) : (
                                `Mint NFT for ${collection.mintPrice} ETH`
                            )}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

