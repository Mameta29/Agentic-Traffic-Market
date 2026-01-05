/**
 * EIP-7702 Authorization事前生成スクリプト
 * 
 * User 1, User 2がAgentに実行権限を委譲する署名を生成
 */

import { createWalletClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Sepolia
const SEPOLIA_TRAFFIC_AGENT_CONTRACT = '0x1a61a82Ab9874FFFBE9aC6F00479d5c8ae2EC142';

// User秘密鍵（Authorization署名用のみ、実行には使わない）
const USER_1_PRIVATE_KEY = '0x0d507fb5997d1eb936d74675d9b113fd9104d1b0a9c0b55aaf508283a613a251';
const USER_2_PRIVATE_KEY = '0x7da75f3c4460b97d9857da81521030f774df5346543b380798d0b7f3a6f3da24';

async function generateAuthorizations() {
  console.log('=== EIP-7702 Authorization生成 ===\n');

  // User 1 Authorization
  const user1Account = privateKeyToAccount(USER_1_PRIVATE_KEY as `0x${string}`);
  const user1Client = createWalletClient({
    account: user1Account,
    chain: avalancheFuji,
    transport: http('https://api.avax-test.network/ext/bc/C/rpc'),
  });

  console.log('User 1 EOA:', user1Account.address);
  console.log('Signing authorization for Sepolia TrafficAgentContract...\n');

  try {
    // @ts-ignore - viem experimentalの型
    const auth1 = await user1Client.signAuthorization({
      contractAddress: SEPOLIA_TRAFFIC_AGENT_CONTRACT,
      chainId: 11155111, // Sepolia
    });

    console.log('User 1 Authorization:');
    console.log(auth1);
    console.log('\n---\n');
  } catch (error) {
    console.error('Error generating User 1 auth:', error);
    console.log('Note: signAuthorization may not be available in viem@2.43.4');
    console.log('Fallback: Manual authorization structure\n');
  }

  // User 2 Authorization
  const user2Account = privateKeyToAccount(USER_2_PRIVATE_KEY as `0x${string}`);
  const user2Client = createWalletClient({
    account: user2Account,
    chain: avalancheFuji,
    transport: http('https://api.avax-test.network/ext/bc/C/rpc'),
  });

  console.log('User 2 EOA:', user2Account.address);
  console.log('Signing authorization for Sepolia TrafficAgentContract...\n');

  try {
    // @ts-ignore
    const auth2 = await user2Client.signAuthorization({
      contractAddress: SEPOLIA_TRAFFIC_AGENT_CONTRACT,
      chainId: 11155111, // Sepolia
    });

    console.log('User 2 Authorization:');
    console.log(auth2);
  } catch (error) {
    console.error('Error generating User 2 auth:', error);
  }

  console.log('\n=== 完了 ===');
  console.log('これらのAuthorizationをサーバーに保存します');
}

generateAuthorizations().catch(console.error);

