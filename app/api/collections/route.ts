import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      symbol,
      baseURI,
      mintPrice,
      ownerAddress,
      collectionAddress,
      collectionId,
    } = body;

    // Check if this collection already exists in the database
    const existingCollection = await prisma.collection.findFirst({
      where: {
        collectionAddress: {
          equals: collectionAddress,
          mode: "insensitive",
        },
      },
    });

    if (existingCollection) {
      return NextResponse.json(
        {
          collection: existingCollection,
          message: "Collection already exists in database",
        },
        { status: 200 }
      );
    }

    // Create new collection record
    const collection = await prisma.collection.create({
      data: {
        name,
        symbol,
        baseURI,
        mintPrice,
        ownerAddress,
        collectionAddress,
        collectionId: collectionId.toString(),
      },
    });

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}
