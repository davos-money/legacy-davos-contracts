const chai = require("chai");
const { describe, it, before } = require("mocha");
const { ethers, network } = require("hardhat");
const hre = require("hardhat");
const {ether} = require("@openzeppelin/test-helpers");
const BigNumber = ethers.BigNumber;
const toBytes32 = ethers.utils.formatBytes32String;
const { toWad, toRay, toRad } = require("../helpers/utils");
const { expect } = require("chai");

describe("===Colander===", () => {

    // Global Variables
    let deployer, 
        signer1, 
        signer2, 
        signer3, 
        multisig;

    let abacus,
        vat,
        spot,
        sikka,
        amaticc,
        amaticcJoin,
        sikkaJoin,
        jug,
        oracle,
        ikkaRewardsOracle,
        clip,
        dog,
        vow,
        interaction,
        colander,
        positionManager;
    
    let collateral = toBytes32("aMATICc");

    let dex = "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        nonfungiblePositionManager = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"; // V3

    let comparator;

  beforeEach("setup", async () => {

    [deployer, signer1, signer2, signer3, multisig] = await ethers.getSigners();

    await network.provider.request({
        method: "hardhat_reset",
        params: [
          {
            forking: {
              jsonRpcUrl: "https://polygon-mumbai.g.alchemy.com/v2/1GHcSgGKjwi41E-mWkC_WaVood0AsXFV",
              blockNumber: 27461189, // MATIC == 0.9118 $
            },
          },
        ],
    });

    // Contracts Fetching
    const Vat = await ethers.getContractFactory("Vat");
    const Spot = await ethers.getContractFactory("Spotter");
    const Sikka = await ethers.getContractFactory("Sikka");
    const AMATICC = await ethers.getContractFactory("aMATICc");
    const GemJoin = await ethers.getContractFactory("GemJoin");
    const SikkaJoin = await ethers.getContractFactory("SikkaJoin");
    const Jug = await ethers.getContractFactory("Jug");
    const Oracle = await ethers.getContractFactory("Oracle");
    const Dog = await ethers.getContractFactory("Dog");
    const Clipper = await ethers.getContractFactory("Clipper");
    const LinearDecrease = await ethers.getContractFactory("LinearDecrease");
    const Vow = await ethers.getContractFactory("Vow");
    const IkkaToken = await ethers.getContractFactory("IkkaToken");
    const IkkaRewards = await ethers.getContractFactory("IkkaRewards");
    this.AuctionProxy = await ethers.getContractFactory("AuctionProxy");
    auctionProxy = await this.AuctionProxy.connect(deployer).deploy();
    await auctionProxy.deployed();
    const Interaction = await hre.ethers.getContractFactory("Interaction", {
        unsafeAllow: ['external-library-linking'],
        libraries: {
            AuctionProxy: auctionProxy.address
        },
    });
    const Colander = await ethers.getContractFactory("Colander");
    const ColanderRewards = await ethers.getContractFactory("ColanderRewards");
    positionManager = await ethers.getContractAt("multicalls", nonfungiblePositionManager);
    
    // Contracts Deployment
    abacus = await upgrades.deployProxy(LinearDecrease, [], 
    { initializer: "initialize"});

    vat = await upgrades.deployProxy(Vat, [], 
    { initializer: "initialize"});

    spot = await upgrades.deployProxy(Spot, [vat.address], 
    { initializer: "initialize"});

    rewards = await upgrades.deployProxy(IkkaRewards, [vat.address, ether("100000000").toString()], 
    { initializer: "initialize"});

    ikkaToken = await upgrades.deployProxy(IkkaToken, [ether("100000000").toString(), rewards.address], 
    { initializer: "initialize"});

    sikka = await upgrades.deployProxy(Sikka, [80001, "SIKKA"], 
    { initializer: "initialize"});

    sikkaJoin = await upgrades.deployProxy(SikkaJoin, [vat.address, sikka.address], 
    { initializer: "initialize"});

    amaticc = await AMATICC.deploy();
    await amaticc.deployed();

    amaticcJoin = await upgrades.deployProxy(GemJoin, [vat.address, collateral, amaticc.address], 
    { initializer: "initialize"});

    jug = await upgrades.deployProxy(Jug, [vat.address], 
    { initializer: "initialize"});

    oracle = await Oracle.deploy();
    await oracle.deployed();

    ikkaRewardsOracle = await Oracle.deploy();
    await ikkaRewardsOracle.deployed();

    dog = await upgrades.deployProxy(Dog, [vat.address], 
    { initializer: "initialize"});

    clip = await upgrades.deployProxy(Clipper, [vat.address, spot.address, dog.address, collateral], 
    { initializer: "initialize"});

    vow = await upgrades.deployProxy(Vow, [vat.address, sikkaJoin.address, multisig.address], 
    { initializer: "initialize"});

    interaction = await upgrades.deployProxy(Interaction, [vat.address, spot.address, sikka.address, sikkaJoin.address, jug.address, dog.address, rewards.address], 
    { initializer: "initialize", unsafeAllowLinkedLibraries: true, });

    colanderRewards = await ColanderRewards.deploy();
    await colanderRewards.deployed();

    colander = await upgrades.deployProxy(Colander, ["Stability Pool Derivative", "stabilitySIKKA", sikka.address, interaction.address, spot.address, dex, colanderRewards.address, "10"], 
    { initializer: "initialize"});

    // Initialization
    await rewards.connect(deployer).setIkkaToken(ikkaToken.address);
    await rewards.initPool(amaticc.address, collateral, "1000000001847694957439350500"); //6%

    await rewards.connect(deployer).setOracle(ikkaRewardsOracle.address);

    await ikkaToken.rely(rewards.address);

    await abacus.connect(deployer).file(toBytes32("tau"), "1800");

    await oracle.connect(deployer).setPrice(toWad("0.9118")); // 0.72944 = 80%

    await ikkaRewardsOracle.connect(deployer).setPrice(toWad("1"));

    await vat.connect(deployer).rely(sikkaJoin.address);
    await vat.connect(deployer).rely(spot.address);
    await vat.connect(deployer).rely(jug.address);
    await vat.connect(deployer).rely(interaction.address);
    await vat.connect(deployer).rely(dog.address);
    await vat.connect(deployer).rely(clip.address);
    await vat.connect(deployer)["file(bytes32,uint256)"](toBytes32("Line"), toRad("20000")); // Normalized SIKKA
    await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, toBytes32("line"), toRad("20000"));
    await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, toBytes32("dust"), toRad("1"));

    await spot.connect(deployer).rely(interaction.address);
    await spot.connect(deployer)["file(bytes32,bytes32,address)"](collateral, toBytes32("pip"), oracle.address);
    await spot.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, toBytes32("mat"), "1250000000000000000000000000"); // Liquidation Ratio
    await spot.connect(deployer)["file(bytes32,uint256)"](toBytes32("par"), toRay("1")); // It means pegged to 1$
    await spot.connect(deployer).poke(collateral);

    await sikka.connect(deployer).rely(sikkaJoin.address);

    await dog.connect(deployer).rely(interaction.address);
    await dog.connect(deployer).rely(clip.address);
    await dog.connect(deployer)["file(bytes32,address)"](toBytes32("vow"), vow.address);    
    await dog.connect(deployer)["file(bytes32,uint256)"](toBytes32("Hole"), toRad("10000000"));
    await dog.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, toBytes32("chop"), toWad("1.13"));
    await dog.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, toBytes32("hole"), toRad("10000000"));
    await dog.connect(deployer)["file(bytes32,bytes32,address)"](collateral, toBytes32("clip"), clip.address);

    await clip.connect(deployer).rely(dog.address);
    await clip.connect(deployer).rely(interaction.address);
    await clip.connect(deployer)["file(bytes32,uint256)"](toBytes32("buf"), toRay("1.2"));
    await clip.connect(deployer)["file(bytes32,uint256)"](toBytes32("tail"), "1800");
    await clip.connect(deployer)["file(bytes32,uint256)"](toBytes32("cusp"), toRay("0.3"));
    await clip.connect(deployer)["file(bytes32,uint256)"](toBytes32("chip"), toWad("0.02"));
    await clip.connect(deployer)["file(bytes32,uint256)"](toBytes32("tip"), toRad("100"));
    await clip.connect(deployer)["file(bytes32,address)"](toBytes32("vow"), vow.address);
    await clip.connect(deployer)["file(bytes32,address)"](toBytes32("calc"), abacus.address);

    await vow.connect(deployer).rely(dog.address);

    const BR = new BigNumber.from("1000000003022266000000000000");
    await jug.connect(deployer)["file(bytes32,uint256)"](toBytes32("base"), BR); // 1% Yearly

    const proxyLike = await (await (await ethers.getContractFactory("ProxyLike")).connect(deployer).deploy(jug.address, vat.address)).deployed();
    await jug.connect(deployer).rely(proxyLike.address);
    await proxyLike.connect(deployer).jugInitFile(collateral, toBytes32("duty"), "0");

    await jug.connect(deployer).rely(interaction.address);
    await jug.connect(deployer)["file(bytes32,address)"](toBytes32("vow"), vow.address);

    await sikkaJoin.connect(deployer).rely(interaction.address);

    await amaticcJoin.connect(deployer).rely(interaction.address);

    await interaction.connect(deployer).setCollateralType(amaticc.address, amaticcJoin.address, collateral, clip.address, "1250000000000000000000000000");

    await colander.connect(deployer).setProfitRange(toRay("0.05")); // 5% acceptable minimum profit range
    await colander.connect(deployer).setPriceImpact(toWad("0.02")); // 2% acceptable price impact from DEX

    await colanderRewards.connect(deployer).initialize(sikka.address, colander.address, "3600", "5");
    await colanderRewards.connect(deployer).rely(colander.address);
  });

  it("Colander Purchase", async () => {
    // Mint collateral tokens to users
    await amaticc.connect(deployer).mint(deployer.address, toWad("20000"));
    await amaticc.connect(deployer).mint(signer1.address, toWad("400"));
    await amaticc.connect(deployer).mint(signer2.address, toWad("800"));
    await amaticc.connect(deployer).mint(signer3.address, toWad("1200"));

    await amaticc.connect(deployer).approve(interaction.address, toWad("10000"));
    await amaticc.connect(signer1).approve(interaction.address, toWad("400"));
    await amaticc.connect(signer2).approve(interaction.address, toWad("800"));
    await amaticc.connect(signer3).approve(interaction.address, toWad("1200"));

    // Deposit collateral to Sikka
    await interaction.connect(deployer).deposit(deployer.address, amaticc.address, toWad("10000"));
    await interaction.connect(signer1).deposit(signer1.address, amaticc.address, toWad("400"));
    await interaction.connect(signer2).deposit(signer2.address, amaticc.address, toWad("800"));
    await interaction.connect(signer3).deposit(signer3.address, amaticc.address, toWad("1200"));

    // Borrowing Sikka
    await interaction.connect(deployer).borrow(amaticc.address, toWad("6000"));// This will be used for DEX
    await interaction.connect(signer1).borrow(amaticc.address, toWad("290"));  // This will get liquidated
    await interaction.connect(signer2).borrow(amaticc.address, toWad("400"));  // This will stake in colander
    await interaction.connect(signer3).borrow(amaticc.address, toWad("600"));  // This will also stake in colander

    comparator = await sikka.balanceOf(deployer.address);
    expect(comparator).to.be.equal(toWad("6000"));
    comparator = await sikka.balanceOf(signer1.address);
    expect(comparator).to.be.equal(toWad("290"));
    comparator = await sikka.balanceOf(signer2.address);
    expect(comparator).to.be.equal(toWad("400"));
    comparator = await sikka.balanceOf(signer3.address);
    expect(comparator).to.be.equal(toWad("600"));

    // Creating liquidity pool in DEX
    await amaticc.connect(deployer).approve(nonfungiblePositionManager, toWad("10000"));
    await sikka.connect(deployer).approve(nonfungiblePositionManager, toWad("6000"));

    let multiCallParams = [
      // ===first call
      "0x13ead562" + // signature - createAndInitializePoolIfNecessary(address,address,uint24,uint160)
      "000000000000000000000000" + sikka.address.toLowerCase().substring(2) +
      "000000000000000000000000" + amaticc.address.toLowerCase().substring(2) +
      "0000000000000000000000000000000000000000000000000000000000000bb8" + // fee
      "00000000000000000000000000000000000000010c173444a8cfa71077e23314",  // sqrtPriceX96
      // ===second call
      "0x88316456" + // signature - mint(address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256)
      "000000000000000000000000" + sikka.address.toLowerCase().substring(2) +
      "000000000000000000000000" + amaticc.address.toLowerCase().substring(2) +
      "0000000000000000000000000000000000000000000000000000000000000bb8" + // fee
      "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff880" + // tick lower
      "0000000000000000000000000000000000000000000000000000000000001338" + // tick upper
      "00000000000000000000000000000000000000000000010e4c33654b982ce3a0" + // amount 1 desired
      "0000000000000000000000000000000000000000000000d8d726b7177a800000" + // amount 2 desired
      "00000000000000000000000000000000000000000000010a94bf7f3a91a75d14" + // min amount 1 expected
      "0000000000000000000000000000000000000000000000d4be7adf7230760538" + // min amount 2 expected 
      "000000000000000000000000" + deployer.address.toLowerCase().substring(2) + // deployer address 
      "0000000000000000000000000000000000000000000000000000000F62eadf23"   // deadline
    ];

    // Executing the params via position manager V3 to add liquidity
    await positionManager.connect(deployer).multicall(multiCallParams);

    // Signer2 and Signer3 deposit in colander (Stability Pool)
    await sikka.connect(signer2).approve(colander.address, toWad("400"));
    await sikka.connect(signer3).approve(colander.address, toWad("600"));
    await colander.connect(signer2).join(toWad("400"));
    await colander.connect(signer3).join(toWad("600"));

    comparator = await colander.balanceOf(signer2.address);
    expect(comparator).to.be.equal(toWad("400"));
    comparator = await colander.balanceOf(signer3.address);
    expect(comparator).to.be.equal(toWad("600"));

    // Price of collateral decreases and is poked into the system
    await oracle.connect(deployer).setPrice(toWad("0.86621"));
    await interaction.connect(deployer).poke(amaticc.address);

    // Signer1 gets liquidated
    await interaction.connect(deployer).startAuction(amaticc.address, signer1.address, deployer.address);

    comparator = await clip.connect(deployer).sales(1);
    expect(comparator.usr).to.be.equal(signer1.address);
    expect(comparator.lot).to.be.equal(toWad("400"));

    // Reset feedPrice
    await oracle.connect(deployer).setPrice(toWad("0.9118"));
    await interaction.connect(deployer).poke(amaticc.address);

    // Colander contract does lossless purchase (Surge)
    /*
     abacus price   : Decreasing price
     feed price     : Oracle price [0.911800000000000000]
     auction price  : (auction_tab/auction_lot), debt per collateral [0.819250004950000000]
     threshold      : 95% of the feed price [0.866210000000000000]
    */
    // 1: Surge [fail];    abacus price >= feed price 
    // 2: Surge [fail];    abacus price <= auction price
    // 3: Surge [fail];    auction price >= feed price 
    // 4: Surge [fail];    auction price >= threshold
    // 5: Surge [fail];    abacusPrice > threshold
    // 6: Surge [success]; abacus price < feed price && 
    //                  abacus price >= auction price && 
    //                  abacus price <= threshold &&
    //                  auction price < feedPrice &&
    //                  auction price < abacus price &&
    //                  auction price <= threshold 

    await expect(colander.connect(deployer).surge(amaticc.address, "2")).to.be.revertedWith("InvalidAuction()");

    // 1: abacus price >= feed price
    await expect(colander.connect(deployer).surge(amaticc.address, "1")).to.be.revertedWith("BufZone()");

    // 2: abacusPrice > threshold
    await network.provider.send("evm_increaseTime", [220]);
    await network.provider.send("evm_mine");
    await expect(colander.connect(deployer).surge(amaticc.address, "1")).to.be.revertedWith("InactiveZone()");

    // 3: abacus price <= auction price
    await network.provider.send("evm_increaseTime", [380]);
    await network.provider.send("evm_mine");
    await expect(colander.connect(deployer).surge(amaticc.address, "1")).to.be.revertedWith("SinZone()");

    // 4: auction price >= feed price 
    await oracle.connect(deployer).setPrice(toWad("0.7"));
    await interaction.connect(deployer).poke(amaticc.address);
    await expect(colander.connect(deployer).surge(amaticc.address, "1")).to.be.revertedWith("AbsurdPrice()");
    await oracle.connect(deployer).setPrice(toWad("0.9118"));
    await interaction.connect(deployer).poke(amaticc.address);

    // 5: auction price >= threshold
    await network.provider.send("evm_increaseTime", [900]);
    await network.provider.send("evm_mine");
    await clip.connect(deployer).redo("1", deployer.address);
    await network.provider.send("evm_increaseTime", [330]);
    await network.provider.send("evm_mine");
    await colander.connect(deployer).setProfitRange(toRay("0.15"));
    await expect(colander.connect(deployer).surge(amaticc.address, "1")).to.be.revertedWith("AbsurdThreshold()");
    await colander.connect(deployer).setProfitRange(toRay("0.05"));

    // 6: ELSE SUCESS
    await network.provider.send("evm_increaseTime", [1200]);
    await network.provider.send("evm_mine");
    await clip.connect(deployer).redo("1", deployer.address);
    await network.provider.send("evm_increaseTime", [380]);
    await network.provider.send("evm_mine");

    await colander.connect(deployer).surge(amaticc.address, "1");

    // console.log(await clip.getStatus(1));
    // console.log(await colander.surplus())
  });
});