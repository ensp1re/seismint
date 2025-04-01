import { GenesisNFTMinter } from "@/components/GenesisNftMinter";
import { ReactElement } from "react";

export default function GenesisPage(): ReactElement {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-seismic-darkbrown">Genesis NFT Collection</h1>
            <p className="text-seismic-brown mb-8">Mint exclusive Genesis NFTs from the Seismic blockchain</p>

            <GenesisNFTMinter />
        </div>
    )
}

