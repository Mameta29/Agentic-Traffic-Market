// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MockJPYC.sol";
import "../src/TrafficAgentContract.sol";
import "../src/AgentIdentityRegistry.sol";

/**
 * @title DeployScript
 * @notice Avalanche Fuji Testnetへの完全デプロイスクリプト
 * 
 * 使用方法:
 * 1. .env ファイルに DEPLOYER_PRIVATE_KEY を設定
 * 2. 実行: forge script script/Deploy.s.sol --rpc-url avalanche_fuji --broadcast
 */
contract DeployScript is Script {
    function run() external {
        // 環境変数から秘密鍵を取得
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== Deployment Start ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // ===== 1. MockJPYC デプロイ =====
        console.log("Deploying MockJPYC...");
        MockJPYC jpyc = new MockJPYC();
        console.log("MockJPYC deployed at:", address(jpyc));
        console.log("Initial supply:", jpyc.totalSupply() / 10**18, "JPYC");
        console.log("");

        // ===== 2. AgentIdentityRegistry デプロイ =====
        console.log("Deploying AgentIdentityRegistry...");
        AgentIdentityRegistry registry = new AgentIdentityRegistry();
        console.log("AgentIdentityRegistry deployed at:", address(registry));
        console.log("Name:", registry.name());
        console.log("Symbol:", registry.symbol());
        console.log("");

        // ===== 3. TrafficAgentContract デプロイ（リファレンス実装） =====
        // 注: このコントラクトは1つだけデプロイし、EIP-7702でユーザーのEOAに設定される
        console.log("Deploying TrafficAgentContract (Reference Implementation)...");
        TrafficAgentContract trafficAgent = new TrafficAgentContract(
            address(jpyc),
            deployer // 一時的なオーナー（実際はEIP-7702で各ユーザーのEOAが使用）
        );
        console.log("TrafficAgentContract deployed at:", address(trafficAgent));
        console.log("Max bid per tx:", trafficAgent.MAX_BID_AMOUNT() / 10**18, "JPYC");
        console.log("Max daily spend:", trafficAgent.MAX_DAILY_SPEND() / 10**18, "JPYC");
        console.log("");

        // ===== 4. テスト用初期設定 =====
        console.log("Setting up test environment...");

        // テスト用アカウント取得（環境変数から）
        address agentA = vm.envOr("AGENT_A_ADDRESS", address(0));
        address agentB = vm.envOr("AGENT_B_ADDRESS", address(0));

        if (agentA != address(0)) {
            // Agent Aに初期JPYC配布
            jpyc.transfer(agentA, 10_000 * 10**18);
            console.log("Transferred 10,000 JPYC to Agent A:", agentA);
        }

        if (agentB != address(0)) {
            // Agent Bに初期JPYC配布
            jpyc.transfer(agentB, 5_000 * 10**18);
            console.log("Transferred 5,000 JPYC to Agent B:", agentB);
        }

        console.log("");

        vm.stopBroadcast();

        // ===== デプロイサマリー =====
        console.log("=== Deployment Summary ===");
        console.log("MockJPYC:", address(jpyc));
        console.log("AgentIdentityRegistry:", address(registry));
        console.log("TrafficAgentContract:", address(trafficAgent));
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Update .env with these contract addresses:");
        console.log("   JPYC_CONTRACT_ADDRESS=", address(jpyc));
        console.log("   AGENT_IDENTITY_REGISTRY=", address(registry));
        console.log("   TRAFFIC_AGENT_CONTRACT=", address(trafficAgent));
        console.log("");
        console.log("2. Register Agent NFTs:");
        console.log("   - Agent A (Buyer): registry.register('ipfs://agent-a.json')");
        console.log("   - Agent B (Seller): registry.register('ipfs://agent-b.json')");
        console.log("");
        console.log("3. Sign EIP-7702 Authorization for each user");
    }
}


