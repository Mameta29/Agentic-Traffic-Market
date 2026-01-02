// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/AgentIdentityRegistry.sol";

contract AgentIdentityRegistryTest is Test {
    AgentIdentityRegistry public registry;
    
    address public user1;
    address public user2;

    function setUp() public {
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        registry = new AgentIdentityRegistry();
    }

    // ===== 基本テスト =====
    function test_Deployment() public view {
        assertEq(registry.name(), "Traffic Agent Identity");
        assertEq(registry.symbol(), "TAI");
        assertEq(registry.totalAgents(), 0);
    }

    // ===== Registration テスト =====
    function test_Register_Basic() public {
        string memory tokenURI = "ipfs://agent-card-1.json";
        
        vm.prank(user1);
        uint256 agentId = registry.register(tokenURI);
        
        assertEq(agentId, 1);
        assertEq(registry.ownerOf(agentId), user1);
        assertEq(registry.tokenURI(agentId), tokenURI);
        assertEq(registry.totalAgents(), 1);
    }

    function test_Register_MultipleAgents() public {
        vm.prank(user1);
        uint256 agent1 = registry.register("ipfs://agent1.json");
        
        vm.prank(user2);
        uint256 agent2 = registry.register("ipfs://agent2.json");
        
        assertEq(agent1, 1);
        assertEq(agent2, 2);
        assertEq(registry.ownerOf(agent1), user1);
        assertEq(registry.ownerOf(agent2), user2);
    }

    function test_Register_WithMetadata() public {
        AgentIdentityRegistry.MetadataEntry[]
            memory metadata = new AgentIdentityRegistry.MetadataEntry[](2);
        metadata[0] = AgentIdentityRegistry.MetadataEntry({
            key: "role",
            value: abi.encode("buyer")
        });
        metadata[1] = AgentIdentityRegistry.MetadataEntry({
            key: "maxBid",
            value: abi.encode(uint256(500))
        });
        
        vm.prank(user1);
        uint256 agentId = registry.register("ipfs://agent.json", metadata);
        
        bytes memory role = registry.getMetadata(agentId, "role");
        bytes memory maxBid = registry.getMetadata(agentId, "maxBid");
        
        assertEq(abi.decode(role, (string)), "buyer");
        assertEq(abi.decode(maxBid, (uint256)), 500);
    }

    function test_RevertWhen_EmptyTokenURI() public {
        vm.prank(user1);
        vm.expectRevert(AgentIdentityRegistry.EmptyTokenURI.selector);
        registry.register("");
    }

    // ===== Metadata テスト =====
    function test_SetMetadata() public {
        vm.startPrank(user1);
        uint256 agentId = registry.register("ipfs://agent.json");
        
        registry.setMetadata(agentId, "color", abi.encode("green"));
        
        bytes memory color = registry.getMetadata(agentId, "color");
        assertEq(abi.decode(color, (string)), "green");
        
        vm.stopPrank();
    }

    function test_SetMetadataBatch() public {
        vm.startPrank(user1);
        uint256 agentId = registry.register("ipfs://agent.json");
        
        AgentIdentityRegistry.MetadataEntry[]
            memory entries = new AgentIdentityRegistry.MetadataEntry[](3);
        entries[0] = AgentIdentityRegistry.MetadataEntry({
            key: "role",
            value: abi.encode("seller")
        });
        entries[1] = AgentIdentityRegistry.MetadataEntry({
            key: "priority",
            value: abi.encode(uint256(10))
        });
        entries[2] = AgentIdentityRegistry.MetadataEntry({
            key: "location",
            value: abi.encode("Tokyo")
        });
        
        registry.setMetadataBatch(agentId, entries);
        
        assertEq(abi.decode(registry.getMetadata(agentId, "role"), (string)), "seller");
        assertEq(abi.decode(registry.getMetadata(agentId, "priority"), (uint256)), 10);
        assertEq(abi.decode(registry.getMetadata(agentId, "location"), (string)), "Tokyo");
        
        vm.stopPrank();
    }

    function test_RemoveMetadata() public {
        vm.startPrank(user1);
        uint256 agentId = registry.register("ipfs://agent.json");
        
        registry.setMetadata(agentId, "temp", abi.encode("value"));
        assertGt(registry.getMetadata(agentId, "temp").length, 0); // データが存在することを確認
        
        registry.removeMetadata(agentId, "temp");
        assertEq(registry.getMetadata(agentId, "temp").length, 0);
        
        vm.stopPrank();
    }

    function test_RevertWhen_SetMetadataNonOwner() public {
        vm.prank(user1);
        uint256 agentId = registry.register("ipfs://agent.json");
        
        vm.prank(user2);
        vm.expectRevert();
        registry.setMetadata(agentId, "key", abi.encode("value"));
    }

    function test_RevertWhen_SetMetadataEmptyKey() public {
        vm.startPrank(user1);
        uint256 agentId = registry.register("ipfs://agent.json");
        
        vm.expectRevert(AgentIdentityRegistry.EmptyKey.selector);
        registry.setMetadata(agentId, "", abi.encode("value"));
        
        vm.stopPrank();
    }

    // ===== View Functions テスト =====
    function test_Exists() public {
        assertFalse(registry.exists(1));
        
        vm.prank(user1);
        registry.register("ipfs://agent.json");
        
        assertTrue(registry.exists(1));
        assertFalse(registry.exists(2));
    }

    function test_GetAgentInfo() public {
        vm.prank(user1);
        uint256 agentId = registry.register("ipfs://my-agent.json");
        
        (string memory uri, address owner) = registry.getAgentInfo(agentId);
        
        assertEq(uri, "ipfs://my-agent.json");
        assertEq(owner, user1);
    }

    function test_RevertWhen_GetMetadataNonExistent() public {
        vm.expectRevert();
        registry.getMetadata(999, "key");
    }

    // ===== ERC721 標準機能テスト =====
    function test_Transfer() public {
        vm.prank(user1);
        uint256 agentId = registry.register("ipfs://agent.json");
        
        vm.prank(user1);
        registry.transferFrom(user1, user2, agentId);
        
        assertEq(registry.ownerOf(agentId), user2);
    }

    function test_TotalAgents() public {
        assertEq(registry.totalAgents(), 0);
        
        vm.prank(user1);
        registry.register("ipfs://agent1.json");
        assertEq(registry.totalAgents(), 1);
        
        vm.prank(user2);
        registry.register("ipfs://agent2.json");
        assertEq(registry.totalAgents(), 2);
    }
}

