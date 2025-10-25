// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPythSimple
 * @notice Simplified Pyth oracle interface
 */
interface IPythSimple {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }

    function updatePriceFeeds(bytes[] calldata priceUpdateData) external payable;

    function getUpdateFee(bytes[] calldata updateData) external view returns (uint256 feeAmount);

    function getPriceNoOlderThan(bytes32 id, uint256 age) external view returns (Price memory price);

    function getPriceUnsafe(bytes32 id) external view returns (Price memory price);

    function getEmaPriceUnsafe(bytes32 id) external view returns (Price memory price);

    function getEmaPriceNoOlderThan(bytes32 id, uint256 age) external view returns (Price memory price);

    function getValidTimePeriod() external view returns (uint256 validTimePeriod);
}

/**
 * @title SimpleMockPyth
 * @notice Simple mock Pyth oracle
 */
contract SimpleMockPyth is IPythSimple {
    mapping(bytes32 => Price) private prices;
    uint256 private updateFee = 0.0001 ether;

    // Pyth Price Feed IDs
    bytes32 public constant ETH_USD = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    bytes32 public constant BTC_USD = 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43;
    bytes32 public constant SOL_USD = 0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d;

    event PriceUpdated(bytes32 indexed id, int64 price, uint64 conf);

    constructor() {
        // ETH/USD: $2,500.00
        prices[ETH_USD] = Price({price: 250000000000, conf: 200000000, expo: -8, publishTime: block.timestamp});

        // BTC/USD: $61,400.00
        prices[BTC_USD] = Price({price: 6140000000000, conf: 5000000000, expo: -8, publishTime: block.timestamp});

        // SOL/USD: $150.00
        prices[SOL_USD] = Price({price: 15000000000, conf: 100000000, expo: -8, publishTime: block.timestamp});
    }

    function updatePriceFeeds(bytes[] calldata) external payable override {
        require(msg.value >= updateFee, "Insufficient fee");
        // Update timestamps
        prices[ETH_USD].publishTime = block.timestamp;
        prices[BTC_USD].publishTime = block.timestamp;
        prices[SOL_USD].publishTime = block.timestamp;
    }

    function getUpdateFee(bytes[] calldata) external view override returns (uint256) {
        return updateFee;
    }

    function getPriceNoOlderThan(bytes32 id, uint256 age) external view override returns (Price memory price) {
        price = prices[id];
        require(price.publishTime != 0, "Price not found");
        require(block.timestamp - price.publishTime <= age, "Price too old");
        return price;
    }

    function getPriceUnsafe(bytes32 id) external view override returns (Price memory price) {
        price = prices[id];
        require(price.publishTime != 0, "Price not found");
        return price;
    }

    function getEmaPriceUnsafe(bytes32 id) external view override returns (Price memory price) {
        return prices[id];
    }

    function getEmaPriceNoOlderThan(bytes32 id, uint256 age) external view override returns (Price memory price) {
        return this.getPriceNoOlderThan(id, age);
    }

    function getValidTimePeriod() external pure override returns (uint256) {
        return 60;
    }

    function setPrice(bytes32 id, int64 price, uint64 conf) external {
        prices[id].price = price;
        prices[id].conf = conf;
        prices[id].publishTime = block.timestamp;
        emit PriceUpdated(id, price, conf);
    }
}
