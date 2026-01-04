import 'server-only';

/**
 * ERC20標準ABI（必要なメソッドのみ）
 */
export const erc20Abi = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * JPYCコントラクトアドレス（環境変数から取得）
 * 注: Fuji Testnetに実際のJPYCがデプロイされていない場合、
 * テスト用のERC20トークンアドレスを使用してください
 */
export const JPYC_CONTRACT_ADDRESS =
  (process.env.JPYC_CONTRACT_ADDRESS as `0x${string}`) ||
  ('0x0000000000000000000000000000000000000000' as `0x${string}`);

/**
 * JPYC decimals（通常は18）
 */
export const JPYC_DECIMALS = 18;


