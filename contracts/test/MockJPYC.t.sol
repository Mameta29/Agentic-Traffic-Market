// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/MockJPYC.sol";

contract MockJPYCTest is Test {
    MockJPYC public jpyc;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        jpyc = new MockJPYC();
    }

    function test_InitialSupply() public view {
        assertEq(jpyc.totalSupply(), 1_000_000 * 10**18);
        assertEq(jpyc.balanceOf(owner), 1_000_000 * 10**18);
    }

    function test_Metadata() public view {
        assertEq(jpyc.name(), "Mock JPYC");
        assertEq(jpyc.symbol(), "JPYC");
        assertEq(jpyc.decimals(), 18);
    }

    function test_Transfer() public {
        jpyc.transfer(user1, 1000 * 10**18);
        assertEq(jpyc.balanceOf(user1), 1000 * 10**18);
    }

    function test_Mint() public {
        jpyc.mint(user1, 500 * 10**18);
        assertEq(jpyc.balanceOf(user1), 500 * 10**18);
    }

    function test_Burn() public {
        jpyc.transfer(user1, 1000 * 10**18);
        
        vm.prank(user1);
        jpyc.burn(500 * 10**18);
        
        assertEq(jpyc.balanceOf(user1), 500 * 10**18);
    }

    function test_RevertWhen_MintUnauthorized() public {
        vm.prank(user1);
        vm.expectRevert();
        jpyc.mint(user2, 100 * 10**18);
    }
}

