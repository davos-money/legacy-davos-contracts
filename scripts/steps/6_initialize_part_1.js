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

    let { _swapPoolManager , _swapPool_stakeFee, _swapPool_unstakeFee , _maticPool } = require(`../${hre.network.name}_config.json`);

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
    let { vat, davos, spot, gemJoin, davosJoin, oracle} = require(`./${hre.network.name}_4addresses.json`);
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

    // Initialization
    console.log("SwapPool init...");
    // await (await LP.setSwapPool(swapPool.address)).wait();
    await (await swapPool.add(_swapPoolManager, 0)).wait();
    await (await swapPool.setFee(_swapPool_stakeFee , 3)).wait();
    await (await swapPool.setFee(_swapPool_unstakeFee, 4)).wait();
    await (await swapPool.setMaticPool(_maticPool)).wait();

    console.log("Ceros init...");
    await(await ceaMATICc.changeVault(ceVault.address)).wait();
    await(await ceVault.changeRouter(cerosRouter)).wait();
    await(await dMatic.changeMinter(davosProvider.address)).wait();
    await(await davosProvider.changeProxy(interaction)).wait();

    console.log("MasterVault init...");
    await(await masterVault.setWaitingPool(waitingPool)).wait();
    await(await masterVault.setStrategy(cerosYieldStr, _cerosStrategyAllocatoin)).wait();
    await(await masterVault.changeProvider(davosProvider.address)).wait();

    console.log("Vat init...");
    await(await vat.rely(gemJoin.address)).wait();
    await(await vat.rely(spot.address)).wait();
    await(await vat.rely(davosJoin.address)).wait();
    await(await vat.rely(jug)).wait();
    await(await vat.rely(dog)).wait();
    await(await vat.rely(clip)).wait();
    await(await vat.rely(interaction)).wait();
    await(await vat["file(bytes32,uint256)"](ethers.utils.formatBytes32String("Line"), _vat_Line + rad)).wait();
    await(await vat["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("line"), _vat_line + rad)).wait();
    await(await vat["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("dust"), _vat_dust + rad)).wait();
    
    console.log("Davos init...");
    await(await davos.rely(davosJoin.address)).wait();
    await(await davos.setSupplyCap("5000000" + wad)).wait();

    console.log("Spot init...");
    await(await spot.rely(interaction)).wait();
    await(await spot["file(bytes32,bytes32,address)"](_ilkCeMatic, ethers.utils.formatBytes32String("pip"), oracle)).wait();
    await(await spot["file(bytes32,uint256)"](ethers.utils.formatBytes32String("par"), _spot_par + ray)).wait(); // It means pegged to 1$

    console.log("Rewards init...");
    await(await rewards.rely(interaction)).wait();

    console.log("Joins init...");
    await(await gemJoin.rely(interaction)).wait();
    await(await davosJoin.rely(interaction)).wait();
    await(await davosJoin.rely(vow)).wait();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
});