import { ethers } from "ethers";

// ABI for the TokenFactory contract
export const TokenFactoryABI = [
  "function createToken(string memory name, string memory symbol, uint256 initialSupply, uint8 decimals, bool isMintable, bool isBurnable, bool isPausable) external payable returns (address)",
  "function getTokensByCreator(address creator) external view returns (address[] memory)",
  "function getAllTokens() external view returns (address[] memory)",
  "function getFee() external view returns (uint256)",
  "event TokenCreated(address indexed tokenAddress, string name, string symbol, uint256 initialSupply, address indexed owner)",
];

export const TOKEN_FACTORY_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS || "0x123456789..."; 

export function getTokenFactoryContract(
  provider: ethers.providers.Web3Provider
) {
  const signer = provider.getSigner();
  return new ethers.Contract(TOKEN_FACTORY_ADDRESS, TokenFactoryABI, signer);
}

export async function getTokenFactoryFee(
  provider: ethers.providers.Web3Provider
): Promise<string> {
  const contract = getTokenFactoryContract(provider);
  const fee = await contract.getFee();
  return ethers.utils.formatEther(fee);
}
