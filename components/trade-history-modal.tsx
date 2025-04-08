"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getSimpleDexContract, TOKENS, formatTokenAmount } from "@/lib/contracts/SimpleDex";
import { Clock, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

interface TradeHistoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface Trade {
    trader: string;
    tokenIn: { address: string; symbol: string };
    tokenOut: { address: string; symbol: string };
    amountIn: string;
    amountOut: string;
    timestamp: number;
}

export function TradeHistoryModal({ open, onOpenChange }: TradeHistoryModalProps) {
    const { address, isConnected } = useAccount();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!open || !isConnected || !window.ethereum || !address) {
            setTrades([]);
            setIsLoading(false);
            return;
        }

        const fetchTradeHistory = async () => {
            setIsLoading(true);
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider);
                const dexContract = getSimpleDexContract(provider);
                const userAddress = address;

                // Get trade history count
                const count = await dexContract.getTradeHistoryCount(userAddress);
                if (count.toNumber() === 0) {
                    setTrades([]);
                    return;
                }

                // Get trade history (last 10 trades)
                let history = [];
                try {
                    history = await dexContract.getTradeHistory(
                        userAddress,
                        ethers.constants.AddressZero, // tokenIn
                        ethers.constants.AddressZero, // tokenOut
                        0, // fromTimestamp
                        Math.floor(Date.now() / 1000), // toTimestamp
                        10, // limit
                        0 // offset
                    );
                } catch (error: any) {
                    console.error("Error fetching trade history from contract:", {
                        error,
                        message: error.message,
                        data: error.data,
                        code: error.code,
                    });
                    toast.error("Failed to fetch trade history. Please try again.");
                    setTrades([]);
                    return;
                }

                // Format trade history
                const formattedTrades = history.map((trade: any) => {
                    const tokenInSymbol =
                        Object.entries(TOKENS).find(
                            ([_, token]) => token.address.toLowerCase() === trade.tokenIn.toLowerCase()
                        )?.[0] || "Unknown";
                    const tokenOutSymbol =
                        Object.entries(TOKENS).find(
                            ([_, token]) => token.address.toLowerCase() === trade.tokenOut.toLowerCase()
                        )?.[0] || "Unknown";

                    const tokenInDecimals = TOKENS[tokenInSymbol as keyof typeof TOKENS]?.decimals || 18;
                    const tokenOutDecimals = TOKENS[tokenOutSymbol as keyof typeof TOKENS]?.decimals || 18;

                    return {
                        trader: trade.trader,
                        tokenIn: { address: trade.tokenIn, symbol: tokenInSymbol },
                        tokenOut: { address: trade.tokenOut, symbol: tokenOutSymbol },
                        amountIn: formatTokenAmount(trade.amountIn, tokenInDecimals),
                        amountOut: formatTokenAmount(trade.amountOut, tokenOutDecimals),
                        timestamp: trade.timestamp.toNumber(),
                    };
                });

                setTrades(formattedTrades);
            } catch (error: any) {
                console.error("Error fetching trade history:", {
                    error,
                    message: error.message,
                    data: error.data,
                    code: error.code,
                });
                toast.error("An error occurred while fetching trade history.");
                setTrades([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTradeHistory();
    }, [open, isConnected, address]);

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-seismic-darkbrown">Your Trade History</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : trades.length === 0 ? (
                        <div className="text-center py-6">
                            <Clock className="h-12 w-12 text-seismic-sand mx-auto mb-3" />
                            <p className="text-seismic-brown">No trade history found</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
                            {trades.map((trade, index) => (
                                <div key={index} className="bg-white/60 rounded-lg border border-seismic-sand p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-seismic-darkbrown">
                                                {trade.tokenIn.symbol} → {trade.tokenOut.symbol}
                                            </span>
                                        </div>
                                        <span className="text-xs text-seismic-stone">{formatDate(trade.timestamp)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-seismic-brown">
                                            {Number.parseFloat(trade.amountIn).toFixed(6)} {trade.tokenIn.symbol}
                                        </span>
                                        <ArrowRight className="h-3 w-3 text-seismic-stone" />
                                        <span className="text-sm text-seismic-brown">
                                            {Number.parseFloat(trade.amountOut).toFixed(6)} {trade.tokenOut.symbol}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}