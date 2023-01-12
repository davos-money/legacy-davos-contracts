let hre = require("hardhat");
let {ethers, upgrades} = require("hardhat");
const {BN, ether} = require("@openzeppelin/test-helpers");
const fs = require("fs");
const { poll } = require("ethers/lib/utils");

let wad = "000000000000000000", // 18 Decimals
    ray = "000000000000000000000000000", // 27 Decimals
    rad = "000000000000000000000000000000000000000000000", // 45 Decimals
    ONE = 10 ** 27;

async function main() {

    // Signer
    [deployer] = await ethers.getSigners();
        
    // External Addresses
    let { _aMATICc, _wMatic, _dex, _dexPairFee, _chainId, _maxDepositFee, 
    _maxWithdrawalFee, _maxStrategies, _cerosStrategyAllocatoin, _waitingPoolCap, _mat, 
    _dgtRewardsPoolLimitInEth, _dgtTokenRewardsSupplyinEth, _dgtOracleInitialPriceInWei, 
    _rewardsRate, _vat_Line, _vat_line, _vat_dust, _spot_par, _jug_base, _dog_Hole, _dog_hole,
    _dog_chop, _abacus_tau, _clip_buf, _clip_tail, _clip_cusp, _clip_chip, _clip_tip, _clip_stopped, _whitelistOperator, _multisig} = require(`../${hre.network.name}_config.json`);

    let _ilkCeMatic = ethers.utils.formatBytes32String("ceMATIC");

    // Contracts Fetching
    this.CeaMATICc = await hre.ethers.getContractFactory("CeToken");
    this.CeVault = await hre.ethers.getContractFactory("CeVault");
    this.AMATICb = await hre.ethers.getContractFactory("aMATICb");
    this.AMATICc = await hre.ethers.getContractFactory("aMATICc");
    this.DMatic = await hre.ethers.getContractFactory("dMATIC");
    this.CerosRouter = await hre.ethers.getContractFactory("CerosRouter");
    this.DavosProvider = await hre.ethers.getContractFactory("DavosProvider");

    this.Vat = await hre.ethers.getContractFactory("Vat");
    this.Spot = await hre.ethers.getContractFactory("Spotter");
    this.Davos = await hre.ethers.getContractFactory("Davos");
    this.GemJoin = await hre.ethers.getContractFactory("GemJoin");
    this.DavosJoin = await hre.ethers.getContractFactory("DavosJoin");
    this.Oracle = await hre.ethers.getContractFactory("MaticOracle"); 
    this.Jug = await hre.ethers.getContractFactory("Jug");
    this.Vow = await hre.ethers.getContractFactory("Vow");
    this.Dog = await hre.ethers.getContractFactory("Dog");
    this.Clip = await hre.ethers.getContractFactory("Clipper");
    this.Abacus = await hre.ethers.getContractFactory("LinearDecrease");

    this.DgtToken = await hre.ethers.getContractFactory("DGTToken");
    this.DgtRewards = await hre.ethers.getContractFactory("DGTRewards");
    this.DgtOracle = await hre.ethers.getContractFactory("DGTOracle"); 
    
    this.AuctionProxy = await hre.ethers.getContractFactory("AuctionProxy");

    const auctionProxy = await this.AuctionProxy.deploy();
    await auctionProxy.deployed();
    this.Interaction = await hre.ethers.getContractFactory("Interaction", {
        unsafeAllow: ['external-library-linking'],
        libraries: {
            AuctionProxy: auctionProxy.address
        }
    });

    this.MasterVault = await hre.ethers.getContractFactory("MasterVault");
    this.WaitingPool = await hre.ethers.getContractFactory("WaitingPool");
    this.CerosYieldConverterStrategy = await hre.ethers.getContractFactory("CerosYieldConverterStrategy");

    this.PriceGetter = await hre.ethers.getContractFactory("PriceGetter");

    this.SwapPool = await ethers.getContractFactory("SwapPool");
    this.LP = await ethers.getContractFactory("LP");

    let { swapPool, LP} = require(`./${hre.network.name}_1addresses.json`);
    let { ceaMATICc, ceVault, dMatic, cerosRouter } = require(`./${hre.network.name}_2addresses.json`);
    let { masterVault, waitingPool, cerosYieldStr} = require(`./${hre.network.name}_3addresses.json`);
    let { vat, davos, spot, gemJoin, davosJoin, oracle, abacus} = require(`./${hre.network.name}_4addresses.json`);
    let { jug, dog, clip, vow, davosProvider, rewards, interaction} = require(`./${hre.network.name}_5addresses.json`);

    swapPool = await hre.ethers.getContractAt("SwapPool", swapPool);
    LP = await hre.ethers.getContractAt("LP", LP);
    ceaMATICc = await hre.ethers.getContractAt("CeToken", ceaMATICc);
    ceVault = await hre.ethers.getContractAt("CeVault", ceVault);
    dMatic = await hre.ethers.getContractAt("dMATIC", dMatic);
    masterVault = await hre.ethers.getContractAt("MasterVault", masterVault);
    vat = await hre.ethers.getContractAt("Vat", vat);
    davos = await hre.ethers.getContractAt("Davos", davos);
    spot = await hre.ethers.getContractAt("Spotter", spot);
    davosProvider = await hre.ethers.getContractAt("DavosProvider", davosProvider);
    rewards = await hre.ethers.getContractAt("DGTRewards", rewards);
    gemJoin = await hre.ethers.getContractAt("GemJoin", gemJoin);
    davosJoin = await hre.ethers.getContractAt("DavosJoin", davosJoin);

    dog = await hre.ethers.getContractAt("Dog", dog);
    clip = await hre.ethers.getContractAt("Clipper", clip);
    jug = await hre.ethers.getContractAt("Jug", jug);
    vow = await hre.ethers.getContractAt("Vow", vow);
    interaction = await hre.ethers.getContractAt("Interaction", interaction);
    abacus = await hre.ethers.getContractAt("LinearDecrease", abacus);

    // Initialization
    console.log("Dog init...");
    await(await dog.rely(interaction.address)).wait();
    await(await dog.rely(clip.address)).wait();
    await(await dog["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address)).wait();
    await(await dog["file(bytes32,uint256)"](ethers.utils.formatBytes32String("Hole"), _dog_Hole + rad)).wait();
    await(await dog["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("hole"), _dog_hole + rad)).wait();
    await(await dog["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("chop"), _dog_chop)).wait();
    await(await dog["file(bytes32,bytes32,address)"](_ilkCeMatic, ethers.utils.formatBytes32String("clip"), clip.address)).wait();

    console.log("Clip init...");
    await(await clip.rely(interaction.address)).wait();
    await(await clip.rely(dog.address)).wait();
    await(await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("buf"), _clip_buf)).wait(); // 10%
    await(await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tail"), _clip_tail)).wait(); // 3H reset time
    await(await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("cusp"), _clip_cusp)).wait(); // 60% reset ratio
    await(await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("chip"), _clip_chip)).wait(); // 0.01% vow incentive
    await(await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tip"), _clip_tip + rad)).wait(); // 10$ flat incentive
    await(await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("stopped"), _clip_stopped)).wait();
    await(await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("spotter"), spot.address)).wait();
    await(await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("dog"), dog.address)).wait();
    await(await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address)).wait();
    await(await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("calc"), abacus.address)).wait();

    console.log("Jug...");
    await(await jug.rely(interaction.address)).wait();
    // Initialize Rates Module
    // IMPORTANT: Base and Duty are added together first, thus will compound together.
    //            It is adviced to set a constant base first then duty for all ilks.
    //            Otherwise, a change in base rate will require a change in all ilks rate.
    //            Due to addition of both rates, the ratio should be adjusted by factoring.
    //            rate(Base) + rate(Duty) != rate(Base + Duty)

    // Calculating Base Rate (1% Yearly)
    // ==> principal*(rate**seconds)-principal = 0.01 (1%)
    // ==> 1 * (BR ** 31536000 seconds) - 1 = 0.01
    // ==> 1*(BR**31536000) = 1.01
    // ==> BR**31536000 = 1.01
    // ==> BR = 1.01**(1/31536000)
    // ==> BR = 1.000000000315529215730000000 [ray]
    // Factoring out Ilk Duty Rate (1% Yearly)
    // ((1 * (BR + 0.000000000312410000000000000 DR)^31536000)-1) * 100 = 0.000000000312410000000000000 = 2% (BR + DR Yearly)
    
    // 1000000000315522921573372069 1% Borrow Rate
    // 1000000000627937192491029810 2% Borrow Rate
    // 1000000000937303470807876290 3% Borrow Rate
    // 1000000003022266000000000000 10% Borrow Rate
    // ***We don't set base rate. We set only duty rate via interaction***
    // await(await jug["file(bytes32,uint256)"](ethers.utils.formatBytes32String("base"), "1000000000627937192491029810")).wait();
    await(await jug["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address)).wait();

    console.log("Vow init...");
    await(await vow.rely(dog.address)).wait();
    await(await vow["file(bytes32,address)"](ethers.utils.formatBytes32String("davos"), davos.address)).wait();

    console.log("Interaction init...");
    await(await interaction.setDavosProvider(masterVault.address, davosProvider.address)).wait();
    tx = await interaction.setCollateralType(masterVault.address, gemJoin.address, _ilkCeMatic, clip.address, _mat, {gasLimit: 700000});
    await ethers.provider.waitForTransaction(tx.hash, 1, 60000);
    tx = await interaction.poke(masterVault.address, {gasLimit: 200000});
    await ethers.provider.waitForTransaction(tx.hash, 1, 60000);
    tx = await interaction.drip(masterVault.address, {gasLimit: 200000});
    await ethers.provider.waitForTransaction(tx.hash, 1, 60000);
    await(await interaction.enableWhitelist()).wait();  // Deposits are limited to whitelist
    await(await interaction.setWhitelistOperator(_whitelistOperator)).wait();  // Whitelist manager
    tx = await interaction.setCollateralDuty(masterVault.address, "1000000000627937192491029810", {gasLimit: 250000});
    await ethers.provider.waitForTransaction(tx.hash, 1, 60000);

    console.log("Abaci init...");
    await(await abacus.connect(deployer)["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tau"), _abacus_tau)).wait(); // Price will reach 0 after this time
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
});