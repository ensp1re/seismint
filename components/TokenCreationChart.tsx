"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts"

interface ChartData {
    date: string
    count: number
}

export function TokenCreationChart() {
    const [data, setData] = useState<ChartData[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch("/api/tokens/stats")
                const result = await response.json()

                console.log("TokenCreationChart API response:", result.tokensPerDay)

                // Format data for the chart
                const today = new Date()
                const last7Days = Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date()
                    date.setDate(today.getDate() - (6 - i))
                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                })

                const formattedData = result.tokensPerDay?.reduce((acc: Record<string, number>, item: { createdAt: string; _count: { _all: number } }) => {
                    const date = new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    acc[date] = (acc[date] || 0) + item._count._all
                    return acc
                }, {}) || {}

                const finalData = last7Days.map(date => ({
                    date,
                    count: formattedData[date] || 0,
                }))

                setData(finalData)
            } catch (error) {
                console.error("Error fetching chart data:", error)

                // Set sample data on error
                const today = new Date()
                const sampleData = Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date()
                    date.setDate(today.getDate() - (6 - i))
                    return {
                        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                        count: Math.floor(Math.random() * 5),
                    }
                })
                setData(sampleData)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <Card className="seismic-card">
                <CardHeader>
                    <CardTitle className="text-seismic-darkbrown">Token Creation Activity</CardTitle>
                </CardHeader>
                <CardContent className="h-[180px] sm:h-[200px]">
                    <Skeleton className="h-full w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="seismic-card">
            <CardHeader>
                <CardTitle className="text-seismic-darkbrown">Token Creation Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[180px] sm:h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6d7c3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={{ stroke: "#e6d7c3" }}
                                tickMargin={8}
                                tick={{ fontSize: 12, fill: "#8c7a6b" }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={{ stroke: "#e6d7c3" }}
                                tickMargin={8}
                                allowDecimals={false}
                                tick={{ fontSize: 12, fill: "#8c7a6b" }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#f5f0e8",
                                    border: "1px solid #e6d7c3",
                                    borderRadius: "0.375rem",
                                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                                }}
                                itemStyle={{ color: "#5d4e41" }}
                                labelStyle={{ color: "#8c7a6b", fontWeight: "bold", marginBottom: "4px" }}
                            />
                            <Bar dataKey="count" name="Tokens Created" fill="#8c7a6b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
