import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ReactElement } from "react"

export function Hero(): ReactElement {
    return (
        <div className="relative overflow-hidden bg-seismic-beige">
            <div className="absolute inset-0 bg-cover bg-center opacity-10 bg-gradient-to-r from-seismic-sand to-seismic-stone"></div>
            <div className="container mx-auto px-4 py-16 sm:py-24 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-seismic-darkbrown">
                            <span className="block">Seismint is</span>
                            <span className="block text-seismic-brown">the token creation</span>
                            <span className="block">platform.</span>
                        </h1>
                        <p className="mt-4 md:mt-6 text-lg md:text-xl text-seismic-stone max-w-2xl">
                            Create custom ERC20 tokens and NFTs with just a few clicks. No coding required.
                        </p>
                        <p className="mt-4 md:mt-6 text-lg md:text-xl text-seismic-stone max-w-2xl">
                            Swap tokens seamlessly and add liquidity to decentralized exchanges effortlessly.
                        </p>
                        <div className="mt-6 md:mt-10 flex flex-col sm:flex-row gap-4">
                            <Button
                                asChild
                                size="lg"
                                className="text-lg bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white"
                            >
                                <Link href="/tokens">Create Token</Link>
                            </Button>
                            <Button
                                asChild
                                size="lg"
                                variant="outline"
                                className="text-lg border-seismic-sand bg-white/50 hover:bg-white/80 hover:text-seismic-darkbrown text-seismic-darkbrown"
                            >
                                <Link href="/dashboard">Dashboard</Link>
                            </Button>
                        </div>
                    </div>
                    <div className="relative h-[250px] sm:h-[300px] md:h-[350px] lg:h-[450px] mt-8 lg:mt-0">
                        {/* icon */}
                        <Image
                            src="/hero.png"
                            alt="Seismic Blockchain"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

