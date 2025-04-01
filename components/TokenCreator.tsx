"use client"

import { useState, useEffect } from "react"
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { ethers } from "ethers"
import { Loader2, AlertTriangle, Info, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getTokenFactoryContract, getTokenFactoryFee } from "@/lib/contracts/TokenFactory"
import { seismicDevnet } from "@/lib/chains"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import toast from "react-hot-toast"
import { TokenCreationSuccess } from "./TokenCreationSuccess"

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    symbol: z.string().min(1, "Symbol is required").max(8, "Symbol must be 8 characters or less"),
    initialSupply: z
        .string()
        .transform((val) => parseFloat(val))
        .refine((val) => !isNaN(val) && val >= 1, "Initial supply is required"),
    decimals: z
        .number()
        .int()
        .refine((val) => val >= 0 && val <= 18, "Decimals must be between 0 and 18"),
    isMintable: z.boolean().default(false),
    isBurnable: z.boolean().default(false),
    isPausable: z.boolean().default(false),
})

type FormValues = z.infer<typeof formSchema>

export function TokenCreator() {
    const { isConnected } = useAccount()
    const { open } = useWeb3Modal()
    const [isCreating, setIsCreating] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [tokenAddress, setTokenAddress] = useState("")
    const [fee, setFee] = useState<string>("0.01")
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

    // Add network check in the component
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()
    const [networkError, setNetworkError] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            symbol: "",
            initialSupply: 0,
            decimals: 18,
            isMintable: false,
            isBurnable: false,
            isPausable: false,
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

    async function onSubmit(values: FormValues) {
        if (!isConnected) {
            open();
            return;
        }

        if (chain?.id !== seismicDevnet.id) {
            if (switchNetwork) {
                switchNetwork(seismicDevnet.id);
            } else {
                toast.error("Please switch to the Seismic devnet to create tokens.");
            }
            return;
        }

        setIsCreating(true);

        try {
            if (!window.ethereum) {
                throw new Error("Ethereum provider not available. Please install MetaMask.");
            }

            // Request account access explicitly
            if (window.ethereum && typeof window.ethereum.request === "function") {
                if (window.ethereum && typeof window.ethereum.request === "function") {
                    await window.ethereum.request({ method: "eth_requestAccounts" });
                } else {
                    throw new Error("Ethereum provider not available. Please install MetaMask.");
                }
            } else {
                throw new Error("Ethereum provider not available. Please install MetaMask.");
            }
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const signerAddress = await signer.getAddress(); // Verify signer is working
            console.log("Connected signer address:", signerAddress);

            const tokenFactory = getTokenFactoryContract(provider);
            const fee = await tokenFactory.getFee();

            const tx = await tokenFactory.createToken(
                values.name,
                values.symbol,
                ethers.utils.parseUnits(values.initialSupply.toString(), values.decimals),
                values.decimals,
                values.isMintable,
                values.isBurnable,
                values.isPausable,
                { value: fee }
            );

            const receipt = await tx.wait();
            const event = receipt.events?.find((e: ethers.Event) => e.event === "TokenCreated");
            const tokenAddress = event?.args?.tokenAddress;

            if (!tokenAddress) {
                throw new Error("Failed to get token address from event");
            }

            setTokenAddress(tokenAddress);

            await fetch("/api/tokens", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...values,
                    ownerAddress: signerAddress,
                    contractAddress: tokenAddress,
                }),
            });

            setIsSuccess(true);
            toast.success("Token created successfully!");
        } catch (error) {
            console.error("Error creating token:", error);
            toast.error("Failed to create token. Please try again.");
        } finally {
            setIsCreating(false);
        }
    }

    useEffect(() => {
        const fetchFee = async () => {
            if (isConnected) {
                try {
                    if (!window.ethereum) {
                        throw new Error("Ethereum provider is not available. Please install MetaMask or another wallet.");
                    }
                    const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
                    const currentFee = await getTokenFactoryFee(provider)
                    setFee(currentFee)
                } catch (error) {
                    console.error("Error fetching fee:", error)
                }
            }
        }

        fetchFee()
    }, [isConnected])

    if (isSuccess) {
        return (
            <TokenCreationSuccess
                tokenAddress={tokenAddress}
                onReset={() => {
                    setIsSuccess(false)
                    form.reset()
                }}
            />
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-seismic-darkbrown mb-2">Create Your Token</h1>
                <p className="text-seismic-brown">Deploy your custom ERC20 token on the Seismic blockchain</p>
            </div>

            <Card className="seismic-card border-seismic-sand">
                <CardHeader className="px-6 pt-6 pb-0 border-b-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl text-seismic-darkbrown">Token Details</CardTitle>
                            <CardDescription className="text-seismic-brown">
                                Fill out the basic information for your token
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
                                <span>Please switch to the Seismic devnet to create tokens.</span>
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
                                            <FormLabel className="text-seismic-darkbrown">Token Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="My Token"
                                                    {...field}
                                                    className="border-seismic-sand bg-white/60 focus:border-seismic-brown focus:ring-seismic-brown"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-seismic-stone">The full name of your token</FormDescription>
                                            <FormMessage className="text-red-500" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="symbol"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-seismic-darkbrown">Token Symbol</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="MTK"
                                                    {...field}
                                                    className="border-seismic-sand bg-white/60 focus:border-seismic-brown focus:ring-seismic-brown"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-seismic-stone">
                                                A short ticker symbol (e.g., BTC, ETH)
                                            </FormDescription>
                                            <FormMessage className="text-red-500" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="initialSupply"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-seismic-darkbrown">Initial Supply</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="1000000"
                                                    {...field}
                                                    className="border-seismic-sand bg-white/60 focus:border-seismic-brown focus:ring-seismic-brown"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-seismic-stone">
                                                The initial amount of tokens to create
                                            </FormDescription>
                                            <FormMessage className="text-red-500" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="decimals"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-seismic-darkbrown">Decimals</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="18"
                                                    {...field}
                                                    className="border-seismic-sand bg-white/60 focus:border-seismic-brown focus:ring-seismic-brown"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-seismic-stone">Number of decimal places (0-18)</FormDescription>
                                            <FormMessage className="text-red-500" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Collapsible
                                open={isAdvancedOpen}
                                onOpenChange={setIsAdvancedOpen}
                                className="border border-seismic-sand rounded-lg overflow-hidden"
                            >
                                <CollapsibleTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="flex w-full justify-between p-4 text-seismic-darkbrown hover:bg-seismic-sand/50"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Info className="h-4 w-4 text-seismic-brown" />
                                            <span className="font-medium">Advanced Token Features</span>
                                        </div>
                                        <ChevronsUpDown className="h-4 w-4 text-seismic-brown" />
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="bg-white/60 p-4 space-y-4 border-t border-seismic-sand">
                                    <div className="text-sm text-seismic-brown mb-4">
                                        Configure additional functionality for your token. These features will be permanently set during
                                        creation.
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="isMintable"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-seismic-sand p-4 bg-white/40">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-seismic-darkbrown">Mintable</FormLabel>
                                                    <FormDescription className="text-seismic-stone">
                                                        Allow creating additional tokens after deployment
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        className="data-[state=checked]:bg-seismic-brown"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="isBurnable"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-seismic-sand p-4 bg-white/40">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-seismic-darkbrown">Burnable</FormLabel>
                                                    <FormDescription className="text-seismic-stone">
                                                        Allow tokens to be burned (destroyed)
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        className="data-[state=checked]:bg-seismic-brown"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="isPausable"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-seismic-sand p-4 bg-white/40">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-seismic-darkbrown">Pausable</FormLabel>
                                                    <FormDescription className="text-seismic-stone">
                                                        Allow pausing all token transfers
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        className="data-[state=checked]:bg-seismic-brown"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </CollapsibleContent>
                            </Collapsible>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white py-6 text-lg font-medium"
                                disabled={isCreating}
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Creating Token...
                                    </>
                                ) : (
                                    "Create Token"
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}

