const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");
const {BN, ether} = require("@openzeppelin/test-helpers");

async function main() {

    // Variables Declaration
    let [deployer] = await ethers.getSigners();
    let vat,
        rewards,
        gemJoin,
        sikkaJoin,
        dog,
        jug,
        auctionProxy,
        interaction,
        spot,
        sikka,
        clip,
        vow,
        sikkaProvider,
        ceaMATICc,
        oracle,
        abacus;
    let _vat = "",
        _rewards = "",
        _gemJoin = "",
        _sikkaJoin = "",
        _dog = "",
        _jug = "",
        _auctionProxy = "";
        _interaction = "",
        _spot = "",
        _sikka = "",
        _clip = "",
        _vow = "",
        _sikkaProvider = "",
        _ceaMATICc = "",
        _oracle = "",
        _abacus = "",
        _ilkCeaMATICc = ethers.utils.formatBytes32String("ceaMATICc");

    let wad = "000000000000000000", // 18 Decimals
        ray = "000000000000000000000000000", // 27 Decimals
        rad = "000000000000000000000000000000000000000000000", // 45 Decimals
        ONE = 10 ** 27;

    // Contracts Attachments
    this.Vat = await hre.ethers.getContractFactory("Vat");
    this.Rewards = await hre.ethers.getContractFactory("IkkaRewards");
    this.GemJoin = await hre.ethers.getContractFactory("GemJoin");
    this.SikkaJoin = await hre.ethers.getContractFactory("SikkaJoin");
    this.Dog = await hre.ethers.getContractFactory("Dog");
    this.Jug = await hre.ethers.getContractFactory("Jug");
    this.AuctionProxy = await hre.ethers.getContractFactory("AuctionProxy");
    auctionProxy = await this.AuctionProxy.attach(_auctionProxy);
    this.Interaction = await hre.ethers.getContractFactory("Interaction", {
      unsafeAllow: ['external-library-linking'],
      libraries: {
          AuctionProxy: auctionProxy.address
      }
    });
    this.Spot = await hre.ethers.getContractFactory("Spotter");
    this.Sikka = await hre.ethers.getContractFactory("Sikka");
    this.Clip = await hre.ethers.getContractFactory("Clipper");
    this.Vow = await hre.ethers.getContractFactory("Vow");
    this.SikkaProvider = await hre.ethers.getContractFactory("SikkaProvider");
    this.CeaMATICc = await hre.ethers.getContractFactory("CeToken");
    this.Oracle = await hre.ethers.getContractFactory("Oracle");
    this.Abacus = await hre.ethers.getContractFactory("LinearDecrease");

    vat = await this.Vat.attach(_vat);
    rewards = await this.Rewards.attach(_rewards);
    gemJoin = await this.GemJoin.attach(_gemJoin);
    sikkaJoin = await this.SikkaJoin.attach(_sikkaJoin);
    dog = await this.Dog.attach(_dog);
    jug = await this.Jug.attach(_jug);
    interaction = await this.Interaction.attach(_interaction);
    spot = await this.Spot.attach(_spot);
    sikka = await this.Sikka.attach(_sikka);
    clip = await this.Clip.attach(_clip);
    vow = await this.Vow.attach(_vow);
    sikkaProvider = await this.SikkaProvider.attach(_sikkaProvider);
    ceaMATICc = await this.CeaMATICc.attach(_ceaMATICc);
    oracle = await this.Oracle.attach(_oracle);
    abacus = await this.Abacus.attach(_abacus);

    // Contracts initializing
    console.log("Vat init...");
    await vat.rely(_gemJoin);
    await vat.rely(_spot);
    await vat.rely(_sikkaJoin);
    await vat.rely(_jug);
    await vat.rely(_dog);
    await vat.rely(_interaction);
    await vat["file(bytes32,uint256)"](ethers.utils.formatBytes32String("Line"), "500000000" + rad);
    await vat["file(bytes32,bytes32,uint256)"](_ilkCeaMATICc, ethers.utils.formatBytes32String("line"), "50000000" + rad);
    await vat["file(bytes32,bytes32,uint256)"](_ilkCeaMATICc, ethers.utils.formatBytes32String("dust"), "1" + ray);

    console.log("All init...");
    await rewards.rely(_interaction);
    await gemJoin.rely(_interaction);
    await sikkaJoin.rely(_interaction);
    await dog.rely(_interaction);
    await jug.rely(_interaction);
    await interaction.setSikkaProvider(_ceaMATICc, _sikkaProvider);

    // 2.000000000000000000000000000 ($) * 0.8 (80%) = 1.600000000000000000000000000,
    // 2.000000000000000000000000000 / 1.600000000000000000000000000 = 1.250000000000000000000000000 = mat
    console.log("Spot/Oracle...");
    await oracle.setPrice("2" + wad); // 2$
    await spot["file(bytes32,bytes32,address)"](_ilkCeaMATICc, ethers.utils.formatBytes32String("pip"), _oracle);
    await spot["file(bytes32,bytes32,uint256)"](_ilkCeaMATICc, ethers.utils.formatBytes32String("mat"), "1333333333333333333333333333"); // Liquidation Ratio 75%
    await spot["file(bytes32,uint256)"](ethers.utils.formatBytes32String("par"), "1" + ray); // It means pegged to 1$
    await spot.poke(_ilkCeaMATICc, {gasLimit: 200000});

    console.log("Jug...");
    let BR = new BN("1000000003022266000000000000").toString(); // 10%
    await jug["file(bytes32,uint256)"](ethers.utils.formatBytes32String("base"), BR); // 10% Yearly
    await jug["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address);

    console.log("Sikka...");
    await sikka.rely(sikkaJoin.address);

    console.log("Dog...");
    await dog.rely(clip.address);
    await dog["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address);
    await dog["file(bytes32,uint256)"](ethers.utils.formatBytes32String("Hole"), "500" + rad);
    await dog["file(bytes32,bytes32,uint256)"](_ilkCeaMATICc, ethers.utils.formatBytes32String("hole"), "250" + rad);
    await dog["file(bytes32,bytes32,uint256)"](_ilkCeaMATICc, ethers.utils.formatBytes32String("chop"), "1130000000000000000"); // 13%
    await dog["file(bytes32,bytes32,address)"](_ilkCeaMATICc, ethers.utils.formatBytes32String("clip"), clip.address);

    console.log("Clip/Abacus...");
    await abacus.connect(deployer)["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tau"), "3600"); // Price will reach 0 after this time
    await clip.rely(dog.address);
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("buf"), "1020000000000000000000000000"); // 2%
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tail"), "1800"); // 30mins reset time
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("cusp"), "600000000000000000000000000"); // 60% reset ratio
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("chip"), "10000000000000000"); // 1% from vow incentive
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tip"), "10" + rad); // 10$ flat fee incentive
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("stopped"), "0");
    await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("spotter"), spot.address);
    await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("dog"), dog.address);
    await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address);
    await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("calc"), abacus.address);

    console.log("Interaction...");
    await interaction.setCollateralType(ceaMATICc.address, gemJoin.address, _ilkCeaMATICc, clip.address);

    console.log("DEPLOYMENT LIVE");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
