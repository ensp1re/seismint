import { ethers } from "ethers";

// ABI for the SimpleDex contract
export const SimpleDexABI = [
  "function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external",
  "function removeLiquidity(address tokenA, address tokenB, uint256 liquidityAmount) external",
  "function swapTokens(address tokenIn, address tokenOut, uint256 amountIn) external",
  "function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256)",
  "function getPrice(address tokenA, address tokenB) external view returns (uint256)",
  "function liquidityPools(address tokenA, address tokenB) external view returns (uint256 tokenAReserve, uint256 tokenBReserve)",
  "function liquidity(address tokenA, address tokenB) external view returns (uint256)",
  "function userLiquidity(address tokenA, address tokenB, address user) external view returns (uint256)",
  "function getUserLiquidity(address tokenA, address tokenB, address user) external view returns (uint256)",
  "function getTradeHistory(address trader, address tokenIn, address tokenOut, uint256 fromTimestamp, uint256 toTimestamp, uint256 limit, uint256 offset) external view returns (tuple(address trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)[] memory)",
  "function getTradeHistoryCount(address trader) external view returns (uint256)",
  "event LiquidityAdded(address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB, uint256 timestamp)",
  "event LiquidityRemoved(address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB, uint256 timestamp)",
  "event TradeExecuted(address indexed trader, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)",
];

// ABI for the USDStablecoin contract (USDT and USDC)
export const USDStablecoinABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function requestTokens() external",
  "function timeUntilNextFaucet(address user) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
];

// Contract addresses
export const SIMPLE_DEX_ADDRESS = "0x2A643B85151C3Ad51F76aa09dBC477a6Db85277F";
export const USDT_ADDRESS = "0x0B60c43f7430c4467D17dAcd0016d8537355AE18";
export const USDC_ADDRESS = "0x64174552B1E07762fe2bBbdFBe558177688667B1";

// Token info
export const TOKENS = {
  USDT: {
    address: USDT_ADDRESS,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    logo: "/usdt.png",
  },
  USDC: {
    address: USDC_ADDRESS,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logo: "/usdc.png",
  },
};

export function getSimpleDexContract(provider: ethers.providers.Web3Provider) {
  const signer = provider.getSigner();
  return new ethers.Contract(SIMPLE_DEX_ADDRESS, SimpleDexABI, signer);
}

export function getTokenContract(
  tokenAddress: string,
  provider: ethers.providers.Web3Provider
) {
  const signer = provider.getSigner();
  return new ethers.Contract(tokenAddress, USDStablecoinABI, signer);
}

export function formatTokenAmount(
  amount: ethers.BigNumber,
  decimals: number
): string {
  return ethers.utils.formatUnits(amount, decimals);
}

export function parseTokenAmount(
  amount: string,
  decimals: number
): ethers.BigNumber {
  return ethers.utils.parseUnits(amount, decimals);
}

// Helper function to get user's liquidity in a pool
export async function getUserLiquidity(
  tokenA: string,
  tokenB: string,
  userAddress: string,
  provider: ethers.providers.Web3Provider
): Promise<string> {
  const dexContract = getSimpleDexContract(provider);
  const liquidity = await dexContract.getUserLiquidity(
    tokenA,
    tokenB,
    userAddress
  );
  return formatTokenAmount(liquidity, 18); // LP tokens have 18 decimals
}

// Add a new helper function to get the correct reserves for a token pair
export async function getPoolReserves(
  tokenA: string,
  tokenB: string,
  provider: ethers.providers.Web3Provider
): Promise<{
  reserveA: ethers.BigNumber;
  reserveB: ethers.BigNumber;
  tokenAFirst: boolean;
}> {
  const dexContract = getSimpleDexContract(provider);

  // The contract stores pools with tokenA < tokenB
  // We need to determine the correct order to query
  const tokenAFirst = tokenA.toLowerCase() < tokenB.toLowerCase();

  // Get the pool with the correct token order
  const firstToken = tokenAFirst ? tokenA : tokenB;
  const secondToken = tokenAFirst ? tokenB : tokenA;

  const pool = await dexContract.liquidityPools(firstToken, secondToken);

  // Return reserves in the order requested (tokenA, tokenB)
  if (tokenAFirst) {
    return {
      reserveA: pool.tokenAReserve,
      reserveB: pool.tokenBReserve,
      tokenAFirst: true,
    };
  } else {
    return {
      reserveA: pool.tokenBReserve,
      reserveB: pool.tokenAReserve,
      tokenAFirst: false,
    };
  }
}

// Update the getRemovableLiquidity function to use the new helper
export async function getRemovableLiquidity(
  tokenA: string,
  tokenB: string,
  userAddress: string,
  percentage: number,
  provider: ethers.providers.Web3Provider
): Promise<{
  liquidityAmount: ethers.BigNumber;
  tokenAAmount: ethers.BigNumber;
  tokenBAmount: ethers.BigNumber;
}> {
  const dexContract = getSimpleDexContract(provider);

  // Get user's liquidity
  const userLiquidity = await dexContract.getUserLiquidity(
    tokenA,
    tokenB,
    userAddress
  );

  // Calculate liquidity to remove (use 99% max to avoid rounding errors)
  const safePercentage = Math.min(percentage, 99);
  const liquidityToRemove = userLiquidity.mul(safePercentage).div(100);

  // Get pool reserves using the new helper function
  const { reserveA, reserveB } = await getPoolReserves(
    tokenA,
    tokenB,
    provider
  );

  // Get total liquidity (this is an approximation)
  const totalLiquidity = await dexContract.liquidity(tokenA, tokenB);

  // Calculate token amounts
  let tokenAAmount = ethers.BigNumber.from(0);
  let tokenBAmount = ethers.BigNumber.from(0);

  if (totalLiquidity.gt(0) && liquidityToRemove.gt(0)) {
    // Calculate proportion
    const proportion = liquidityToRemove
      .mul(ethers.utils.parseUnits("1", 18))
      .div(totalLiquidity);

    // Calculate token amounts
    tokenAAmount = reserveA
      .mul(proportion)
      .div(ethers.utils.parseUnits("1", 18));
    tokenBAmount = reserveB
      .mul(proportion)
      .div(ethers.utils.parseUnits("1", 18));
  }

  return {
    liquidityAmount: liquidityToRemove,
    tokenAAmount,
    tokenBAmount,
  };
}
