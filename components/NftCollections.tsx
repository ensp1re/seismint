/* eslint-disable jsx-a11y/alt-text */
"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getCollectionFactoryContract, getUserCollectionContract } from "@/lib/contracts/CollectionFactory"
import { Image, ExternalLink, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NFTMinter } from "./NftMinter"

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

export function NFTCollections() {
    const [collections, setCollections] = useState<Collection[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
    const { address, isConnected } = useAccount()

    useEffect(() => {
        async function fetchCollections() {
            if (!isConnected || !window.ethereum) {
                setLoading(false)
                return
            }

            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum)
                const signer = provider.getSigner()
                const userAddress = await signer.getAddress()

                // Get the collection factory contract
                const collectionFactory = getCollectionFactoryContract(provider)

                // Validate the user address
                if (!ethers.utils.isAddress(userAddress)) {
                    throw new Error("Invalid user address")
                }

                // Get the user's collection IDs
                let collectionIds = []
                try {
                    collectionIds = await collectionFactory.getCreatorCollections(userAddress)
                } catch (err) {
                    console.error("Error calling getCreatorCollections:", err)
                    throw new Error("Failed to fetch collection IDs. Ensure the contract is deployed and the ABI is correct.")
                }

                // Fetch details for each collection
                const collectionsData = []

                for (const id of collectionIds) {
                    const collectionInfo = await collectionFactory.collections(id)

                    console.log("Collection Info:", collectionInfo)

                    // Get the total supply from the collection contract
                    const collectionContract = getUserCollectionContract(collectionInfo.collectionAddress, provider)
                    const totalSupply = await collectionContract.totalSupply()

                    collectionsData.push({
                        id: id.toNumber(),
                        name: collectionInfo.name,
                        symbol: collectionInfo.symbol,
                        mintPrice: ethers.utils.formatEther(collectionInfo.mintPrice),
                        address: collectionInfo.collectionAddress,
                        creator: collectionInfo.creator,
                        createdAt: new Date(collectionInfo.createdAt.toNumber() * 1000).toISOString(),
                        totalSupply: totalSupply.toNumber(),
                        maxSupply: ethers.BigNumber.from(collectionInfo.maxSupply._hex).toNumber(),
                    })
                }

                setCollections(collectionsData)
            } catch (error) {
                console.error("Error fetching collections:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchCollections()
    }, [address, isConnected])

    if (loading) {
        return (
            <Card className="seismic-card">
                <CardHeader>
                    <CardTitle className="text-seismic-darkbrown">Your NFT Collections</CardTitle>
                </CardHeader>
                <CardContent>
                    {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full mb-3" />
                    ))}
                </CardContent>
            </Card>
        )
    }

    if (selectedCollection) {
        return (
            <div className="space-y-4">
                <Button
                    variant="outline"
                    className="border-seismic-sand hover:bg-seismic-sand/50 text-seismic-brown"
                    onClick={() => setSelectedCollection(null)}
                >
                    ← Back to Collections
                </Button>

                <NFTMinter collection={selectedCollection} />
            </div>
        )
    }

    return (
        <Card className="seismic-card">
            <CardHeader>
                <CardTitle className="text-seismic-darkbrown">Your NFT Collections</CardTitle>
            </CardHeader>
            <CardContent>
                {collections.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 bg-white/60 rounded-lg border border-seismic-sand">
                        <Image
                            className="h-10 w-10 sm:h-12 sm:w-12 text-seismic-sand mx-auto mb-4"

                        />
                        <p className="text-seismic-brown font-medium mb-2">You haven&apos;t created any NFT collections yet</p>
                        <p className="text-seismic-stone text-sm mb-6">Create your first collection to see it here</p>
                        <Button
                            asChild
                            className="bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white"
                        >
                            <a href="#nft-creator">Create Collection</a>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {collections.map((collection) => (
                            <div
                                key={collection.id}
                                className="bg-white/60 rounded-lg border border-seismic-sand p-3 sm:p-4 hover:bg-white/80 transition-colors"
                            >
                                <div className="flex flex-col gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-seismic-brown/10 p-2 rounded-full">
                                            <Image className="h-4 w-4 sm:h-5 sm:w-5 text-seismic-brown" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-seismic-darkbrown">{collection.name}</h3>
                                            <p className="text-xs sm:text-sm text-seismic-brown">{collection.symbol}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                            Mint Price: {collection.mintPrice} ETH
                                        </Badge>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                            Total Supply: {collection.maxSupply || 0}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="text-xs text-seismic-stone space-y-1">
                                    <p className="truncate max-w-full">
                                        Address: <span className="font-medium">{collection.address}</span>
                                    </p>
                                    <p>
                                        Created: <span className="font-medium">{new Date(collection.createdAt).toLocaleDateString()}</span>
                                    </p>
                                </div>
                                <div className="mt-2 pt-2 border-t border-seismic-sand flex flex-col sm:flex-row gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-seismic-sand hover:bg-seismic-sand/50 text-seismic-brown"
                                        onClick={() => setSelectedCollection(collection)}
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Mint NFT
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="border-seismic-sand hover:bg-seismic-sand/50 text-seismic-brown"
                                    >
                                        <a
                                            href={`https://explorer-2.seismicdev.net/address/${collection.address}`}
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

