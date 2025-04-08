import { AddLiquidityForm } from "@/components/add-liquidity-form"

export default function AddLiquidityPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-seismic-darkbrown">Add Liquidity</h1>
            <p className="text-seismic-brown mb-8">Provide liquidity to earn fees from trades</p>

            <div className="max-w-xl mx-auto">
                <AddLiquidityForm />
            </div>
        </div>
    )
}
