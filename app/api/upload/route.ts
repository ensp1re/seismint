import { type NextRequest, NextResponse } from "next/server";
import { uploadToPinata, uploadMetadataToPinata } from "@/lib/pinata";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Get API keys from environment variables
    const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || "";
    const PINATA_API_SECRET = process.env.NEXT_PUBLIC_PINATA_API_SECRET || "";

    if (!PINATA_API_KEY || !PINATA_API_SECRET) {
      return NextResponse.json(
        { error: "Pinata API keys not configured" },
        { status: 500 }
      );
    }

    // Upload file to IPFS via Pinata
    const result = await uploadToPinata(
      file,
      PINATA_API_KEY,
      PINATA_API_SECRET
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in upload API route:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { metadata } = body;

    if (!metadata) {
      return NextResponse.json(
        { error: "No metadata provided" },
        { status: 400 }
      );
    }

    // Get API keys from environment variables
    const apiKey = process.env.PINATA_API_KEY;
    const apiSecret = process.env.PINATA_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Pinata API keys not configured" },
        { status: 500 }
      );
    }

    // Upload metadata to IPFS via Pinata
    const result = await uploadMetadataToPinata(metadata, apiKey, apiSecret);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in metadata upload API route:", error);
    return NextResponse.json(
      { error: "Failed to upload metadata" },
      { status: 500 }
    );
  }
}
