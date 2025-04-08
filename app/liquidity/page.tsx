import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PoolsList } from "@/components/pools-list"
import { Plus } from "lucide-react"

export default function LiquidityPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 text-seismic-darkbrown">Liquidity Pools</h1>
                    <p className="text-seismic-brown">Provide liquidity to earn fees from trades</p>
                </div>
                <Button
                    asChild
                    className="bg-gradient-to-r from-seismic-brown to-seismic-darkbrown hover:opacity-90 text-white"
                >
                    <Link href="/liquidity/add">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Liquidity
                    </Link>
                </Button>
            </div>

            <PoolsList />
        </div>
    )
}
