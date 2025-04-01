"use client"

import type React from "react"

import { useState, useRef, type DragEvent } from "react"
import { X, FileImage, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface FileUploadProps {
    onFileSelect: (file: File) => void
    isUploading: boolean
    previewUrl: string | null
    onClear: () => void
}

export function FileUpload({ onFileSelect, isUploading, previewUrl, onClear }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0]
            if (file.type.startsWith("image/")) {
                onFileSelect(file)
            }
        }
    }

    const handleFileSelect = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0])
        }
    }

    return (
        <div className="w-full">
            {previewUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-seismic-sand w-48 h-48">
                    <Image src={previewUrl || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover"
                        width={192} height={192} />

                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full"
                        onClick={onClear}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div
                    className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center h-48 transition-colors ${isDragging
                        ? "border-seismic-brown bg-seismic-sand/20"
                        : "border-seismic-sand bg-white/60 hover:border-seismic-brown/50"
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleFileSelect}
                >
                    {isUploading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="h-10 w-10 text-seismic-brown animate-spin mb-2" />
                            <p className="text-seismic-brown font-medium">Uploading to IPFS...</p>
                        </div>
                    ) : (
                        <>
                            <FileImage className="h-10 w-10 text-seismic-brown mb-2" />
                            <p className="text-seismic-brown font-medium mb-1">Drag and drop your collection image</p>
                            <p className="text-seismic-stone text-sm">or click to browse files</p>
                        </>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>
            )}
        </div>
    )
}

