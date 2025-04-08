"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { TOKENS } from "@/lib/contracts/SimpleDex"

interface TokenSelectorProps {
    selectedToken: string
    onSelectToken: (token: string) => void
    excludeToken?: string
}

export function TokenSelector({ selectedToken, onSelectToken, excludeToken }: TokenSelectorProps) {
    const [open, setOpen] = useState(false)
    const token = TOKENS[selectedToken as keyof typeof TOKENS]

    const handleSelectToken = (symbol: string) => {
        onSelectToken(symbol)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="border-seismic-sand bg-white/60 hover:bg-white text-seismic-darkbrown font-medium px-3 h-12 min-w-[120px]"
                >
                    <div className="flex items-center gap-2">
                        <Image
                            src={token.logo || "/placeholder.svg"}
                            alt={token.symbol}
                            width={24}
                            height={24}
                            className="rounded-full"
                        />
                        <span>{token.symbol}</span>
                        <ChevronDown className="h-4 w-4 text-seismic-stone ml-1" />
                    </div>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Select a token</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2 py-4">
                    {Object.entries(TOKENS).map(([symbol, token]) => (
                        <Button
                            key={symbol}
                            variant="outline"
                            className={`justify-start border-seismic-sand hover:bg-seismic-sand/20 ${symbol === excludeToken ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                            onClick={() => handleSelectToken(symbol)}
                            disabled={symbol === excludeToken}
                        >
                            <div className="flex items-center gap-3">
                                <Image
                                    src={token.logo || "/placeholder.svg"}
                                    alt={token.symbol}
                                    width={32}
                                    height={32}
                                    className="rounded-full"
                                />
                                <div className="text-left">
                                    <div className="font-medium text-seismic-darkbrown">{token.symbol}</div>
                                    <div className="text-xs text-seismic-stone">{token.name}</div>
                                </div>
                            </div>
                        </Button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
