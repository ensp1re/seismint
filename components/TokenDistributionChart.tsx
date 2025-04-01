"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

interface ChartData {
    name: string
    value: number
    color: string
}

export function TokenDistributionChart() {
    const [data, setData] = useState<ChartData[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch("/api/tokens/stats")
                const result = await response.json()

                if (result) {
                    // Create data for the chart based on token features
                    const chartData = [
                        {
                            name: "Mintable",
                            value: result.mintableTokens || 0,
                            color: "#8c7a6b",
                        },
                        {
                            name: "Burnable",
                            value: result.burnableTokens || 0,
                            color: "#a39990",
                        },
                        {
                            name: "Pausable",
                            value: result.pausableTokens || 0,
                            color: "#c4b5a2",
                        },
                        {
                            name: "Standard",
                            value:
                                (result.totalTokens || 0) -
                                (result.mintableTokens || 0) -
                                (result.burnableTokens || 0) -
                                (result.pausableTokens || 0),
                            color: "#e6d7c3",
                        },
                    ]

                    // Filter out zero values
                    setData(chartData.filter((item) => item.value > 0))
                } else {
                    // Sample data if no real data is available
                    setData([
                        { name: "Mintable", value: 40, color: "#8c7a6b" },
                        { name: "Burnable", value: 30, color: "#a39990" },
                        { name: "Pausable", value: 20, color: "#c4b5a2" },
                        { name: "Standard", value: 10, color: "#e6d7c3" },
                    ])
                }
            } catch (error) {
                console.error("Error fetching chart data:", error)
                // Set sample data on error
                setData([
                    { name: "Mintable", value: 40, color: "#8c7a6b" },
                    { name: "Burnable", value: 30, color: "#a39990" },
                    { name: "Pausable", value: 20, color: "#c4b5a2" },
                    { name: "Standard", value: 10, color: "#e6d7c3" },
                ])
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
                    <CardTitle className="text-seismic-darkbrown">Token Types Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                    <Skeleton className="h-full w-full" />
                </CardContent>
            </Card>
        )
    }

    // If no data or all values are 0, show a message
    if (data.length === 0) {
        return (
            <Card className="seismic-card">
                <CardHeader>
                    <CardTitle className="text-seismic-darkbrown">Token Types Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center">
                    <p className="text-seismic-brown text-center">No token data available yet</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="seismic-card">
            <CardHeader>
                <CardTitle className="text-seismic-darkbrown">Token Types Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={70}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#f5f0e8",
                                    border: "1px solid #e6d7c3",
                                    borderRadius: "0.375rem",
                                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                                }}
                                itemStyle={{ color: "#5d4e41" }}
                                formatter={(value) => [`${value} tokens`, ""]}
                                labelStyle={{ color: "#8c7a6b", fontWeight: "bold", marginBottom: "4px" }}
                            />
                            <Legend
                                layout="horizontal"
                                verticalAlign="bottom"
                                align="center"
                                formatter={(value) => <span style={{ color: "#5d4e41" }}>{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

