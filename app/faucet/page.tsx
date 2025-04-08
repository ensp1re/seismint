import { TokenFaucet } from "@/components/token-faucet"

export default function FaucetPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-seismic-darkbrown">Token Faucet</h1>
            <p className="text-seismic-brown mb-8">Get test tokens to use in the DEX</p>

            <div className="max-w-2xl mx-auto">
                <TokenFaucet />
            </div>
        </div>
    )
}
