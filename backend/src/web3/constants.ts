export const USDT_ADDRESSES = {
  ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  arbitrum: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  optimism: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
  base:     "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
  polygon:  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  sepolia:  "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
} as const;

export type SupportedChain = keyof typeof USDT_ADDRESSES;

export const SUPPORTED_CHAINS: SupportedChain[] = [
  "ethereum",
  "arbitrum",
  "optimism",
  "base",
  "polygon",
  "sepolia",
];

export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const USDT_DECIMALS = 6;
