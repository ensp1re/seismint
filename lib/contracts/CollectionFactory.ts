import { ethers } from "ethers";

// ABI for the CollectionFactory contract
export const CollectionFactoryABI = [
  "function createCollection(string memory _name, string memory _symbol, string memory _metadataBaseURI, uint256 _mintPrice) external payable returns (address)",
  "function getCollectionCount() external view returns (uint256)",
  "function getCreatorCollections(address _creator) external view returns (uint256[] memory)",
  "function collections(uint256) external view returns (address collectionAddress, address creator, string name, string symbol, uint256 mintPrice, uint256 createdAt)",
  "function creationFee() external view returns (uint256)",
  "event CollectionCreated(uint256 indexed collectionId, address indexed collectionAddress, address indexed creator, string name, string symbol, uint256 mintPrice, uint256 createdAt)",
];

// ABI for the UserCollection contract
export const UserCollectionABI = [
  "function mint() external payable returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function mintPrice() external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function name() external view returns (string memory)",
  "function symbol() external view returns (string memory)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "event TokenMinted(uint256 indexed tokenId, address indexed minter, uint256 timestamp)",
];

// This would be the address where your CollectionFactory is deployed
export const COLLECTION_FACTORY_ADDRESS =
  process.env.NEXT_PUBLIC_COLLECTION_FACTORY_ADDRESS || "0x123456789..."; // Replace with actual address

export function getCollectionFactoryContract(
  provider: ethers.providers.Web3Provider
) {
  const signer = provider.getSigner();
  return new ethers.Contract(
    COLLECTION_FACTORY_ADDRESS,
    CollectionFactoryABI,
    signer
  );
}

export function getUserCollectionContract(
  address: string,
  provider: ethers.providers.Web3Provider
) {
  const signer = provider.getSigner();
  return new ethers.Contract(address, UserCollectionABI, signer);
}

export async function getCollectionCreationFee(
  provider: ethers.providers.Web3Provider
): Promise<string> {
  const contract = getCollectionFactoryContract(provider);
  const fee = await contract.creationFee();
  return ethers.utils.formatEther(fee);
}
