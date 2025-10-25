// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../mocks/SimpleMockPyth.sol";

/**
 * @title PythTradingAgent
 * @notice AI-powered trading agent that uses Pyth price feeds for market analysis
 * @dev This demonstrates integration with Pyth Network for the ETHGlobal hackathon
 */
contract PythTradingAgent {
    IPythSimple public immutable pyth;

    // Pyth Price Feed IDs (https://docs.pyth.network/price-feeds/price-feed-ids)
    bytes32 public constant ETH_USD = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    bytes32 public constant BTC_USD = 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43;
    bytes32 public constant SOL_USD = 0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d;
    bytes32 public constant USDC_USD = 0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a;
    bytes32 public constant USDT_USD = 0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b;

    struct MarketData {
        int64 ethPrice;
        int64 btcPrice;
        int64 solPrice;
        uint64 ethConf;
        uint64 btcConf;
        uint64 solConf;
        uint256 timestamp;
    }

    event MarketDataFetched(uint256 indexed executionId, address indexed executor, MarketData data);

    event TradeAnalysisRequested(uint256 indexed executionId, address indexed executor, bytes32[] priceFeedIds);

    uint256 private _executionCounter;

    constructor(address _pyth) {
        require(_pyth != address(0), "Invalid Pyth address");
        pyth = IPythSimple(_pyth);
    }

    /**
     * @notice Execute trading analysis with live Pyth prices
     * @param priceUpdate Price update data from Hermes API
     * @return executionId Unique ID for this execution
     * @return data Market data fetched from Pyth
     */
    function executeAnalysis(bytes[] calldata priceUpdate)
        external
        payable
        returns (uint256 executionId, MarketData memory data)
    {
        executionId = ++_executionCounter;

        // 1. Update Pyth prices on-chain
        uint256 updateFee = pyth.getUpdateFee(priceUpdate);
        require(msg.value >= updateFee, "Insufficient update fee");
        pyth.updatePriceFeeds{value: updateFee}(priceUpdate);

        // 2. Fetch current prices (max 60 seconds old)
        IPythSimple.Price memory ethPriceData = pyth.getPriceNoOlderThan(ETH_USD, 60);
        IPythSimple.Price memory btcPriceData = pyth.getPriceNoOlderThan(BTC_USD, 60);
        IPythSimple.Price memory solPriceData = pyth.getPriceNoOlderThan(SOL_USD, 60);

        // 3. Package data for AI processing
        data = MarketData({
            ethPrice: ethPriceData.price,
            btcPrice: btcPriceData.price,
            solPrice: solPriceData.price,
            ethConf: ethPriceData.conf,
            btcConf: btcPriceData.conf,
            solConf: solPriceData.conf,
            timestamp: block.timestamp
        });

        // 4. Emit events for backend AI processing
        bytes32[] memory feedIds = new bytes32[](3);
        feedIds[0] = ETH_USD;
        feedIds[1] = BTC_USD;
        feedIds[2] = SOL_USD;

        emit TradeAnalysisRequested(executionId, msg.sender, feedIds);
        emit MarketDataFetched(executionId, msg.sender, data);

        // 5. Refund excess ETH
        if (msg.value > updateFee) {
            payable(msg.sender).transfer(msg.value - updateFee);
        }

        return (executionId, data);
    }

    /**
     * @notice Get current price for a specific feed (view function)
     * @param priceFeedId Pyth price feed ID
     * @return price Current price
     * @return conf Confidence interval
     * @return expo Price exponent
     * @return publishTime Last publish timestamp
     */
    function getCurrentPrice(bytes32 priceFeedId)
        external
        view
        returns (int64 price, uint64 conf, int32 expo, uint256 publishTime)
    {
        IPythSimple.Price memory priceData = pyth.getPriceUnsafe(priceFeedId);
        return (priceData.price, priceData.conf, priceData.expo, priceData.publishTime);
    }

    /**
     * @notice Get formatted price as human-readable value
     * @param priceFeedId Pyth price feed ID
     * @return formattedPrice Price formatted with decimals applied
     */
    function getFormattedPrice(bytes32 priceFeedId) external view returns (int256 formattedPrice) {
        IPythSimple.Price memory priceData = pyth.getPriceUnsafe(priceFeedId);
        // Apply exponent to get actual price
        // Example: price = 250000000000, expo = -8 => actual price = 2500.00
        formattedPrice = int256(priceData.price);
    }

    /**
     * @notice Get execution counter
     */
    function getExecutionCount() external view returns (uint256) {
        return _executionCounter;
    }
}
