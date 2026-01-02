// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/TrafficAgentContract.sol";
import "../src/MockJPYC.sol";

contract TrafficAgentContractTest is Test {
    TrafficAgentContract public agentContract;
    MockJPYC public jpyc;
    
    address public owner;
    address public aiAgent;
    address public seller;
    address public unauthorized;

    function setUp() public {
        owner = address(this);
        aiAgent = makeAddr("aiAgent");
        seller = makeAddr("seller");
        unauthorized = makeAddr("unauthorized");

        // JPYC デプロイ
        jpyc = new MockJPYC();

        // TrafficAgentContract デプロイ
        agentContract = new TrafficAgentContract(address(jpyc), owner);

        // Owner に JPYC を配布（EIP-7702では実際はユーザーのEOAが持つ）
        jpyc.transfer(address(agentContract), 10000 * 10**18);

        // AI Agent をホワイトリスト登録
        agentContract.whitelistAgent(aiAgent, true);
    }

    // ===== 基本テスト =====
    function test_Deployment() public view {
        assertEq(address(agentContract.jpycToken()), address(jpyc));
        assertEq(agentContract.owner(), owner);
        assertEq(agentContract.MAX_BID_AMOUNT(), 500 * 10**18);
        assertEq(agentContract.MAX_DAILY_SPEND(), 5000 * 10**18);
    }

    function test_WhitelistAgent() public {
        address newAgent = makeAddr("newAgent");
        agentContract.whitelistAgent(newAgent, true);
        assertTrue(agentContract.isAgentWhitelisted(newAgent));
    }

    // ===== bidForRightOfWay テスト =====
    function test_BidForRightOfWay_Success() public {
        uint256 bidAmount = 400 * 10**18;
        uint256 sellerBalanceBefore = jpyc.balanceOf(seller);

        vm.prank(aiAgent);
        agentContract.bidForRightOfWay(seller, bidAmount, "LOC_001");

        uint256 sellerBalanceAfter = jpyc.balanceOf(seller);
        assertEq(sellerBalanceAfter - sellerBalanceBefore, bidAmount);
        assertEq(agentContract.dailySpent(), bidAmount);
    }

    function test_BidForRightOfWay_MultipleBids() public {
        vm.startPrank(aiAgent);
        
        agentContract.bidForRightOfWay(seller, 300 * 10**18, "LOC_001");
        assertEq(agentContract.dailySpent(), 300 * 10**18);
        
        agentContract.bidForRightOfWay(seller, 200 * 10**18, "LOC_002");
        assertEq(agentContract.dailySpent(), 500 * 10**18);
        
        vm.stopPrank();
    }

    function test_RevertWhen_UnauthorizedAgent() public {
        vm.prank(unauthorized);
        vm.expectRevert(TrafficAgentContract.AgentNotWhitelisted.selector);
        agentContract.bidForRightOfWay(seller, 100 * 10**18, "LOC_001");
    }

    function test_RevertWhen_ExceedsMaxBid() public {
        vm.prank(aiAgent);
        vm.expectRevert();
        agentContract.bidForRightOfWay(seller, 600 * 10**18, "LOC_001");
    }

    function test_RevertWhen_ExceedsDailyLimit() public {
        vm.startPrank(aiAgent);
        
        // 500 JPYC x 10回 = 5000 JPYC（上限）
        for (uint i = 0; i < 10; i++) {
            agentContract.bidForRightOfWay(seller, 500 * 10**18, "LOC_001");
        }
        
        // 11回目は失敗するはず
        vm.expectRevert();
        agentContract.bidForRightOfWay(seller, 100 * 10**18, "LOC_001");
        
        vm.stopPrank();
    }

    function test_RevertWhen_ZeroAmount() public {
        vm.prank(aiAgent);
        vm.expectRevert(TrafficAgentContract.ZeroAmount.selector);
        agentContract.bidForRightOfWay(seller, 0, "LOC_001");
    }

    function test_RevertWhen_ZeroAddress() public {
        vm.prank(aiAgent);
        vm.expectRevert(TrafficAgentContract.ZeroAddress.selector);
        agentContract.bidForRightOfWay(address(0), 100 * 10**18, "LOC_001");
    }

    // ===== Daily Reset テスト =====
    function test_DailyReset() public {
        vm.startPrank(aiAgent);
        
        // 1日目: 5000 JPYC使用
        for (uint i = 0; i < 10; i++) {
            agentContract.bidForRightOfWay(seller, 500 * 10**18, "LOC_001");
        }
        assertEq(agentContract.dailySpent(), 5000 * 10**18);
        
        // 24時間経過
        vm.warp(block.timestamp + 1 days);
        
        // リセット後は再度使用可能
        agentContract.bidForRightOfWay(seller, 500 * 10**18, "LOC_002");
        assertEq(agentContract.dailySpent(), 500 * 10**18);
        
        vm.stopPrank();
    }

    function test_GetRemainingDailyLimit() public {
        assertEq(agentContract.getRemainingDailyLimit(), 5000 * 10**18);
        
        vm.prank(aiAgent);
        agentContract.bidForRightOfWay(seller, 500 * 10**18, "LOC_001");
        
        assertEq(agentContract.getRemainingDailyLimit(), 4500 * 10**18);
    }

    function test_GetRemainingDailyLimit_AfterReset() public {
        vm.prank(aiAgent);
        agentContract.bidForRightOfWay(seller, 500 * 10**18, "LOC_001");
        
        // 24時間経過
        vm.warp(block.timestamp + 1 days);
        
        // リセット後は全額使用可能
        assertEq(agentContract.getRemainingDailyLimit(), 5000 * 10**18);
    }

    // ===== Admin 機能テスト =====
    function test_RevokeAgent() public {
        assertTrue(agentContract.isAgentWhitelisted(aiAgent));
        
        agentContract.revokeAgent(aiAgent);
        
        assertFalse(agentContract.isAgentWhitelisted(aiAgent));
    }

    function test_WhitelistAgentsBatch() public {
        address[] memory agents = new address[](3);
        bool[] memory statuses = new bool[](3);
        
        agents[0] = makeAddr("agent1");
        agents[1] = makeAddr("agent2");
        agents[2] = makeAddr("agent3");
        
        statuses[0] = true;
        statuses[1] = true;
        statuses[2] = false;
        
        agentContract.whitelistAgentsBatch(agents, statuses);
        
        assertTrue(agentContract.isAgentWhitelisted(agents[0]));
        assertTrue(agentContract.isAgentWhitelisted(agents[1]));
        assertFalse(agentContract.isAgentWhitelisted(agents[2]));
    }

    function test_RevertWhen_WhitelistNonOwner() public {
        vm.prank(unauthorized);
        vm.expectRevert(TrafficAgentContract.NotOwner.selector);
        agentContract.whitelistAgent(makeAddr("newAgent"), true);
    }
}

