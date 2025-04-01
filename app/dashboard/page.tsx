import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { TokenStats } from "@/components/TokenStats"
import { TokenCreationChart } from "@/components/TokenCreationChart"
import { TokenList } from "@/components/TokenList"
import { TokenDistributionChart } from "@/components/TokenDistributionChart"

export default function DashboardPage() {
    return (
        <div className="container mx-auto px-4 py-6 sm:py-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-seismic-darkbrown">Dashboard</h1>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <Suspense fallback={<Skeleton className="h-[180px] w-full" />}>
                    <TokenStats />
                </Suspense>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <Suspense fallback={<Skeleton className="h-[180px] w-full" />}>
                    <TokenCreationChart />
                </Suspense>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                    <TokenList />
                </Suspense>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
                    <TokenDistributionChart />
                </Suspense>
            </div>
        </div>
    )
}

