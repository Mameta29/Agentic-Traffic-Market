// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MockJPYC.sol";
import "../src/TrafficAgentContractV2.sol";
import "../src/AgentIdentityRegistry.sol";

/**
 * @title DeploySepolia
 * @notice Ethereum Sepoliaへのデプロイ（EIP-7702対応）
 */
contract DeploySepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== Sepolia Deployment Start ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. MockJPYC デプロイ
        console.log("Deploying MockJPYC on Sepolia...");
        MockJPYC jpyc = new MockJPYC();
        console.log("MockJPYC deployed at:", address(jpyc));
        console.log("");

        // 2. AgentIdentityRegistry デプロイ
        console.log("Deploying AgentIdentityRegistry...");
        AgentIdentityRegistry registry = new AgentIdentityRegistry();
        console.log("AgentIdentityRegistry deployed at:", address(registry));
        console.log("");

        // 3. TrafficAgentContractV2 デプロイ
        console.log("Deploying TrafficAgentContractV2...");
        TrafficAgentContractV2 trafficAgent = new TrafficAgentContractV2(
            address(jpyc),
            deployer
        );
        console.log("TrafficAgentContractV2 deployed at:", address(trafficAgent));
        console.log("");

        // 4. 初期配布
        address user1 = vm.envOr("USER_1_EOA", address(0));
        address user2 = vm.envOr("USER_2_EOA", address(0));

        if (user1 != address(0)) {
            jpyc.transfer(user1, 10_000 * 10**18);
            console.log("Transferred 10,000 JPYC to User 1:", user1);
        }

        if (user2 != address(0)) {
            jpyc.transfer(user2, 5_000 * 10**18);
            console.log("Transferred 5,000 JPYC to User 2:", user2);
        }

        // TrafficAgentContractにもJPYC配布
        jpyc.transfer(address(trafficAgent), 20_000 * 10**18);
        console.log("Transferred 20,000 JPYC to TrafficAgentContract");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Summary (Sepolia) ===");
        console.log("MockJPYC:", address(jpyc));
        console.log("AgentIdentityRegistry:", address(registry));
        console.log("TrafficAgentContract:", address(trafficAgent));
        console.log("");
        console.log("Next: Update .env with SEPOLIA_* variables");
    }
}

