// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockJPYC
 * @notice テスト用JPYC ERC20トークン（Avalanche Fuji Testnet用）
 * @dev 実際のJPYCがFujiにデプロイされていないため、デモ用に使用
 */
contract MockJPYC is ERC20, Ownable {
    uint8 private constant DECIMALS = 18;
    uint256 private constant INITIAL_SUPPLY = 1_000_000 * 10**DECIMALS; // 1M JPYC

    /**
     * @notice コンストラクタ - 初期供給をデプロイヤーにMint
     */
    constructor() ERC20("Mock JPYC", "JPYC") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @notice テスト用Mint機能（オーナーのみ）
     * @param to Mint先アドレス
     * @param amount Mint量
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Decimals上書き
     * @return uint8 18（JPYCの標準）
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice テスト用Burn機能（誰でも自分のトークンをBurn可能）
     * @param amount Burn量
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}

