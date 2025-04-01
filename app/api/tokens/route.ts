import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, symbol, initialSupply, decimals, isMintable, isBurnable, isPausable, ownerAddress, contractAddress } =
      body

    const existingToken = await prisma.token.findFirst({
      where: {
        contractAddress: {
          equals: contractAddress,
          mode: "insensitive",
        },
      },
    })

    if (existingToken) {
      return NextResponse.json({ token: existingToken, message: "Token already exists in database" }, { status: 200 })
    }

    const token = await prisma.token.create({
      data: {
        name,
        symbol,
        initialSupply: initialSupply.toString(),
        decimals,
        isMintable,
        isBurnable,
        isPausable,
        ownerAddress,
        contractAddress,
      },
    })

    return NextResponse.json({ token }, { status: 201 })
  } catch (error) {
    console.error("Error creating token:", error)
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const tokens = await prisma.token.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ tokens })
  } catch (error) {
    console.error("Error fetching tokens:", error)
    return NextResponse.json({ error: "Failed to fetch tokens" }, { status: 500 })
  }
}

