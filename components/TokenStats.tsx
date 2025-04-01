"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Coins, TrendingUp, Flame } from "lucide-react"

interface StatsData {
    totalTokens: number
    lastWeekTokens: number
    mintableTokens: number
    burnableTokens: number
    pausableTokens: number
}

export function TokenStats() {
    const [stats, setStats] = useState<StatsData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchStats() {
            try {
                const response = await fetch("/api/tokens/stats")
                const data = await response.json()
                setStats(data)
            } catch (error) {
                console.error("Error fetching token stats:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    if (loading) {
        return (
            <Card className="seismic-card">
                <CardHeader>
                    <CardTitle className="text-seismic-darkbrown">Token Statistics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </CardContent>
            </Card>
        )
    }

    const statItems = [
        {
            title: "Total Tokens",
            value: stats?.totalTokens || 0,
            icon: Coins,
            color: "bg-seismic-brown/10 text-seismic-brown",
        },
        {
            title: "Created Last Week",
            value: stats?.lastWeekTokens || 0,
            icon: TrendingUp,
            color: "bg-green-500/10 text-green-600",
        },
        {
            title: "Mintable Tokens",
            value: stats?.mintableTokens || 0,
            icon: Coins,
            color: "bg-blue-500/10 text-blue-600",
        },
        {
            title: "Burnable Tokens",
            value: stats?.burnableTokens || 0,
            icon: Flame,
            color: "bg-amber-500/10 text-amber-600",
        },
    ]

    return (
        <Card className="seismic-card">
            <CardHeader>
                <CardTitle className="text-seismic-darkbrown">Token Statistics</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {statItems.map((item, index) => (
                    <div key={index} className="bg-white/60 rounded-lg border border-seismic-sand p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${item.color}`}>
                                <item.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-seismic-stone">{item.title}</p>
                                <p className="text-xl sm:text-2xl font-bold text-seismic-darkbrown">{item.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

