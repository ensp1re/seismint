import { SwapForm } from "@/components/swap-form"

export default function SwapPage() {
    return (
        <div className="min-h-screen  flex items-center justify-center">
            <div className="bg-white shadow-lg rounded-lg p-6 max-w-xl w-full">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-seismic-darkbrown">Swap Tokens</h1>
                <p className="text-seismic-brown mb-8">Exchange tokens instantly with low fees</p>
                <SwapForm />
            </div>
        </div>
    )
}
