import { ReactElement } from "react";

export default function NFTsPage(): ReactElement {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-8">NFT Creation</h1>
            <div className="p-8 border border-dashed rounded-lg text-center">
                <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
                <p className="text-muted-foreground">
                    Our NFT creation platform is currently under development. Check back soon for updates!
                </p>
            </div>
        </div>
    )
}

