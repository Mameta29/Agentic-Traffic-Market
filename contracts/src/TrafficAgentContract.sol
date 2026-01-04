// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrafficAgentContract
 * @notice EIP-7702準拠：ユーザーのEOAに一時的にデプロイされ、AIエージェントによる
 *         制約付きトークン送信を可能にするリファレンス実装
 * 
 * @dev このコントラクトは直接デプロイされるのではなく、EIP-7702の
 *      delegation indicatorとして使用されます。
 *      ユーザーのEOAにこのコードが一時的に設定され、bidForRightOfWay()が呼ばれます。
 * 
 * 重要な制約:
 * - 1取引あたり最大 500 JPYC
 * - 1日あたり最大 5,000 JPYC
 * - ホワイトリスト登録されたAIエージェントのみ実行可能
 */
contract TrafficAgentContract is ReentrancyGuard {
    // ===== Constants =====
    uint256 public constant MAX_BID_AMOUNT = 500 * 10**18; // 500 JPYC
    uint256 public constant MAX_DAILY_SPEND = 5000 * 10**18; // 5,000 JPYC
    uint256 public constant DAILY_RESET_PERIOD = 1 days;

    // ===== Immutables =====
    IERC20 public immutable jpycToken;
    address public immutable owner;

    // ===== State Variables =====
    mapping(address => bool) public whitelistedAgents;
    uint256 public dailySpent;
    uint256 public lastResetTimestamp;

    // ===== Events =====
    event RightOfWayPurchased(
        address indexed seller,
        uint256 amount,
        uint256 timestamp,
        string locationId
    );
    event AgentWhitelisted(address indexed agent, bool status);
    event DailyLimitReset(uint256 newTimestamp);

    // ===== Errors =====
    error NotOwner();
    error AgentNotWhitelisted();
    error BidExceedsMaximum(uint256 bid, uint256 maximum);
    error DailyLimitExceeded(uint256 requested, uint256 remaining);
    error TransferFailed();
    error ZeroAddress();
    error ZeroAmount();

    // ===== Modifiers =====
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyWhitelisted() {
        if (!whitelistedAgents[msg.sender]) revert AgentNotWhitelisted();
        _;
    }

    modifier withinLimits(uint256 amount) {
        // 日次リセットチェック
        if (block.timestamp >= lastResetTimestamp + DAILY_RESET_PERIOD) {
            dailySpent = 0;
            lastResetTimestamp = block.timestamp;
            emit DailyLimitReset(block.timestamp);
        }

        // 1取引あたりの上限チェック
        if (amount > MAX_BID_AMOUNT) {
            revert BidExceedsMaximum(amount, MAX_BID_AMOUNT);
        }

        // 1日あたりの上限チェック
        uint256 newTotal = dailySpent + amount;
        if (newTotal > MAX_DAILY_SPEND) {
            uint256 remaining = MAX_DAILY_SPEND - dailySpent;
            revert DailyLimitExceeded(amount, remaining);
        }

        _;

        // 実行後に累計を更新
        dailySpent = newTotal;
    }

    // ===== Constructor =====
    /**
     * @notice コンストラクタ
     * @param _jpycToken JPYCトークンのアドレス
     * @param _owner ユーザー（EOAの所有者）のアドレス
     */
    constructor(address _jpycToken, address _owner) {
        if (_jpycToken == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();

        jpycToken = IERC20(_jpycToken);
        owner = _owner;
        lastResetTimestamp = block.timestamp;
    }

    // ===== Main Functions =====
    /**
     * @notice AIエージェントが通行権を購入するメイン関数
     * @dev この関数はwhitelistedされたAIエージェントのみ呼び出し可能
     *      EIP-7702により、ユーザーのEOAがこのコードを持つため、
     *      実際の送金はユーザーのウォレットから行われる
     * 
     * @param seller 通行権を売却するエージェントのアドレス
     * @param amount 支払うJPYC量（wei単位）
     * @param locationId 通行権の対象地点ID（ログ用）
     */
    function bidForRightOfWay(
        address seller,
        uint256 amount,
        string calldata locationId
    ) external onlyWhitelisted withinLimits(amount) nonReentrant {
        if (seller == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        // JPYC送金実行
        // msg.sender（AI agent）が承認を持っていることが前提
        // または、このコントラクト自体がJPYCを保持
        bool success = jpycToken.transfer(seller, amount);
        if (!success) revert TransferFailed();

        emit RightOfWayPurchased(seller, amount, block.timestamp, locationId);
    }

    // ===== Admin Functions =====
    /**
     * @notice AIエージェントをホワイトリストに追加/削除
     * @param agent AIエージェントのアドレス
     * @param status true=ホワイトリスト追加, false=削除
     */
    function whitelistAgent(address agent, bool status) external onlyOwner {
        if (agent == address(0)) revert ZeroAddress();
        whitelistedAgents[agent] = status;
        emit AgentWhitelisted(agent, status);
    }

    /**
     * @notice 複数のAIエージェントを一括ホワイトリスト登録
     * @param agents AIエージェントのアドレス配列
     * @param statuses 各エージェントのステータス配列
     */
    function whitelistAgentsBatch(
        address[] calldata agents,
        bool[] calldata statuses
    ) external onlyOwner {
        require(agents.length == statuses.length, "Length mismatch");
        
        for (uint256 i = 0; i < agents.length; i++) {
            if (agents[i] == address(0)) revert ZeroAddress();
            whitelistedAgents[agents[i]] = statuses[i];
            emit AgentWhitelisted(agents[i], statuses[i]);
        }
    }

    /**
     * @notice AIエージェントの権限を即座に取り消し
     * @param agent 取り消すAIエージェントのアドレス
     */
    function revokeAgent(address agent) external onlyOwner {
        whitelistedAgents[agent] = false;
        emit AgentWhitelisted(agent, false);
    }

    // ===== View Functions =====
    /**
     * @notice 本日の残り使用可能額を取得
     * @return remaining 残り使用可能額（wei単位）
     */
    function getRemainingDailyLimit() external view returns (uint256 remaining) {
        // 日次リセット時刻を過ぎている場合
        if (block.timestamp >= lastResetTimestamp + DAILY_RESET_PERIOD) {
            return MAX_DAILY_SPEND;
        }
        
        // まだ日次制限期間内の場合
        if (dailySpent >= MAX_DAILY_SPEND) {
            return 0;
        }
        
        return MAX_DAILY_SPEND - dailySpent;
    }

    /**
     * @notice 次のリセット時刻を取得
     * @return timestamp 次のリセット時刻（Unix timestamp）
     */
    function getNextResetTime() external view returns (uint256 timestamp) {
        return lastResetTimestamp + DAILY_RESET_PERIOD;
    }

    /**
     * @notice エージェントがホワイトリストに登録されているか確認
     * @param agent 確認するエージェントのアドレス
     * @return isWhitelisted true=登録済み, false=未登録
     */
    function isAgentWhitelisted(address agent) external view returns (bool isWhitelisted) {
        return whitelistedAgents[agent];
    }
}

