import 'server-only';

/**
 * EIP-7702 Authorization の保存・管理
 * 
 * 本来はRedisを使用すべきだが、デモ用にメモリ内ストア
 */

interface Authorization {
  chainId: number;
  address: string; // TrafficAgentContract
  nonce: bigint;
  // 署名情報は省略（実装時に追加）
}

// メモリ内ストア（デモ用）
const authorizationStore = new Map<string, Authorization>();

/**
 * User の Authorization を保存
 * 
 * @param userEOA User EOAアドレス
 * @param authorization EIP-7702 Authorization
 */
export function saveAuthorization(userEOA: string, authorization: Authorization): void {
  const key = `auth:${userEOA}`;
  authorizationStore.set(key, authorization);
  console.log(`[Authorization] Saved for ${userEOA}`);
}

/**
 * User の Authorization を取得
 * 
 * @param userEOA User EOAアドレス
 * @returns Authorization または undefined
 */
export function getAuthorization(userEOA: string): Authorization | undefined {
  const key = `auth:${userEOA}`;
  return authorizationStore.get(key);
}

/**
 * デモ用: User がすでに Authorization に署名済みと仮定
 * 
 * 実際のフローでは、フロントエンドでUserがMetaMaskで署名する
 */
export function createDemoAuthorization(
  userEOA: string,
  contractAddress: string
): Authorization {
  // デモ用の簡略版
  const auth: Authorization = {
    chainId: 43113,
    address: contractAddress,
    nonce: 0n,
  };

  saveAuthorization(userEOA, auth);
  return auth;
}

