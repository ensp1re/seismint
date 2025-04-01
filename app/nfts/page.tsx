import { NFTCollections } from "@/components/NftCollections";
import { NFTCreator } from "@/components/NftCreator";

export default function NFTsPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-seismic-darkbrown">Create Your NFT Collection</h1>
            <p className="text-seismic-brown mb-8">Deploy your own NFT collection on the Seismic blockchain</p>

            <div className="grid grid-cols-1 gap-8">
                <NFTCreator />
                <NFTCollections />
            </div>
        </div>
    )
}

