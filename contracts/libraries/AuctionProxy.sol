// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "../interfaces/ClipperLike.sol";
import "../interfaces/GemJoinLike.sol";
import "../interfaces/SikkaGemLike.sol";
import "../interfaces/SikkaLike.sol";
import "../interfaces/DogLike.sol";
import "../interfaces/VatLike.sol";
import "../ceros/interfaces/IIkkaProvider.sol";

import { CollateralType } from  "../ceros/interfaces/IDao.sol";

uint256 constant RAY = 10**27;

library AuctionProxy {
  using SafeERC20Upgradeable for IERC20Upgradeable;
  using SafeERC20Upgradeable for GemLike;

  function startAuction(
    address user,
    address keeper,
    SikkaLike sikka,
    SikkaGemLike sikkaJoin,
    VatLike vat,
    DogLike dog,
    IIkkaProvider ikkaProvider,
    CollateralType calldata collateral
  ) public returns (uint256 id) {
    uint256 sikkaBal = sikka.balanceOf(address(this));
    id = dog.bark(collateral.ilk, user, address(this));

    sikkaJoin.exit(address(this), vat.sikka(address(this)) / RAY);
    sikkaBal = sikka.balanceOf(address(this)) - sikkaBal;
    sikka.transfer(keeper, sikkaBal);

    // Burn any derivative token (hMATIC incase of ceaMATICc collateral)
    if (address(ikkaProvider) != address(0)) {
      ikkaProvider.daoBurn(user, ClipperLike(collateral.clip).sales(id).lot);
    }
  }

  function resetAuction(
    uint auctionId,
    address keeper,
    SikkaLike sikka,
    SikkaGemLike sikkaJoin,
    VatLike vat,
    CollateralType calldata collateral
  ) public {
    uint256 sikkaBal = sikka.balanceOf(address(this));
    ClipperLike(collateral.clip).redo(auctionId, keeper);
    

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
    SikkaGemLike sikkaJoin,
    VatLike vat,
    IIkkaProvider ikkaProvider,
    CollateralType calldata collateral
  ) public {
    // Balances before
    uint256 sikkaBal = sikka.balanceOf(address(this));
    uint256 gemBal = collateral.gem.gem().balanceOf(address(this));

    uint256 sikkaMaxAmount = (maxPrice * collateralAmount) / RAY;

    sikka.transferFrom(msg.sender, address(this), sikkaMaxAmount);
    sikkaJoin.join(address(this), sikkaMaxAmount);

    vat.hope(address(collateral.clip));
    address urn = ClipperLike(collateral.clip).sales(auctionId).usr; // Liquidated address

    uint256 leftover = vat.gem(collateral.ilk, urn); // userGemBalanceBefore
    ClipperLike(collateral.clip).take(auctionId, collateralAmount, maxPrice, address(this), "");
    leftover = vat.gem(collateral.ilk, urn) - leftover; // leftover

    collateral.gem.exit(address(this), vat.gem(collateral.ilk, address(this)));
    sikkaJoin.exit(address(this), vat.sikka(address(this)) / RAY);

    // Balances rest
    sikkaBal = sikka.balanceOf(address(this)) - sikkaBal;
    gemBal = collateral.gem.gem().balanceOf(address(this)) - gemBal;
    sikka.transfer(receiverAddress, sikkaBal);

    if (address(ikkaProvider) != address(0)) {
      IERC20Upgradeable(collateral.gem.gem()).safeTransfer(address(ikkaProvider), gemBal);
      ikkaProvider.liquidation(receiverAddress, gemBal); // Burn router ceToken and mint amaticc to receiver

      // TODO: emit in the Interaction. Return liquidated amount from here
      // // liquidated user, collateral address, amount of collateral bought, price
      // emit Liquidation(urn, address(collateral.gem.gem()), gemBal, maxPrice);

      if (leftover != 0) {
        // Auction ended with leftover
        vat.flux(collateral.ilk, urn, address(this), leftover);
        collateral.gem.exit(address(ikkaProvider), leftover); // Router (disc) gets the remaining ceamaticc
        ikkaProvider.liquidation(urn, leftover); // Router burns them and gives amaticc remaining
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