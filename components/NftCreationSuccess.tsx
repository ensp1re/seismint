"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Copy, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import toast from "react-hot-toast"

interface NFTCreationSuccessProps {
    collectionAddress: string
    collectionId: number | null
    onReset: () => void
}

export function NFTCreationSuccess({ collectionAddress, collectionId, onReset }: NFTCreationSuccessProps) {
    console.log("NFTCreationSuccess component rendered with collectionId:", collectionId)
    const [showAnimation, setShowAnimation] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowAnimation(false)
        }, 3000)

        return () => clearTimeout(timer)
    }, [])

    const copyToClipboard = () => {
        navigator.clipboard.writeText(collectionAddress)
        toast.success("Collection address copied to clipboard!")
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Card className="seismic-card overflow-hidden">
                <div className="bg-gradient-to-r from-seismic-sand to-seismic-beige py-8 px-4 text-center">
                    <div className={`mx-auto mb-4 ${showAnimation ? "animate-bounce" : ""}`}>
                        <div className="h-20 w-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="h-12 w-12 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl sm:text-3xl text-seismic-darkbrown">
                        Collection Created Successfully!
                    </CardTitle>
                    <CardDescription className="text-seismic-brown text-lg mt-2">
                        Your NFT collection has been deployed to the blockchain
                    </CardDescription>
                </div>

                <CardContent className="space-y-6 p-6">
                    <div className="p-4 bg-white/60 rounded-lg border border-seismic-sand">
                        <p className="text-sm font-medium mb-2 text-seismic-brown">Collection Address:</p>
                        <div className="flex items-center justify-between">
                            <code className="text-xs sm:text-sm break-all bg-white/80 p-2 rounded border border-seismic-sand flex-1 mr-2 text-seismic-darkbrown">
                                {collectionAddress}
                            </code>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={copyToClipboard}
                                className="border-seismic-sand hover:bg-seismic-sand/50 text-seismic-brown"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            asChild
                            variant="outline"
                            className="gap-2 border-seismic-sand bg-white/60 hover:bg-white text-seismic-darkbrown"
                        >
                            <a
                                href={`https://explorer-2.seismicdev.net/address/${collectionAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink className="h-4 w-4 text-seismic-brown" />
                                View on Explorer
                            </a>
                        </Button>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col sm:flex-row gap-3 p-6 pt-0">
                    <Button
                        variant="outline"
                        className="w-full sm:w-auto border-seismic-sand hover:bg-seismic-sand/50 text-seismic-brown"
                        onClick={onReset}
                    >
                        Create Another Collection
                    </Button>
                    <Button
                        asChild
                        className="w-full sm:w-auto bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white"
                    >
                        <Link href="/nfts">View My Collections</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

