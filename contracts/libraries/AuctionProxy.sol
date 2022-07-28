// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "../interfaces/ClipperLike.sol";
import "../interfaces/GemJoinLike.sol";
import "../interfaces/SikkaJoinLike.sol";
import "../interfaces/SikkaLike.sol";
import "../interfaces/DogLike.sol";
import "../interfaces/VatLike.sol";
import "../ceros/interfaces/ISikkaProvider.sol";
import "../oracle/libraries/FullMath.sol";

import { CollateralType } from  "../ceros/interfaces/IDao.sol";

uint256 constant RAY = 10**27;

library AuctionProxy {
  using SafeERC20Upgradeable for IERC20Upgradeable;
  using SafeERC20Upgradeable for GemLike;

  function startAuction(
    address user,
    address keeper,
    SikkaLike sikka,
    SikkaJoinLike sikkaJoin,
    VatLike vat,
    DogLike dog,
    ISikkaProvider sikkaProvider,
    CollateralType calldata collateral
  ) public returns (uint256 id) {
    ClipperLike _clip = ClipperLike(collateral.clip);
    _clip.upchost();
    uint256 sikkaBal = sikka.balanceOf(address(this));
    id = dog.bark(collateral.ilk, user, address(this));

    sikkaJoin.exit(address(this), vat.sikka(address(this)) / RAY);
    sikkaBal = sikka.balanceOf(address(this)) - sikkaBal;
    sikka.transfer(keeper, sikkaBal);

    // Burn any derivative token (hMATIC incase of ceaMATICc collateral)
    if (address(sikkaProvider) != address(0)) {
      sikkaProvider.daoBurn(user, ClipperLike(collateral.clip).sales(id).lot);
    }
  }

  function resetAuction(
    uint auctionId,
    address keeper,
    SikkaLike sikka,
    SikkaJoinLike sikkaJoin,
    VatLike vat,
    CollateralType calldata collateral
  ) public {
    ClipperLike _clip = ClipperLike(collateral.clip);
    uint256 sikkaBal = sikka.balanceOf(address(this));
    _clip.redo(auctionId, keeper);


    sikkaJoin.exit(address(this), vat.sikka(address(this)) / RAY);
    sikkaBal = sikka.balanceOf(address(this)) - sikkaBal;
    sikka.transfer(keeper, sikkaBal);
  }

  function buyFromAuction(
    uint256 auctionId,
    uint256 collateralAmount,
    uint256 maxPrice,
    address receiverAddress,
    SikkaLike sikka,
    SikkaJoinLike sikkaJoin,
    VatLike vat,
    ISikkaProvider sikkaProvider,
    CollateralType calldata collateral
  ) public returns (uint256 leftover) {
    // Balances before
    uint256 sikkaBal = sikka.balanceOf(address(this));
    uint256 gemBal = collateral.gem.gem().balanceOf(address(this));

    uint256 sikkaMaxAmount = FullMath.mulDiv(maxPrice, collateralAmount, RAY) + 1;

    sikka.transferFrom(msg.sender, address(this), sikkaMaxAmount);
    sikkaJoin.join(address(this), sikkaMaxAmount);

    vat.hope(address(collateral.clip));
    address urn = ClipperLike(collateral.clip).sales(auctionId).usr; // Liquidated address

    leftover = vat.gem(collateral.ilk, urn); // userGemBalanceBefore
    ClipperLike(collateral.clip).take(auctionId, collateralAmount, maxPrice, address(this), "");
    leftover = vat.gem(collateral.ilk, urn) - leftover; // leftover

    collateral.gem.exit(address(this), vat.gem(collateral.ilk, address(this)));
    sikkaJoin.exit(address(this), vat.sikka(address(this)) / RAY);

    // Balances rest
    sikkaBal = sikka.balanceOf(address(this)) - sikkaBal;
    gemBal = collateral.gem.gem().balanceOf(address(this)) - gemBal;
    sikka.transfer(receiverAddress, sikkaBal);

    vat.nope(address(collateral.clip));

    if (address(sikkaProvider) != address(0)) {
      IERC20Upgradeable(collateral.gem.gem()).safeTransfer(address(sikkaProvider), gemBal);
      sikkaProvider.liquidation(receiverAddress, gemBal); // Burn router ceToken and mint amaticc to receiver

      if (leftover != 0) {
        // Auction ended with leftover
        vat.flux(collateral.ilk, urn, address(this), leftover);
        collateral.gem.exit(address(sikkaProvider), leftover); // Router (disc) gets the remaining ceamaticc
        sikkaProvider.liquidation(urn, leftover); // Router burns them and gives amaticc remaining
      }
    } else {
      IERC20Upgradeable(collateral.gem.gem()).safeTransfer(receiverAddress, gemBal);
    }
  }

  function getAllActiveAuctionsForClip(ClipperLike clip)
    external
    view
    returns (Sale[] memory sales)
  {
    uint256[] memory auctionIds = clip.list();
    uint256 auctionsCount = auctionIds.length;
    sales = new Sale[](auctionsCount);
    for (uint256 i = 0; i < auctionsCount; i++) {
      sales[i] = clip.sales(auctionIds[i]);
    }
  }
}
