// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/TrafficAgentContractV2.sol";
import "../src/MockJPYC.sol";

/**
 * @title TrafficAgentContractV2Test
 * @notice EIP-7702対応コントラクトのテスト
 * 
 * 注意:
 * - EIP-7702の動作を完全に再現することは困難
 * - 主要なロジック（制限チェック、JPYC送金など）のテストに集中
 */
contract TrafficAgentContractV2Test is Test {
    TrafficAgentContractV2 public agentContract;
    MockJPYC public jpyc;
    
    address public owner;
    address public aiAgent;
    address public user1;
    address public seller;

    function setUp() public {
        owner = address(this);
        aiAgent = makeAddr("aiAgent");
        user1 = makeAddr("user1");
        seller = makeAddr("seller");

        jpyc = new MockJPYC();
        agentContract = new TrafficAgentContractV2(address(jpyc), owner);

        // Contract自体にJPYCを配布（EIP-7702ではEOAに配布される）
        jpyc.transfer(address(agentContract), 20000 * 10**18);
    }

    // ===== デフォルト制限のテスト =====
    function test_DefaultLimits() public {
        (uint256 maxBid, uint256 maxDaily) = agentContract.getMyLimits();
        
        assertEq(maxBid, 500 * 10**18, "Default max bid should be 500 JPYC");
        assertEq(maxDaily, 5000 * 10**18, "Default max daily should be 5000 JPYC");
    }

    // ===== 基本的なbidForRightOfWayのテスト =====
    function test_BidForRightOfWay() public {
        // 1. Contractがエージェントをホワイトリストに追加
        //    EIP-7702では User EOA がこれを実行する
        vm.prank(address(agentContract));
        agentContract.whitelistAgent(aiAgent, true);

        // 2. エージェントが入札
        vm.prank(aiAgent);
        agentContract.bidForRightOfWay(seller, 100 * 10**18, "TEST_LOC");

        // 3. 検証
        assertEq(jpyc.balanceOf(seller), 100 * 10**18, "Seller should receive 100 JPYC");
        assertEq(agentContract.dailySpent(), 100 * 10**18, "Daily spent should be 100 JPYC");
    }

    // ===== ホワイトリストなしエージェントの拒否 =====
    function test_RevertUnauthorizedAgent() public {
        vm.prank(aiAgent);
        vm.expectRevert(TrafficAgentContractV2.AgentNotWhitelisted.selector);
        agentContract.bidForRightOfWay(seller, 100 * 10**18, "TEST_LOC");
    }

    // ===== 上限超過のテスト =====
    function test_RevertExceedsMaxBid() public {
        vm.prank(address(agentContract));
        agentContract.whitelistAgent(aiAgent, true);

        vm.prank(aiAgent);
        vm.expectRevert(
            abi.encodeWithSelector(
                TrafficAgentContractV2.BidExceedsMaximum.selector,
                600 * 10**18,
                500 * 10**18
            )
        );
        agentContract.bidForRightOfWay(seller, 600 * 10**18, "TEST_LOC");
    }

    // ===== 日次制限のテスト =====
    function test_DailyLimit() public {
        vm.prank(address(agentContract));
        agentContract.whitelistAgent(aiAgent, true);

        // 1回目: 300 JPYC
        vm.prank(aiAgent);
        agentContract.bidForRightOfWay(seller, 300 * 10**18, "LOC1");

        // 2回目: 300 JPYC
        vm.prank(aiAgent);
        agentContract.bidForRightOfWay(seller, 300 * 10**18, "LOC2");

        // 残り確認
        uint256 remaining = agentContract.getMyRemainingLimit();
        assertEq(remaining, 4400 * 10**18, "Remaining should be 4400 JPYC");
    }

    // ===== ETH受け取りのテスト =====
    function test_ReceiveETH() public {
        // Contractに0.1 ETHを送信
        (bool success, ) = address(agentContract).call{value: 0.1 ether}("");
        assertTrue(success, "Contract should receive ETH");
        assertEq(address(agentContract).balance, 0.1 ether, "Balance should be 0.1 ETH");
    }
}
