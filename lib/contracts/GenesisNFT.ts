import { ethers } from "ethers";


export const GenesisNFTABI = [
  "function mint(uint256 numberOfTokens) external payable",
  "function totalSupply() external view returns (uint256)",
  "function price() external view returns (uint256)",
  "function maxSupply() external view returns (uint256)",
  "function maxMintPerTx() external view returns (uint256)",
  "function saleIsActive() external view returns (bool)",
  "function getCurrentTokenId() external view returns (uint256)",
  "function getMintedCountByWallet(address wallet) external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "event Minted(address indexed to, uint256 indexed tokenId)",
];


export const GENESIS_NFT_ADDRESS =
  process.env.NEXT_PUBLIC_GENESIS_NFT_ADDRESS || "0x123456789...";

export function getGenesisNFTContract(provider: ethers.providers.Web3Provider) {
  const signer = provider.getSigner();
  return new ethers.Contract(GENESIS_NFT_ADDRESS, GenesisNFTABI, signer);
}
