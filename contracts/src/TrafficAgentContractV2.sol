// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrafficAgentContractV2
 * @notice EIP-7702準拠：ユーザーごとの独立した状態管理 + カスタマイズ可能な制限
 * 
 * 改善点:
 * - ユーザーごとのdailySpent管理（独立）
 * - ユーザーが自分の制限をカスタマイズ可能
 * - 1つのコードを全員が共有
 */
contract TrafficAgentContractV2 is ReentrancyGuard {
    // ===== デフォルト制限値 =====
    uint256 public constant DEFAULT_MAX_BID_AMOUNT = 500 * 10**18;
    uint256 public constant DEFAULT_MAX_DAILY_SPEND = 5000 * 10**18;
    uint256 public constant DAILY_RESET_PERIOD = 1 days;
    
    // 絶対上限（カスタマイズでもこれを超えられない）
    uint256 public constant ABSOLUTE_MAX_BID = 10000 * 10**18;
    uint256 public constant ABSOLUTE_MAX_DAILY = 50000 * 10**18;

    // ===== Immutables =====
    IERC20 public immutable jpycToken;
    address public immutable owner;

    // ===== ユーザーごとの設定（カスタマイズ可能） =====
    mapping(address => uint256) public userMaxBidAmount;
    mapping(address => uint256) public userMaxDailySpend;

    // ===== ユーザーごとの使用状況（独立） =====
    mapping(address => uint256) public userDailySpent;
    mapping(address => uint256) public userLastResetTime;

    // ===== State Variables =====
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
    event UserLimitsSet(address indexed user, uint256 maxBid, uint256 maxDaily);

    // ===== Errors =====
    error NotOwner();
    error AgentNotWhitelisted();
    error BidExceedsMaximum(uint256 bid, uint256 maximum);
    error DailyLimitExceeded(uint256 requested, uint256 remaining);
    error ExceedsAbsoluteLimit();
    error ZeroAddress();
    error ZeroAmount();
    error TransferFailed();

    // ===== Modifiers =====
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyWhitelisted() {
        if (!whitelistedAgents[msg.sender]) revert AgentNotWhitelisted();
        _;
    }

    // ===== Constructor =====
    constructor(address _jpycToken, address _owner) {
        if (_jpycToken == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();

        jpycToken = IERC20(_jpycToken);
        owner = _owner;
    }

    // ===== ユーザー設定関数 =====
    /**
     * @notice ユーザーが自分の制限をカスタマイズ
     * @param maxBid 1取引あたりの上限
     * @param maxDaily 1日の上限
     */
    function setMyLimits(uint256 maxBid, uint256 maxDaily) external {
        if (maxBid > ABSOLUTE_MAX_BID) revert ExceedsAbsoluteLimit();
        if (maxDaily > ABSOLUTE_MAX_DAILY) revert ExceedsAbsoluteLimit();

        userMaxBidAmount[msg.sender] = maxBid;
        userMaxDailySpend[msg.sender] = maxDaily;

        emit UserLimitsSet(msg.sender, maxBid, maxDaily);
    }

    /**
     * @notice ユーザーの現在の制限を取得（カスタムまたはデフォルト）
     */
    function getUserLimits(address user) public view returns (uint256 maxBid, uint256 maxDaily) {
        maxBid = userMaxBidAmount[user] > 0 ? userMaxBidAmount[user] : DEFAULT_MAX_BID_AMOUNT;
        maxDaily = userMaxDailySpend[user] > 0 ? userMaxDailySpend[user] : DEFAULT_MAX_DAILY_SPEND;
    }

    // ===== Main Function =====
    /**
     * @notice AIエージェントが通行権を購入
     * @dev EIP-7702により、address(this) = User EOA
     */
    function bidForRightOfWay(
        address seller,
        uint256 amount,
        string calldata locationId
    ) external onlyWhitelisted nonReentrant {
        if (seller == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        // EIP-7702: address(this) = User EOA
        address user = address(this);

        // ユーザーの制限を取得
        (uint256 maxBid, uint256 maxDaily) = getUserLimits(user);

        // 日次リセットチェック
        if (block.timestamp >= userLastResetTime[user] + DAILY_RESET_PERIOD) {
            userDailySpent[user] = 0;
            userLastResetTime[user] = block.timestamp;
        }

        // ユーザーごとの制限チェック
        if (amount > maxBid) {
            revert BidExceedsMaximum(amount, maxBid);
        }

        uint256 newTotal = userDailySpent[user] + amount;
        if (newTotal > maxDaily) {
            uint256 remaining = maxDaily - userDailySpent[user];
            revert DailyLimitExceeded(amount, remaining);
        }

        // JPYC送金（User EOAから）
        bool success = jpycToken.transfer(seller, amount);
        if (!success) revert TransferFailed();

        // ユーザーの使用額を記録
        userDailySpent[user] += amount;

        emit RightOfWayPurchased(user, seller, amount, block.timestamp, locationId);
    }

    // ===== Admin Functions =====
    function whitelistAgent(address agent, bool status) external onlyOwner {
        if (agent == address(0)) revert ZeroAddress();
        whitelistedAgents[agent] = status;
        emit AgentWhitelisted(agent, status);
    }

    // ===== View Functions =====
    function getUserRemainingLimit(address user) external view returns (uint256) {
        (, uint256 maxDaily) = getUserLimits(user);
        
        if (block.timestamp >= userLastResetTime[user] + DAILY_RESET_PERIOD) {
            return maxDaily;
        }
        
        if (userDailySpent[user] >= maxDaily) {
            return 0;
        }
        
        return maxDaily - userDailySpent[user];
    }
}

