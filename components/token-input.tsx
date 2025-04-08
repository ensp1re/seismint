"use client"

import type React from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface TokenInputProps {
    value: string
    onChange: (value: string) => void
    onMax?: () => void
    disabled?: boolean
    placeholder?: string
}

export function TokenInput({ value, onChange, onMax, disabled = false, placeholder = "0.0" }: TokenInputProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        // Only allow numbers and decimals
        if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
            onChange(value)
        }
    }

    return (
        <div className="relative flex-1">
            <Input
                type="text"
                value={value}
                onChange={handleChange}
                className="border-seismic-sand bg-white/60 focus:border-seismic-brown focus:ring-seismic-brown h-12 pr-16 text-right text-lg font-medium"
                placeholder={placeholder}
                disabled={disabled}
            />
            {onMax && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-seismic-brown hover:text-seismic-darkbrown hover:bg-transparent"
                    onClick={onMax}
                    disabled={disabled}
                >
                    MAX
                </Button>
            )}
        </div>
    )
}
