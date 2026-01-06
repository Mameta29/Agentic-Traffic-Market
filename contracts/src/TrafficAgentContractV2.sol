// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrafficAgentContractV2
 * @notice EIP-7702準拠：EOAごとの独立したストレージを活用したシンプル設計
 * 
 * 設計思想:
 * - EIP-7702では各EOAが独自のストレージを持つため、Mappingは不要
 * - 各EOAにデリゲートされた際、そのEOA専用の設定値として動作
 * - ガス効率が向上し、コードがシンプルに
 */
contract TrafficAgentContractV2 is ReentrancyGuard {
    // ===== デフォルト制限値（定数） =====
    uint256 public constant DEFAULT_MAX_BID_AMOUNT = 500 * 10**18;
    uint256 public constant DEFAULT_MAX_DAILY_SPEND = 5000 * 10**18;
    uint256 public constant DAILY_RESET_PERIOD = 1 days;
    
    // 絶対上限（カスタマイズでもこれを超えられない）
    uint256 public constant ABSOLUTE_MAX_BID = 10000 * 10**18;
    uint256 public constant ABSOLUTE_MAX_DAILY = 50000 * 10**18;

    // ===== Immutables =====
    IERC20 public immutable jpycToken;
    address public immutable deploymentOwner; // デプロイ者（管理用）

    // ===== このEOA専用のストレージ変数 =====
    // EIP-7702: 各User EOAが独自のストレージを持つため、Mappingは不要
    
    // カスタマイズ可能な制限値
    uint256 public maxBidAmount;      // 0の場合はDEFAULT_MAX_BID_AMOUNTを使用
    uint256 public maxDailySpend;     // 0の場合はDEFAULT_MAX_DAILY_SPENDを使用
    
    // 使用状況の記録
    uint256 public dailySpent;        // 今日の使用額
    uint256 public lastResetTime;     // 最後にリセットした時刻
    
    // ホワイトリスト（このEOAが許可したエージェント）
    mapping(address => bool) public whitelistedAgents;

    // ===== Events =====
    event RightOfWayPurchased(
        address indexed user,
        address indexed seller,
        uint256 amount,
        uint256 timestamp,
        string locationId
    );
    event AgentWhitelisted(address indexed agent, bool status);
    event LimitsSet(uint256 maxBid, uint256 maxDaily);

    // ===== Errors =====
    error OnlySelfAuth(); // User EOA自身のみ実行可能
    error AgentNotWhitelisted();
    error BidExceedsMaximum(uint256 bid, uint256 maximum);
    error DailyLimitExceeded(uint256 requested, uint256 remaining);
    error ExceedsAbsoluteLimit();
    error ZeroAddress();
    error ZeroAmount();
    error TransferFailed();

    // ===== Modifiers =====
    modifier onlyWhitelisted() {
        // Agent EOAがホワイトリストに入っているかチェック
        if (!whitelistedAgents[msg.sender]) revert AgentNotWhitelisted();
        _;
    }

    modifier onlySelf() {
        // User EOA自身からの呼び出しのみ許可（セットアップ用）
        // EIP-7702の自己実行: msg.sender == address(this)
        if (msg.sender != address(this)) revert OnlySelfAuth();
        _;
    }

    // ===== Constructor =====
    constructor(address _jpycToken, address _deploymentOwner) {
        if (_jpycToken == address(0)) revert ZeroAddress();
        if (_deploymentOwner == address(0)) revert ZeroAddress();

        jpycToken = IERC20(_jpycToken);
        deploymentOwner = _deploymentOwner;
    }

    // ===== ユーザー設定関数 =====
    /**
     * @notice このEOAの制限値をカスタマイズ
     * @dev onlySelf: User EOA自身のみ実行可能（セットアップ用）
     * @param _maxBid 1取引あたりの上限（0 = デフォルト使用）
     * @param _maxDaily 1日の上限（0 = デフォルト使用）
     */
    function setMyLimits(uint256 _maxBid, uint256 _maxDaily) external onlySelf {
        if (_maxBid > ABSOLUTE_MAX_BID) revert ExceedsAbsoluteLimit();
        if (_maxDaily > ABSOLUTE_MAX_DAILY) revert ExceedsAbsoluteLimit();

        maxBidAmount = _maxBid;
        maxDailySpend = _maxDaily;

        emit LimitsSet(_maxBid, _maxDaily);
    }

    /**
     * @notice このEOAの現在の制限を取得
     */
    function getMyLimits() public view returns (uint256 effectiveMaxBid, uint256 effectiveMaxDaily) {
        effectiveMaxBid = maxBidAmount > 0 ? maxBidAmount : DEFAULT_MAX_BID_AMOUNT;
        effectiveMaxDaily = maxDailySpend > 0 ? maxDailySpend : DEFAULT_MAX_DAILY_SPEND;
    }

    // ===== Main Function =====
    /**
     * @notice AIエージェントが通行権を購入
     * @dev EIP-7702により、address(this) = User EOA
     * @param seller 支払い先（売り手）
     * @param amount 支払い額（Wei単位）
     * @param locationId 通行権の場所ID
     */
    function bidForRightOfWay(
        address seller,
        uint256 amount,
        string calldata locationId
    ) external onlyWhitelisted nonReentrant {
        if (seller == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        // 制限値を取得
        (uint256 effectiveMaxBid, uint256 effectiveMaxDaily) = getMyLimits();

        // 日次リセットチェック
        if (block.timestamp >= lastResetTime + DAILY_RESET_PERIOD) {
            dailySpent = 0;
            lastResetTime = block.timestamp;
        }

        // 制限チェック
        if (amount > effectiveMaxBid) {
            revert BidExceedsMaximum(amount, effectiveMaxBid);
        }

        uint256 newTotal = dailySpent + amount;
        if (newTotal > effectiveMaxDaily) {
            uint256 remaining = effectiveMaxDaily - dailySpent;
            revert DailyLimitExceeded(amount, remaining);
        }

        // JPYC送金（このEOAから）
        bool success = jpycToken.transfer(seller, amount);
        if (!success) revert TransferFailed();

        // 使用額を記録
        dailySpent = newTotal;

        emit RightOfWayPurchased(address(this), seller, amount, block.timestamp, locationId);
    }

    // ===== Admin Functions =====
    /**
     * @notice AIエージェントをホワイトリストに追加/削除
     * @dev onlySelf: User EOA自身のみ実行可能（セキュリティ確保）
     *      EIP-7702の自己実行により、User EOAだけがエージェントを管理できる
     * @param agent AIエージェントのアドレス
     * @param status true=ホワイトリスト追加, false=削除
     */
    function whitelistAgent(address agent, bool status) external onlySelf {
        if (agent == address(0)) revert ZeroAddress();
        whitelistedAgents[agent] = status;
        emit AgentWhitelisted(agent, status);
    }

    // ===== ETH受け取り関数 =====
    /**
     * @notice ETH（ネイティブトークン）の受け取りを許可
     * @dev EIP-7702環境でUser EOAがFaucetからETHを受け取るために必須
     */
    receive() external payable {}

    // ===== View Functions =====
    /**
     * @notice このEOAの残り利用可能額を取得
     */
    function getMyRemainingLimit() external view returns (uint256) {
        (, uint256 effectiveMaxDaily) = getMyLimits();
        
        if (block.timestamp >= lastResetTime + DAILY_RESET_PERIOD) {
            return effectiveMaxDaily;
        }
        
        if (dailySpent >= effectiveMaxDaily) {
            return 0;
        }
        
        return effectiveMaxDaily - dailySpent;
    }

    /**
     * @notice 指定したアドレスの残り利用可能額を取得
     * @dev 外部から参照用（主にテスト用）
     */
    function getUserRemainingLimit(address user) external view returns (uint256) {
        // EIP-7702では各EOAが独立しているため、
        // このビューは参考値として提供（実際の値は各EOAのストレージにある）
        (, uint256 effectiveMaxDaily) = getMyLimits();
        
        if (block.timestamp >= lastResetTime + DAILY_RESET_PERIOD) {
            return effectiveMaxDaily;
        }
        
        if (dailySpent >= effectiveMaxDaily) {
            return 0;
        }
        
        return effectiveMaxDaily - dailySpent;
    }
}
