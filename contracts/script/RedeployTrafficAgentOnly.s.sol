// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/TrafficAgentContractV2.sol";

/**
 * @title RedeployTrafficAgentOnly
 * @notice TrafficAgentContractV2のみを再デプロイ（既存のJPYCを使用）
 */
contract RedeployTrafficAgentOnly is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // 既存のMockJPYCアドレス（環境変数から取得）
        address existingJPYC = vm.envAddress("EXISTING_JPYC_ADDRESS");

        console.log("=== TrafficAgentContractV2 Re-deployment ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Existing JPYC:", existingJPYC);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // TrafficAgentContractV2 のみデプロイ
        console.log("Deploying TrafficAgentContractV2 (with receive() function)...");
        TrafficAgentContractV2 trafficAgent = new TrafficAgentContractV2(
            existingJPYC,
            deployer
        );
        console.log("TrafficAgentContractV2 deployed at:", address(trafficAgent));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Summary ===");
        console.log("JPYC (unchanged):", existingJPYC);
        console.log("TrafficAgentContract (NEW):", address(trafficAgent));
        console.log("");
        console.log("Update .env:");
        console.log("SEPOLIA_TRAFFIC_AGENT_CONTRACT=", address(trafficAgent));
    }
}

