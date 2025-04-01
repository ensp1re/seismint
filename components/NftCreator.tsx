"use client"

import { useState, useEffect } from "react"
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { ethers } from "ethers"
import { Loader2, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getCollectionFactoryContract, getCollectionCreationFee } from "@/lib/contracts/CollectionFactory"
import { seismicDevnet } from "@/lib/chains"
import toast from "react-hot-toast"
import { NFTCreationSuccess } from "./NftCreationSuccess"
import { FileUpload } from "./FileUpload"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Update the form schema to include maxSupply
const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    symbol: z.string().min(1, "Symbol is required").max(8, "Symbol must be 8 characters or less"),
    baseURI: z.string().min(1, "Base URI is required").url("Must be a valid URL"),
    mintPrice: z.string().min(1, "Mint price is required"),
    maxSupply: z.coerce.number().min(1, "Supply must be at least 1").max(10000, "Supply cannot exceed 10,000"),
})

type FormValues = z.infer<typeof formSchema>

export function NFTCreator() {
    const { isConnected } = useAccount()
    const { open } = useWeb3Modal()
    const [isCreating, setIsCreating] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [collectionAddress, setCollectionAddress] = useState("")
    const [collectionId, setCollectionId] = useState<number | null>(null)
    const [fee, setFee] = useState<string>("0.01")

    // File upload states
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadedIpfsHash, setUploadedIpfsHash] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<string>("upload")

    // Add network check in the component
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()
    const [networkError, setNetworkError] = useState(false)

    // Update the form defaultValues to include maxSupply
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            symbol: "",
            baseURI: "",
            mintPrice: "0.01",
            maxSupply: 100,
        },
    })

    // Add useEffect to check network
    useEffect(() => {
        if (isConnected && chain?.id !== seismicDevnet.id) {
            setNetworkError(true)
        } else {
            setNetworkError(false)
        }
    }, [chain, isConnected])

    // Handle file selection
    const handleFileSelect = (file: File) => {
        setSelectedFile(file)
        const fileUrl = URL.createObjectURL(file)
        setPreviewUrl(fileUrl)

        // If we're in upload tab, update the baseURI field to empty
        // since we'll generate it after upload
        if (activeTab === "upload") {
            form.setValue("baseURI", "")
        }
    }

    // Clear selected file
    const clearFile = () => {
        setSelectedFile(null)
        setPreviewUrl(null)
        setUploadedIpfsHash(null)
    }

    // Upload file to IPFS via Pinata
    const uploadFile = async () => {
        if (!selectedFile) {
            toast.error("Please select a file to upload")
            return null
        }

        setIsUploading(true)

        try {
            const formData = new FormData()
            formData.append("file", selectedFile)

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                throw new Error("Failed to upload file")
            }

            const data = await response.json()
            setUploadedIpfsHash(data.ipfsHash)

            // Set the baseURI to the IPFS gateway URL
            const baseURI = `https://ipfs.io/ipfs/${data.ipfsHash}/`
            form.setValue("baseURI", baseURI)

            toast.success("File uploaded to IPFS successfully")
            return data.ipfsHash
        } catch (error) {
            console.error("Error uploading file:", error)
            toast.error("Failed to upload file to IPFS")
            return null
        } finally {
            setIsUploading(false)
        }
    }

    async function onSubmit(values: FormValues) {
        if (!isConnected) {
            open()
            return
        }

        if (chain?.id !== seismicDevnet.id) {
            if (switchNetwork) {
                switchNetwork(seismicDevnet.id)
            } else {
                toast.error("Please switch to the Seismic devnet to create NFT collections.")
            }
            return
        }

        // If we're in upload tab and have a file but haven't uploaded it yet
        if (activeTab === "upload" && selectedFile && !uploadedIpfsHash) {
            const ipfsHash = await uploadFile()
            if (!ipfsHash) return // Stop if upload failed
        }

        setIsCreating(true)

        try {
            // Get the provider from window.ethereum
            if (!window.ethereum) {
                throw new Error("Ethereum provider is not available in the browser.")
            }
            const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider, "any")

            // Get the contract
            const collectionFactory = getCollectionFactoryContract(provider)

            // Get the current fee
            const fee = await collectionFactory.creationFee()

            // Update the contract call in the onSubmit function to include maxSupply
            // Replace the existing createCollection call with this:
            const tx = await collectionFactory.createCollection(
                values.name,
                values.symbol,
                values.baseURI,
                ethers.utils.parseEther(values.mintPrice),
                values.maxSupply,
                { value: fee },
            )

            // Wait for the transaction to be mined
            const receipt = await tx.wait()

            // Get the collection address from the event
            const event = receipt.events?.find((e: ethers.Event) => e.event === "CollectionCreated")
            const collectionAddress = event?.args?.collectionAddress
            const collectionId = event?.args?.collectionId.toNumber()

            if (!collectionAddress) {
                throw new Error("Failed to get collection address from event")
            }

            setCollectionAddress(collectionAddress)
            setCollectionId(collectionId)

            // Save to database (you would implement this API endpoint)
            await fetch("/api/collections", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...values,
                    ownerAddress: await provider.getSigner().getAddress(),
                    collectionAddress: collectionAddress,
                    collectionId: collectionId,
                    ipfsHash: uploadedIpfsHash,
                }),
            })

            setIsSuccess(true)

            toast.success("NFT Collection Created Successfully")
        } catch (error) {
            console.error("Error creating collection:", error)
            toast.error("Error creating collection: " + (error instanceof Error ? error.message : "Unknown error"))
        } finally {
            setIsCreating(false)
        }
    }

    useEffect(() => {
        const fetchFee = async () => {
            if (isConnected) {
                try {
                    if (!window.ethereum) {
                        throw new Error("Ethereum provider is not available in the browser.")
                    }
                    const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
                    const currentFee = await getCollectionCreationFee(provider)
                    setFee(currentFee)
                } catch (error) {
                    console.error("Error fetching fee:", error)
                }
            }
        }

        fetchFee()
    }, [isConnected])

    // Update the NFTCreationSuccess component call to include maxSupply:
    if (isSuccess) {
        return (
            <NFTCreationSuccess
                collectionAddress={collectionAddress}
                collectionId={collectionId}
                onReset={() => {
                    setIsSuccess(false)
                    form.reset()
                    clearFile()
                }}
            />
        )
    }

    return (
        <Card className="seismic-card border-seismic-sand">
            <CardHeader className="px-6 pt-6 pb-0 border-b-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl text-seismic-darkbrown">Collection Details</CardTitle>
                        <CardDescription className="text-seismic-brown">
                            Fill out the information for your NFT collection
                        </CardDescription>
                    </div>
                    <div className="bg-white/60 px-3 py-1 rounded-full border border-seismic-sand text-sm font-medium text-seismic-brown">
                        Fee: {fee} ETH
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-6 pt-4">
                {networkError && (
                    <Alert variant="default" className="mb-6 bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Wrong Network</AlertTitle>
                        <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 text-amber-700">
                            <span>Please switch to the Seismic devnet to create NFT collections.</span>
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

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-seismic-darkbrown">Collection Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="My NFT Collection"
                                                {...field}
                                                className="border-seismic-sand bg-white/60 focus:border-seismic-brown focus:ring-seismic-brown"
                                            />
                                        </FormControl>
                                        <FormDescription className="text-seismic-stone">The name of your NFT collection</FormDescription>
                                        <FormMessage className="text-red-500" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="symbol"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-seismic-darkbrown">Collection Symbol</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="MNFT"
                                                {...field}
                                                className="border-seismic-sand bg-white/60 focus:border-seismic-brown focus:ring-seismic-brown"
                                            />
                                        </FormControl>
                                        <FormDescription className="text-seismic-stone">
                                            A short ticker symbol (e.g., BAYC, PUNK)
                                        </FormDescription>
                                        <FormMessage className="text-red-500" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Tabs defaultValue="upload" className="w-full" onValueChange={(value) => setActiveTab(value)}>
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="upload">Upload to IPFS</TabsTrigger>
                                <TabsTrigger value="custom">Custom Base URI</TabsTrigger>
                            </TabsList>

                            <TabsContent value="upload" className="space-y-4">
                                <div className="space-y-2">
                                    <FormLabel className="text-seismic-darkbrown">Collection Image</FormLabel>
                                    <FileUpload
                                        onFileSelect={handleFileSelect}
                                        isUploading={isUploading}
                                        previewUrl={previewUrl}
                                        onClear={clearFile}
                                    />
                                    <FormDescription className="text-seismic-stone">
                                        Upload your collection image to IPFS via Pinata
                                    </FormDescription>
                                </div>

                                {selectedFile && !uploadedIpfsHash && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-seismic-sand hover:bg-seismic-sand/20"
                                        onClick={uploadFile}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Uploading to IPFS...
                                            </>
                                        ) : (
                                            "Upload to IPFS"
                                        )}
                                    </Button>
                                )}

                                {uploadedIpfsHash && (
                                    <Alert className="bg-green-50 border-green-200">
                                        <Info className="h-4 w-4 text-green-600" />
                                        <AlertTitle className="text-green-800">Upload Successful</AlertTitle>
                                        <AlertDescription className="text-green-700">
                                            Your image has been uploaded to IPFS with hash: {uploadedIpfsHash.substring(0, 8)}...
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </TabsContent>

                            <TabsContent value="custom">
                                <FormField
                                    control={form.control}
                                    name="baseURI"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-seismic-darkbrown">Metadata Base URI</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="https://example.com/api/metadata/"
                                                    {...field}
                                                    className="border-seismic-sand bg-white/60 focus:border-seismic-brown focus:ring-seismic-brown"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-seismic-stone">
                                                The base URI for your NFT metadata (e.g., https://example.com/api/metadata/)
                                            </FormDescription>
                                            <FormMessage className="text-red-500" />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>
                        </Tabs>

                        {/* Add the maxSupply form field before the mint price field */}
                        {/* Add this code before the mintPrice FormField: */}
                        <FormField
                            control={form.control}
                            name="maxSupply"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-seismic-darkbrown">Maximum Supply</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="100"
                                            {...field}
                                            className="border-seismic-sand bg-white/60 focus:border-seismic-brown focus:ring-seismic-brown"
                                        />
                                    </FormControl>
                                    <FormDescription className="text-seismic-stone">
                                        The maximum number of NFTs that can be minted in this collection
                                    </FormDescription>
                                    <FormMessage className="text-red-500" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="mintPrice"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-seismic-darkbrown">Mint Price (ETH)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.001"
                                            placeholder="0.01"
                                            {...field}
                                            className="border-seismic-sand bg-white/60 focus:border-seismic-brown focus:ring-seismic-brown"
                                        />
                                    </FormControl>
                                    <FormDescription className="text-seismic-stone">The price to mint each NFT in ETH</FormDescription>
                                    <FormMessage className="text-red-500" />
                                </FormItem>
                            )}
                        />

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-blue-700 font-medium mb-1">About NFT Collections</h4>
                                <p className="text-blue-600 text-sm">
                                    When you create a collection, you&apos;ll be the owner and receive all mint fees. Users can mint NFTs
                                    from your collection, and the metadata will be fetched from your provided base URI.
                                </p>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white py-6 text-lg font-medium"
                            disabled={isCreating || isUploading}
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Creating Collection...
                                </>
                            ) : (
                                "Create NFT Collection"
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

