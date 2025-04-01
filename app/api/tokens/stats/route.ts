import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalTokens = await prisma.token.count();

    const lastWeekTokens = await prisma.token.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const mintableTokens = await prisma.token.count({
      where: { isMintable: true },
    });

    const burnableTokens = await prisma.token.count({
      where: { isBurnable: true },
    });

    const pausableTokens = await prisma.token.count({
      where: { isPausable: true },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tokensPerDay = await prisma.token.groupBy({
      by: ["createdAt"],
      _count: {
        _all: true,
      },
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      totalTokens,
      lastWeekTokens,
      mintableTokens,
      burnableTokens,
      pausableTokens,
      tokensPerDay,
    });
  } catch (error) {
    console.error("Error fetching token stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch token stats" },
      { status: 500 }
    );
  }
}
