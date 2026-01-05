import 'server-only';

import authorizations from './authorizations.json';

/**
 * EIP-7702 Authorization の保存・管理
 * 
 * 事前署名されたAuthorizationを使用
 */

interface Authorization {
  address: string;
  chainId: number;
  nonce: number;
  r: string;
  s: string;
  yParity: number;
}

/**
 * User の Authorization を取得（事前署名済み）
 * 
 * @param userEOA User EOAアドレス
 * @returns Authorization
 */
export function getAuthorization(userEOA: string): Authorization | null {
  const lowerEOA = userEOA.toLowerCase();

  if (lowerEOA === authorizations.user1.userEOA.toLowerCase()) {
    return authorizations.user1.authorization as Authorization;
  }

  if (lowerEOA === authorizations.user2.userEOA.toLowerCase()) {
    return authorizations.user2.authorization as Authorization;
  }

  console.warn(`[Authorization] No authorization found for ${userEOA}`);
  return null;
}

