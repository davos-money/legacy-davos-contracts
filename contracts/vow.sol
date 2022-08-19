// SPDX-License-Identifier: AGPL-3.0-or-later

/// vow.sol -- Sikka settlement module

// Copyright (C) 2018 Rain <rainbreak@riseup.net>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "./interfaces/VatLike.sol";
import "./interfaces/SikkaJoinLike.sol";

contract Vow is Initializable{
    // --- Auth ---
    mapping (address => uint) public wards;
    function rely(address usr) external auth { require(live == 1, "Vow/not-live"); wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth {
        require(wards[msg.sender] == 1, "Vow/not-authorized");
        _;
    }

    // --- Data ---
    VatLike public vat;          // CDP Engine
    address public multisig;     // Surplus multisig 

    address public sikkaJoin; // Stablecoin address
    uint256 public hump;    // Surplus buffer      [rad]

    uint256 public live;  // Active Flag

    address public sikka;  // Sikka token

    // --- Init ---
    function initialize(address vat_, address _sikkaJoin, address multisig_) external initializer {
        wards[msg.sender] = 1;
        vat = VatLike(vat_);
        sikkaJoin = _sikkaJoin;
        multisig = multisig_;
        vat.hope(sikkaJoin);
        live = 1;
    }

    // --- Math ---
    function min(uint x, uint y) internal pure returns (uint z) {
        return x <= y ? x : y;
    }

    // --- Administration ---
    function file(bytes32 what, uint data) external auth {
        if (what == "hump") hump = data;
        else revert("Vow/file-unrecognized-param");
    }
    function file(bytes32 what, address data) external auth {
        if (what == "multisig") multisig = data;
        else if (what == "sikkajoin") { 
            vat.nope(sikkaJoin);
            sikkaJoin = data;
            vat.hope(sikkaJoin);
        }
        else if (what == "sikka") sikka = data;
        else if (what == "vat") vat = VatLike(data);
        else revert("Vow/file-unrecognized-param");
    }

    // Debt settlement
    function heal(uint rad) external {
        require(rad <= vat.sikka(address(this)), "Vow/insufficient-surplus");
        require(rad <= vat.sin(address(this)), "Vow/insufficient-debt");
        vat.heal(rad);
    }

    // Feed stablecoin to vow
    function feed(uint wad) external {
        IERC20Upgradeable(sikka).transferFrom(msg.sender, address(this), wad);
        IERC20Upgradeable(sikka).approve(sikkaJoin, wad);
        SikkaJoinLike(sikkaJoin).join(address(this), wad);
    }
    // Send surplus to multisig
    function flap() external {
        require(vat.sikka(address(this)) >= vat.sin(address(this)) + hump, "Vow/insufficient-surplus");
        uint rad = vat.sikka(address(this)) - (vat.sin(address(this)) + hump);
        uint wad = rad / 1e27;
        SikkaJoinLike(sikkaJoin).exit(multisig, wad);
    }

    function cage() external auth {
        require(live == 1, "Vow/not-live");
        live = 0;
        vat.heal(min(vat.sikka(address(this)), vat.sin(address(this))));
    }
}