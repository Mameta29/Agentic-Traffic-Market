// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title AgentIdentityRegistry
 * @notice ERC-8004準拠: AIエージェントのIdentity NFT Registry
 * @dev ERC-721ベースで、各Agent NFTがエージェントの身分証明となる
 * 
 * Agent NFTは以下を表現:
 * - NFT Owner = Human User (車の持ち主など)
 * - Token URI = Agent Card JSON (MCPエンドポイント、能力、制約など)
 * - Metadata = 追加情報（オンチェーン）
 * 
 * ERC-8004仕様:
 * - agentId = tokenId
 * - tokenURI → Agent Card (オフチェーンJSON)
 * - metadata → key-value storage (オンチェーン)
 */
contract AgentIdentityRegistry is ERC721URIStorage {
    // ===== State Variables =====
    uint256 private _agentIdCounter;

    // Agent ID => (key => value) のメタデータストレージ
    mapping(uint256 => mapping(string => bytes)) public agentMetadata;

    // ===== Structs =====
    struct MetadataEntry {
        string key;
        bytes value;
    }

    // ===== Events =====
    event Registered(
        uint256 indexed agentId,
        string tokenURI,
        address indexed owner
    );

    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedKey,
        string key,
        bytes value
    );

    event MetadataRemoved(
        uint256 indexed agentId,
        string indexed indexedKey,
        string key
    );

    // ===== Errors =====
    error NotAgentOwner(uint256 agentId, address caller);
    error AgentNotExists(uint256 agentId);
    error EmptyTokenURI();
    error EmptyKey();

    // ===== Constructor =====
    /**
     * @notice コンストラクタ
     */
    constructor() ERC721("Traffic Agent Identity", "TAI") {
        _agentIdCounter = 0; // 最初のAgentはID=1
    }

    // ===== Main Functions =====
    /**
     * @notice 新しいエージェントNFTを登録（メタデータなし）
     * @param tokenURI Agent Card JSONへのURI (IPFS, HTTPなど)
     * @return agentId 新しく発行されたAgent ID
     */
    function register(string calldata tokenURI) external returns (uint256) {
        return _registerAgent(msg.sender, tokenURI, new MetadataEntry[](0));
    }

    /**
     * @notice 新しいエージェントNFTを登録（メタデータ付き）
     * @param tokenURI Agent Card JSONへのURI
     * @param metadata 初期メタデータ配列
     * @return agentId 新しく発行されたAgent ID
     */
    function register(
        string calldata tokenURI,
        MetadataEntry[] calldata metadata
    ) external returns (uint256) {
        return _registerAgent(msg.sender, tokenURI, metadata);
    }

    /**
     * @dev 内部登録ロジック
     */
    function _registerAgent(
        address owner,
        string memory tokenURI,
        MetadataEntry[] memory metadata
    ) internal returns (uint256) {
        if (bytes(tokenURI).length == 0) revert EmptyTokenURI();

        // Counter をインクリメント
        unchecked {
            _agentIdCounter++;
        }
        uint256 agentId = _agentIdCounter;

        // NFT Mint
        _safeMint(owner, agentId);
        _setTokenURI(agentId, tokenURI);

        // メタデータ設定
        for (uint256 i = 0; i < metadata.length; i++) {
            if (bytes(metadata[i].key).length == 0) revert EmptyKey();
            agentMetadata[agentId][metadata[i].key] = metadata[i].value;
            emit MetadataSet(
                agentId,
                metadata[i].key,
                metadata[i].key,
                metadata[i].value
            );
        }

        emit Registered(agentId, tokenURI, owner);
        return agentId;
    }

    // ===== Metadata Management =====
    /**
     * @notice エージェントのメタデータを設定（オーナーのみ）
     * @param agentId Agent ID
     * @param key メタデータキー
     * @param value メタデータ値
     */
    function setMetadata(
        uint256 agentId,
        string calldata key,
        bytes calldata value
    ) external {
        if (!_exists(agentId)) revert AgentNotExists(agentId);
        if (ownerOf(agentId) != msg.sender) {
            revert NotAgentOwner(agentId, msg.sender);
        }
        if (bytes(key).length == 0) revert EmptyKey();

        agentMetadata[agentId][key] = value;
        emit MetadataSet(agentId, key, key, value);
    }

    /**
     * @notice 複数メタデータを一括設定
     * @param agentId Agent ID
     * @param entries メタデータエントリー配列
     */
    function setMetadataBatch(
        uint256 agentId,
        MetadataEntry[] calldata entries
    ) external {
        if (!_exists(agentId)) revert AgentNotExists(agentId);
        if (ownerOf(agentId) != msg.sender) {
            revert NotAgentOwner(agentId, msg.sender);
        }

        for (uint256 i = 0; i < entries.length; i++) {
            if (bytes(entries[i].key).length == 0) revert EmptyKey();
            agentMetadata[agentId][entries[i].key] = entries[i].value;
            emit MetadataSet(
                agentId,
                entries[i].key,
                entries[i].key,
                entries[i].value
            );
        }
    }

    /**
     * @notice メタデータを削除
     * @param agentId Agent ID
     * @param key 削除するキー
     */
    function removeMetadata(uint256 agentId, string calldata key) external {
        if (!_exists(agentId)) revert AgentNotExists(agentId);
        if (ownerOf(agentId) != msg.sender) {
            revert NotAgentOwner(agentId, msg.sender);
        }

        delete agentMetadata[agentId][key];
        emit MetadataRemoved(agentId, key, key);
    }

    // ===== View Functions =====
    /**
     * @notice メタデータを取得
     * @param agentId Agent ID
     * @param key メタデータキー
     * @return value メタデータ値
     */
    function getMetadata(
        uint256 agentId,
        string calldata key
    ) external view returns (bytes memory value) {
        if (!_exists(agentId)) revert AgentNotExists(agentId);
        return agentMetadata[agentId][key];
    }

    /**
     * @notice エージェントが存在するか確認
     * @param agentId Agent ID
     * @return exists true=存在, false=不存在
     */
    function exists(uint256 agentId) external view returns (bool) {
        return _exists(agentId);
    }

    /**
     * @notice 現在の最大Agent ID（登録済みエージェント数）
     * @return count 登録済みエージェント数
     */
    function totalAgents() external view returns (uint256 count) {
        return _agentIdCounter;
    }

    /**
     * @notice Agent Card URIとOwnerを同時取得（ガス削減）
     * @param agentId Agent ID
     * @return uri Agent Card URI
     * @return owner オーナーアドレス
     */
    function getAgentInfo(uint256 agentId)
        external
        view
        returns (string memory uri, address owner)
    {
        if (!_exists(agentId)) revert AgentNotExists(agentId);
        return (tokenURI(agentId), ownerOf(agentId));
    }

    // ===== Internal Helper =====
    /**
     * @dev ERC721の_exists()をpublicにラップ
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}

