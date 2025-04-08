import { RemoveLiquidityForm } from "@/components/remove-liquidity-form"

export default function RemoveLiquidityPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-seismic-darkbrown">Remove Liquidity</h1>
            <p className="text-seismic-brown mb-8">Withdraw your tokens from the liquidity pool</p>

            <div className="max-w-xl mx-auto">
                <RemoveLiquidityForm />
            </div>
        </div>
    )
}
