// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract MaticOracleV2 is Initializable {
    AggregatorV3Interface priceFeed;
    IPyth pyth;

    bytes32 pythPriceID;
    uint256 threshold; // 2mins
    bool isUpgradedForV2;

    function initialize(address aggregatorAddress) external initializer {
        priceFeed = AggregatorV3Interface(aggregatorAddress);
    }

    function upgradeToV2(
        address _chainlinkAggregatorAddress,
        address _pythAddress,
        bytes32 _priceId,
        uint256 _threshold
    ) external {
        require(!isUpgradedForV2, "MaticOracleV2/already-upgraded");
        isUpgradedForV2 = true;
        priceFeed = AggregatorV3Interface(_chainlinkAggregatorAddress);
        pyth = IPyth(_pythAddress);
        pythPriceID = _priceId;
        threshold = _threshold;
    }

    /**
     * Returns the latest price
     */
    function peek() public view returns (bytes32, bool) {
        // Chainlink
        (
            /*uint80 roundID*/,
            int256 price,
            /*uint startedAt*/,
            uint256 timeStamp,
            /*uint80 answeredInRound*/
        ) = priceFeed.latestRoundData();

        if (block.timestamp - timeStamp <= threshold && price >= 0) {
            return (bytes32(uint256(price) * (10**10)), true);
        }

        // Pyth
        PythStructs.Price memory pythPrice = pyth.getPrice(pythPriceID);

        if (pythPrice.price < 0) {
            return (0, false);
        }
        return (bytes32(uint64(pythPrice.price) * (10**uint32(pythPrice.expo + 18))), true);
    }

    function updatePriceFeeds(bytes[] calldata priceUpdateData)
        external
        payable
    {
        uint256 fee = pyth.getUpdateFee(priceUpdateData);
        pyth.updatePriceFeeds{value: fee}(priceUpdateData);
    }
}