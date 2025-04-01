import type { Chain } from "wagmi";

export const seismicDevnet: Chain = {
  id: 5124,
  name: "Seismic devnet",
  network: "seismic-devnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
  },
  rpcUrls: {
    public: { http: ["https://node-2.seismicdev.net/rpc"] },
    default: { http: ["https://node-2.seismicdev.net/rpc"] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer-2.seismicdev.net/" },
  },
};
