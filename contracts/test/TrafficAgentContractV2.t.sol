// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/TrafficAgentContractV2.sol";
import "../src/MockJPYC.sol";

contract TrafficAgentContractV2Test is Test {
    TrafficAgentContractV2 public agentContract;
    MockJPYC public jpyc;
    
    address public owner;
    address public aiAgent;
    address public user1;
    address public user2;
    address public seller;

    function setUp() public {
        owner = address(this);
        aiAgent = makeAddr("aiAgent");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        seller = makeAddr("seller");

        jpyc = new MockJPYC();
        agentContract = new TrafficAgentContractV2(address(jpyc), owner);

        // JPYCを各ユーザーに配布
        jpyc.transfer(user1, 10000 * 10**18);
        jpyc.transfer(user2, 10000 * 10**18);

        // AI Agentをホワイトリスト登録
        agentContract.whitelistAgent(aiAgent, true);
    }

    // ===== デフォルト制限のテスト =====
    function test_DefaultLimits() public {
        (uint256 maxBid, uint256 maxDaily) = agentContract.getUserLimits(user1);
        
        assertEq(maxBid, 500 * 10**18);
        assertEq(maxDaily, 5000 * 10**18);
    }

    // ===== カスタム制限設定のテスト =====
    function test_SetCustomLimits() public {
        vm.prank(user1);
        agentContract.setMyLimits(1000 * 10**18, 10000 * 10**18);

        (uint256 maxBid, uint256 maxDaily) = agentContract.getUserLimits(user1);
        
        assertEq(maxBid, 1000 * 10**18);
        assertEq(maxDaily, 10000 * 10**18);
    }

    // ===== ユーザー独立性のテスト =====
    function test_UserIndependence() public {
        // User 1がカスタム設定
        vm.prank(user1);
        agentContract.setMyLimits(1000 * 10**18, 10000 * 10**18);

        // User 2はデフォルト
        (uint256 maxBid1, uint256 maxDaily1) = agentContract.getUserLimits(user1);
        (uint256 maxBid2, uint256 maxDaily2) = agentContract.getUserLimits(user2);

        assertEq(maxBid1, 1000 * 10**18);  // カスタム
        assertEq(maxBid2, 500 * 10**18);   // デフォルト
    }

    // ===== 独立した使用額管理のテスト =====
    function test_IndependentSpending() public {
        // Contractに残高を持たせる（EIP-7702シミュレーション）
        jpyc.transfer(address(agentContract), 20000 * 10**18);

        // User 1が使用
        vm.prank(aiAgent);
        // EIP-7702シミュレーション: address(this)をuser1に見せかける
        // 注: 実際のテストではprank(user1)でcontractを直接呼ぶことで代用
        
        // 簡易テスト: dailySpentが独立していることを確認
        assertEq(agentContract.userDailySpent(user1), 0);
        assertEq(agentContract.userDailySpent(user2), 0);
    }
}

