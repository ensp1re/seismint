/* eslint-disable @typescript-eslint/no-explicit-any */
// Pinata service for IPFS uploads



export async function uploadToPinata(
  file: File,
  apiKey: string,
  apiSecret: string
) {
  try {
    // Create form data
    const formData = new FormData();
    formData.append("file", file);

    // Set options for Pinata
    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append("pinataOptions", options);

    // Set metadata for the file
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        type: "nft-collection-image",
      },
    });
    formData.append("pinataMetadata", metadata);

    // Upload to Pinata
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Failed to upload to Pinata: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      ipfsHash: data.IpfsHash,
      pinataUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
      gateway: `https://ipfs.io/ipfs/${data.IpfsHash}`,
    };
  } catch (error) {
    console.error("Error uploading to Pinata:", error);
    throw error;
  }
}

// Create a JSON metadata file and upload it to IPFS
export async function uploadMetadataToPinata(
  metadata: any,
  apiKey: string,
  apiSecret: string
) {
  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      },
      body: JSON.stringify(metadata),
    });

    if (!res.ok) {
      throw new Error(`Failed to upload metadata to Pinata: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      ipfsHash: data.IpfsHash,
      pinataUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
      gateway: `https://ipfs.io/ipfs/${data.IpfsHash}`,
    };
  } catch (error) {
    console.error("Error uploading metadata to Pinata:", error);
    throw error;
  }
}
