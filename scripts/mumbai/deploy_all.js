let hre = require("hardhat");
let {ethers, upgrades} = require("hardhat");
const {BN, ether} = require("@openzeppelin/test-helpers");
const fs = require("fs");

async function main() {

    [deployer] = await ethers.getSigners();
    // External Addresses
    let { _aMATICc, _wMatic, _dex, _dexPairFee, _swapPool, _priceGetter, _chainId, _maxDepositFee, 
    _maxWithdrawalFee, _maxStrategies, _cerosStrategyAllocatoin, _waitingPoolCap, _mat, 
    _dgtRewardsPoolLimitInEth, _dgtTokenRewardsSupplyinEth, _dgtOracleInitialPriceInWei, 
    _rewardsRate, _vat_Line, _vat_line, _vat_dust, _spot_par, _jug_base, _dog_Hole, _dog_hole,
    _dog_chop, _abacus_tau, _clip_buf, _clip_tail, _clip_cusp, _clip_chip, _clip_tip, _clip_stopped } = require(`../${hre.network.name}_config.json`)
    

    console.log(_dog_chop, _abacus_tau, _clip_buf, _clip_tail, _clip_cusp, _clip_chip, _clip_tip, _clip_stopped)


    let _ilkCeMatic = ethers.utils.formatBytes32String("ceMATIC");
    let ceaMATICc, 
        ceVault,  
        dMatic, 
        cerosRouter;
    // Contracts Fetching
    this.CeaMATICc = await hre.ethers.getContractFactory("CeToken");
    this.CeVault = await hre.ethers.getContractFactory("CeVault");
    this.AMATICb = await hre.ethers.getContractFactory("aMATICb");
    this.AMATICc = await hre.ethers.getContractFactory("aMATICc");
    this.DMatic = await hre.ethers.getContractFactory("dMATIC");
    this.CerosRouter = await hre.ethers.getContractFactory("CerosRouter");

    // Contracts deployment and initialization
    ceaMATICc = await upgrades.deployProxy(this.CeaMATICc, ["CEROS aMATICc Vault Token", "ceaMATICc"], {initializer: "initialize"});
    await ceaMATICc.deployed();
    ceaMATICcImp = await upgrades.erc1967.getImplementationAddress(ceaMATICc.address);
    console.log("ceaMATICc  : " + ceaMATICc.address);
    console.log("imp        : " + ceaMATICcImp);

    ceVault = await upgrades.deployProxy(this.CeVault, ["CEROS aMATICc Vault", ceaMATICc.address, _aMATICc], {initializer: "initialize"});
    await ceVault.deployed();
    ceVaultImp = await upgrades.erc1967.getImplementationAddress(ceVault.address);
    console.log("ceVault    : " + ceVault.address);
    console.log("imp        : " + ceVaultImp);

    dMatic = await upgrades.deployProxy(this.DMatic, [], {initializer: "initialize"});
    await dMatic.deployed();
    dMaticImp = await upgrades.erc1967.getImplementationAddress(dMatic.address);
    console.log("dMatic     : " + dMatic.address);
    console.log("imp        : " + dMaticImp);

    cerosRouter = await upgrades.deployProxy(this.CerosRouter, [_aMATICc, _wMatic, ceaMATICc.address, ceVault.address, _dex, _dexPairFee, _swapPool, _priceGetter], {initializer: "initialize"}, {gasLimit: 2000000});
    await cerosRouter.deployed();
    cerosRouterImp = await upgrades.erc1967.getImplementationAddress(cerosRouter.address);
    console.log("cerosRouter: " + cerosRouter.address);
    console.log("imp        : " + cerosRouterImp);

    await ceaMATICc.changeVault(ceVault.address);
    await ceVault.changeRouter(cerosRouter.address);

    this.MasterVault = await hre.ethers.getContractFactory("MasterVault");
    this.WaitingPool = await hre.ethers.getContractFactory("WaitingPool");
    masterVault = await upgrades.deployProxy(this.MasterVault, ["CEROS MATIC Vault Token", "ceMATIC", _maxDepositFee, _maxWithdrawalFee, _wMatic, _maxStrategies, _swapPool], {initializer: "initialize"});
    await masterVault.deployed();
    masterVaultImp = await upgrades.erc1967.getImplementationAddress(masterVault.address);
    console.log("masterVault    : " + masterVault.address);
    console.log("imp        : " + masterVaultImp);

    waitingPool = await upgrades.deployProxy(this.WaitingPool, [masterVault.address, _waitingPoolCap], {initializer: "initialize"});
    await waitingPool.deployed();
    waitingPoolImp = await upgrades.erc1967.getImplementationAddress(waitingPool.address);
    console.log("waitingPool    : " + waitingPool.address);
    console.log("imp        : " + waitingPoolImp);

    await masterVault.setWaitingPool(waitingPool.address)

    _destination = cerosRouter.address,
    _feeRecipient = deployer.address,
    _underlyingToken = _wMatic,
    _certToekn = _aMATICc,
    _rewardsPool = deployer.address

    this.CerosYieldConverterStrategy = await hre.ethers.getContractFactory("CerosYieldConverterStrategy");
    this.MasterVault = await hre.ethers.getContractFactory("MasterVault");
    
    cerosYieldConverterStrategy = await upgrades.deployProxy(this.CerosYieldConverterStrategy, [_destination, _feeRecipient, _underlyingToken, cerosRouter.address, _certToekn, masterVault.address, _swapPool], {initializer: "initialize"});
    await cerosYieldConverterStrategy.deployed();
    cerosYieldConverterStrategyImp = await upgrades.erc1967.getImplementationAddress(cerosYieldConverterStrategy.address);
    console.log("cerosYieldConverterStrategy    : " + cerosYieldConverterStrategy.address);
    console.log("imp        : " + cerosYieldConverterStrategyImp);

    masterVault = await this.MasterVault.attach(masterVault.address);
    await masterVault.setStrategy(cerosYieldConverterStrategy.address, _cerosStrategyAllocatoin);

    // Contracts Fetching
    this.Vat = await hre.ethers.getContractFactory("Vat");
    this.Spot = await hre.ethers.getContractFactory("Spotter");
    this.Davos = await hre.ethers.getContractFactory("Davos");
    this.GemJoin = await hre.ethers.getContractFactory("GemJoin");
    this.DavosJoin = await hre.ethers.getContractFactory("DavosJoin");
    this.Jug = await hre.ethers.getContractFactory("Jug");
    this.Vow = await hre.ethers.getContractFactory("Vow");
    this.Dog = await hre.ethers.getContractFactory("Dog");
    this.Clip = await hre.ethers.getContractFactory("Clipper");
    this.Oracle = await hre.ethers.getContractFactory("MaticOracle"); // Matic Oracle
    this.Abacus = await hre.ethers.getContractFactory("LinearDecrease");

    // Contracts deployment
    let vat = await upgrades.deployProxy(this.Vat, [], {initializer: "initialize"});
    await vat.deployed();
    vatImp = await upgrades.erc1967.getImplementationAddress(vat.address);
    console.log("Vat            :", vat.address);
    console.log("VatImp         :", vatImp);

    let spot = await upgrades.deployProxy(this.Spot, [vat.address], {initializer: "initialize"});
    await spot.deployed();
    spotImp = await upgrades.erc1967.getImplementationAddress(spot.address);
    console.log("Spot           :", spot.address);
    console.log("SpotImp         :", spotImp)

    let davos = await upgrades.deployProxy(this.Davos, [_chainId, "DAVOS"], {initializer: "initialize"});
    await davos.deployed();
    davosImp = await upgrades.erc1967.getImplementationAddress(davos.address);
    console.log("davos           :", davos.address);
    console.log("davosImp         :", davosImp);

    let davosJoin = await upgrades.deployProxy(this.DavosJoin, [vat.address, davos.address], {initializer: "initialize"});
    await davosJoin.deployed();
    davosJoinImp = await upgrades.erc1967.getImplementationAddress(davosJoin.address);
    console.log("DavosJoin      :", davosJoin.address);
    console.log("DavosJoinImp         :", davosJoinImp)

    let ceaMATICcJoin = await upgrades.deployProxy(this.GemJoin, [vat.address, _ilkCeMatic, masterVault.address], {initializer: "initialize"});
    await ceaMATICcJoin.deployed();
    ceaMATICcJoinImp = await upgrades.erc1967.getImplementationAddress(ceaMATICcJoin.address);
    console.log("GemJoin            :", ceaMATICcJoin.address);
    console.log("GemJoinImp         :", ceaMATICcJoinImp);

    let jug = await upgrades.deployProxy(this.Jug, [vat.address], {initializer: "initialize"});
    await jug.deployed();
    jugImp = await upgrades.erc1967.getImplementationAddress(jug.address);
    console.log("Jug            :", jug.address);
    console.log("JugImp         :", jugImp);

    let vow = await upgrades.deployProxy(this.Vow, [vat.address, davosJoin.address, deployer.address], {initializer: "initialize"});
    await vow.deployed();
    vowImp = await upgrades.erc1967.getImplementationAddress(vow.address);
    console.log("Vow            :", vow.address);
    console.log("VowImp         :", vowImp);

    let dog = await upgrades.deployProxy(this.Dog, [vat.address], {initializer: "initialize"});
    await dog.deployed();
    dogImpl = await upgrades.erc1967.getImplementationAddress(dog.address);
    console.log("Dog            :", dog.address);
    console.log("DogImp         :", dogImpl);

    let clip = await upgrades.deployProxy(this.Clip, [vat.address, spot.address, dog.address, _ilkCeMatic], {initializer: "initialize"});
    await clip.deployed();
    clipImp = await upgrades.erc1967.getImplementationAddress(dog.address);
    console.log("Clip           :", clip.address);
    console.log("ClipImp         :", clipImp);

    let aggregatorAddress;
    if (hre.network.name == "polygon") {
      aggregatorAddress = "0x97371dF4492605486e23Da797fA68e55Fc38a13f";
    } else if (hre.network.name == "mumbai") {
      aggregatorAddress = "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada";
    }
  
    let oracle = await upgrades.deployProxy(this.Oracle, [aggregatorAddress], {initializer: "initialize"});
    await oracle.deployed();
    let oracleImplementation = await upgrades.erc1967.getImplementationAddress(oracle.address);
    console.log("Deployed: oracle     : " + oracle.address);
    console.log("Imp                  : " + oracleImplementation);

    let abacus = await upgrades.deployProxy(this.Abacus, [], {initializer: "initialize"});
    await abacus.deployed();
    abacusImp = await upgrades.erc1967.getImplementationAddress(abacus.address);
    console.log("Abacus         :", abacus.address);
    console.log("AbacusImp         :", abacusImp);

    console.log("Verifying Davos...");

    // Contracts Fetching
    this.DgtToken = await hre.ethers.getContractFactory("DgtToken");
    this.DgtRewards = await hre.ethers.getContractFactory("DgtRewards");
    this.DgtOracle = await hre.ethers.getContractFactory("DgtOracle");

    // Contracts deployment
    let rewards = await upgrades.deployProxy(this.DgtRewards, [vat.address, ether(_dgtRewardsPoolLimitInEth).toString()], {initializer: "initialize"});
    await rewards.deployed();
    rewardsImp = await upgrades.erc1967.getImplementationAddress(rewards.address);
    console.log("Rewards             :", rewards.address);
    console.log("Imp                 :", rewardsImp);

    let dgtToken = await upgrades.deployProxy(this.DgtToken, [ether(_dgtTokenRewardsSupplyinEth).toString(), rewards.address], {initializer: "initialize"});
    await dgtToken.deployed();
    dgtTokenImp = await upgrades.erc1967.getImplementationAddress(dgtToken.address);
    console.log("dgtToken           :", dgtToken.address);
    console.log("Imp                 :", dgtTokenImp);
    
    let dgtOracle = await upgrades.deployProxy(this.DgtOracle, [_dgtOracleInitialPriceInWei], {initializer: "initialize"}) // 0.1
    await dgtOracle.deployed();
    dgtOracleImplementation = await upgrades.erc1967.getImplementationAddress(dgtOracle.address);
    console.log("dgtOracle          :", dgtOracle.address);
    console.log("Imp                 :", dgtOracleImplementation);

    await dgtToken.rely(rewards.address);
    await rewards.setDgtToken(dgtToken.address);
    await rewards.initPool(masterVault.address, _ilkCeMatic, _rewardsRate, {gasLimit: 2000000}), //6%
    await rewards.setOracle(dgtOracle.address);

    _vat = vat.address,
    _spot = spot.address,
    _davos = davos.address,
    _davosJoin = davosJoin.address,
    _jug = jug.address,
    _dog = dog.address,
    _rewards = rewards.address;

    // Contracts Fetching
    this.Rewards = await hre.ethers.getContractFactory("DgtRewards");
    rewards = this.Rewards.attach(_rewards);
    this.AuctionProxy = await hre.ethers.getContractFactory("AuctionProxy");
    let auctionProxy = await this.AuctionProxy.deploy();
    await auctionProxy.deployed();
    console.log("AuctionProxy.lib          : ", auctionProxy.address);
    this.Interaction = await hre.ethers.getContractFactory("Interaction", {
        unsafeAllow: ['external-library-linking'],
        libraries: {
            AuctionProxy: auctionProxy.address
        }
    });
    let interaction = await upgrades.deployProxy(this.Interaction, [
        _vat,
        _spot,
        _davos,
        _davosJoin,
        _jug,
        _dog,
        rewards.address
    ], {
        initializer: "initialize",
        unsafeAllowLinkedLibraries: true,
    });
    await interaction.deployed();
    console.log("interaction               : ", interaction.address);
    
    this.Vat = await hre.ethers.getContractFactory("Vat");
    vat = this.Vat.attach(_vat);
    await vat.rely(interaction.address);
    await rewards.rely(interaction.address);
    await spot.rely(interaction.address);

    interactionImplAddress = await upgrades.erc1967.getImplementationAddress(interaction.address);
    console.log("Interaction implementation: ", interactionImplAddress);

    // Contracts Fetching
    this.DavosProvider = await hre.ethers.getContractFactory("DavosProvider");
    this.DMatic = await hre.ethers.getContractFactory("dMATIC");
    this.CerosRouter = await hre.ethers.getContractFactory("CerosRouter");
    this.MasterVault = await hre.ethers.getContractFactory("MasterVault");

    davosProvider = await upgrades.deployProxy(this.DavosProvider, [dMatic.address, masterVault.address, interaction.address], {initializer: "initialize"});
    await davosProvider.deployed();
    davosProviderImplementation = await upgrades.erc1967.getImplementationAddress(davosProvider.address);
    console.log("davosProvider  : " + davosProvider.address);
    console.log("imp           : " + davosProviderImplementation);

    masterVault = this.MasterVault.attach(masterVault.address);
    dMatic = await this.DMatic.attach(dMatic.address);
    await dMatic.changeMinter(davosProvider.address);
    await masterVault.changeProvider(davosProvider.address);

    // Store deployed addresses
    const addresses = {
        ceaMATICc      : ceaMATICc.address,
        ceaMATICcImp   : ceaMATICcImp,
        ceVault        : ceVault.address,
        ceVaultImp     : ceVaultImp,
        dMatic         : dMatic.address,
        dMaticImp      : dMaticImp,
        cerosRouter    : cerosRouter.address,
        cerosRouterImp : cerosRouterImp,
        masterVault    : masterVault.address,
        masterVaultImp : masterVaultImp,
        waitingPool    : waitingPool.address,
        waitingPoolImp : waitingPoolImp,
        cerosYieldStr  : cerosYieldConverterStrategy.address,
        cerosYieldConverterStrategyImp  : cerosYieldConverterStrategyImp,
        vat            : vat.address,
        vatImp         : vatImp,
        spot           : spot.address,
        spotImp        : spotImp,
        davos          : davos.address,
        davosImp       : davosImp,
        davosJoin      : davosJoin.address,
        davosJoinImp   : davosJoinImp,
        gemJoin        : ceaMATICcJoin.address,
        gemJoinImp     : ceaMATICcJoinImp,
        jug            : jug.address,
        jugImp         : jugImp,
        vow            : vow.address,
        vowImp         : vowImp,
        dog            : dog.address,
        dogImp         : dogImpl,
        clip           : clip.address,
        clipImp        : clipImp,
        oracle         : oracle.address,
        abacus         : abacus.address,
        abacusImp      : abacusImp,
        rewards        : rewards.address,
        rewardsImp     : rewardsImp,
        dgtToken      : dgtToken.address,
        dgtTokenImp   : dgtTokenImp,
        auctionProxy   : auctionProxy.address
    }

    const json_addresses = JSON.stringify(addresses);
    fs.writeFileSync(`./scripts/${network.name}_addresses.json`, json_addresses);
    console.log("Addresses Recorded to: " + `./scripts/${network.name}_addresses.json`);

    let wad = "000000000000000000", // 18 Decimals
        ray = "000000000000000000000000000", // 27 Decimals
        rad = "000000000000000000000000000000000000000000000", // 45 Decimals
        ONE = 10 ** 27;

    // Contracts Attachments
    this.Vat = await hre.ethers.getContractFactory("Vat");
    this.Rewards = await hre.ethers.getContractFactory("DgtRewards");
    this.GemJoin = await hre.ethers.getContractFactory("GemJoin");
    this.DavosJoin = await hre.ethers.getContractFactory("DavosJoin");
    this.Dog = await hre.ethers.getContractFactory("Dog");
    this.Jug = await hre.ethers.getContractFactory("Jug");
    this.AuctionProxy = await hre.ethers.getContractFactory("AuctionProxy");
    auctionProxy = await this.AuctionProxy.attach(auctionProxy.address);
    this.Interaction = await hre.ethers.getContractFactory("Interaction", {
      unsafeAllow: ['external-library-linking'],
      libraries: {
          AuctionProxy: auctionProxy.address
      }
    });
    this.Spot = await hre.ethers.getContractFactory("Spotter");
    this.Davos = await hre.ethers.getContractFactory("Davos");
    this.Clip = await hre.ethers.getContractFactory("Clipper");
    this.Vow = await hre.ethers.getContractFactory("Vow");
    this.DavosProvider = await hre.ethers.getContractFactory("DavosProvider");
    this.MasterVault = await hre.ethers.getContractFactory("MasterVault");
    this.Oracle = await hre.ethers.getContractFactory("MaticOracle");
    this.Abacus = await hre.ethers.getContractFactory("LinearDecrease");

    vat = await this.Vat.attach(_vat);
    rewards = await this.Rewards.attach(_rewards);
    gemJoin = await this.GemJoin.attach(ceaMATICcJoin.address);
    davosJoin = await this.DavosJoin.attach(_davosJoin);
    dog = await this.Dog.attach(_dog);
    jug = await this.Jug.attach(_jug);
    interaction = await this.Interaction.attach(interaction.address);
    spot = await this.Spot.attach(_spot);
    davos = await this.Davos.attach(_davos);
    clip = await this.Clip.attach(clip.address);
    vow = await this.Vow.attach(vow.address);
    davosProvider = await this.DavosProvider.attach(davosProvider.address);
    masterVault = await this.MasterVault.attach(masterVault.address);
    oracle = await this.Oracle.attach(oracle.address);
    abacus = await this.Abacus.attach(abacus.address);

    // Contracts initializing
    console.log("Vat init...");
    await vat.rely(ceaMATICcJoin.address);
    await vat.rely(_spot);
    await vat.rely(_davosJoin);
    await vat.rely(_jug);
    await vat.rely(_dog);
    // await vat.rely(interaction.address);
    await vat.rely(clip.address);
    await vat["file(bytes32,uint256)"](ethers.utils.formatBytes32String("Line"), _vat_Line + rad);
    await vat["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("line"), _vat_line + rad);
    await vat["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("dust"), _vat_dust + ray);

    console.log("Vow init...");
    await vow.rely(_dog);

    console.log("All init...");
    // await rewards.rely(interaction.address);
    await gemJoin.rely(interaction.address);
    await davosJoin.rely(interaction.address);
    await dog.rely(interaction.address);
    await jug.rely(interaction.address);
    await clip.rely(interaction.address);
    await interaction.setDavosProvider(masterVault.address, davosProvider.address);

    // 2.000000000000000000000000000 ($) * 0.8 (80%) = 1.600000000000000000000000000,
    // 2.000000000000000000000000000 / 1.600000000000000000000000000 = 1.250000000000000000000000000 = mat
    console.log("Spot/Oracle...");
    // await oracle.setPrice("2" + wad); // 2$
    await spot["file(bytes32,bytes32,address)"](_ilkCeMatic, ethers.utils.formatBytes32String("pip"), oracle.address);
    // await spot["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("mat"), _mat); // Liquidation Ratio 75%
    await spot["file(bytes32,uint256)"](ethers.utils.formatBytes32String("par"), _spot_par + ray); // It means pegged to 1$
    await spot.poke(_ilkCeMatic, {gasLimit: 200000});

    console.log("Jug...");
    BR = new BN(_jug_base).toString(); // 10%
    await jug["file(bytes32,uint256)"](ethers.utils.formatBytes32String("base"), BR); // 10% Yearly
    await jug["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address);

    console.log("Davos...");
    await davos.rely(davosJoin.address);

    console.log("Dog...");
    await dog.rely(clip.address);
    await dog["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address);
    await dog["file(bytes32,uint256)"](ethers.utils.formatBytes32String("Hole"), _dog_Hole + rad);
    await dog["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("hole"), _dog_hole + rad);
    await dog["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("chop"), _dog_chop); // 13%
    await dog["file(bytes32,bytes32,address)"](_ilkCeMatic, ethers.utils.formatBytes32String("clip"), clip.address);

    console.log("Clip/Abacus...");
    await abacus.connect(deployer)["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tau"), _abacus_tau); // Price will reach 0 after this time
    await clip.rely(dog.address);
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("buf"), _clip_buf); // 2%
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tail"), _clip_tail); // 30mins reset time
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("cusp"), _clip_cusp); // 60% reset ratio
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("chip"), _clip_chip); // 1% from vow incentive
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tip"), _clip_tip + rad); // 10$ flat fee incentive
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("stopped"), _clip_stopped);
    await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("spotter"), spot.address);
    await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("dog"), dog.address);
    await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address);
    await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("calc"), abacus.address);

    console.log("Interaction...");
    await interaction.setCollateralType(masterVault.address, gemJoin.address, _ilkCeMatic, clip.address, _mat);

    console.log("DEPLOYMENT LIVE");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
});
