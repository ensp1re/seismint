import React from "react"
import { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "next-themes"
import { WalletProvider } from "@/components/WalletProvider"
import { Sidebar } from "@/components/Sidebar"
import { Toaster } from "react-hot-toast"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Seismint | Create Tokens & NFTs",
  description: "Create and manage tokens and NFTs on the blockchain",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html suppressContentEditableWarning lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-seismic-beige`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>          <WalletProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              className: "bg-gray-800 text-white",
              style: {
                padding: "16px",
                borderRadius: "8px",
                fontSize: "14px",
              },
            }}
          />
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 overflow-auto">{children}</div>
          </div>
        </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

