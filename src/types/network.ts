/**
 * ネットワーク設定の型定義
 */

export type Network = 'fuji' | 'sepolia';

export interface NetworkConfig {
  name: string;
  displayName: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  jpycContract: string;
  agentRegistry: string;
  trafficContract: string;
  supportsEIP7702: boolean;
}

export const NETWORK_CONFIGS: Record<Network, NetworkConfig> = {
  fuji: {
    name: 'fuji',
    displayName: 'Avalanche Fuji',
    chainId: 43113,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io',
    jpycContract: '0xE50b2A73eCf5D93D1c885C2F676f8921F3CaCdcd',
    agentRegistry: '0xD41DBe68a4aBe9CcA352400Ba1240E27865cD1c1',
    trafficContract: '0xC196330F11B18973274419E7Fa2cf954Aff98BE8',
    supportsEIP7702: false,
  },
  sepolia: {
    name: 'sepolia',
    displayName: 'Ethereum Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    jpycContract: '0x48EDb73F9C584A38Da43A6Ec9F39eF6D14E4A557',
    agentRegistry: '0x169d90cE2A7ccbF67e1B20752339eBc1a068dbb3',
    trafficContract: '0x1a61a82Ab9874FFFBE9aC6F00479d5c8ae2EC142',
    supportsEIP7702: true,
  },
};


