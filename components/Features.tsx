import { Coins, Shield, Zap, BarChart4 } from "lucide-react"

export function Features() {
    const features = [
        {
            icon: Coins,
            title: "Custom Tokens",
            description: "Create ERC20 tokens with customizable parameters like supply, decimals, and features.",
        },
        {
            icon: Shield,
            title: "Secure & Reliable",
            description: "Built on battle-tested smart contracts with security best practices.",
        },
        {
            icon: Zap,
            title: "Fast Deployment",
            description: "Deploy your token to the blockchain in seconds, not hours.",
        },
        {
            icon: BarChart4,
            title: "Analytics Dashboard",
            description: "Track your tokens and view detailed analytics about usage and distribution.",
        },
    ]

    return (
        <div className="bg-white py-16">
            <div className="container mx-auto px-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12 text-seismic-darkbrown">
                    Why Choose Seismint?
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="seismic-card p-6">
                            <div className="h-12 w-12 bg-seismic-brown/10 rounded-lg flex items-center justify-center mb-4">
                                <feature.icon className="h-6 w-6 text-seismic-brown" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-seismic-darkbrown">{feature.title}</h3>
                            <p className="text-seismic-stone">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

