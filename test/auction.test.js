const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const { describe, it, before } = require("mocha");
const { ethers, network } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const web3 = require('web3');
const toBN = web3.utils.toBN;
const ethUtils = ethers.utils;
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");

const NetworkSnapshotter = require("./helpers/NetworkSnapshotter");
const {
  toWad,
  toRay,
  toRad,
  advanceTime,
  printSale,
} = require("./helpers/utils");
const hre = require("hardhat");
const {ether} = require("@openzeppelin/test-helpers");

chai.use(solidity);
chai.use(chaiAsPromised);

const { expect } = chai;
const BigNumber = ethers.BigNumber;
const toBytes32 = ethers.utils.formatBytes32String;

const ten = BigNumber.from(10);
const wad = ten.pow(18);
const ray = ten.pow(27);
const rad = ten.pow(45);

xdescribe("Auction", () => {
  const networkSnapshotter = new NetworkSnapshotter();

  let deployer, signer1, signer2, signer3;
  let abacus;
  let vat;
  let spot;
  let davos;
  let amaticc;
  let amaticcJoin;
  let davosJoin;
  let jug;
  let oracle;
  let clip;
  let dog;
  let vow;
  let interaction;

  let collateral = toBytes32("aMATICc");

  async function init() {
    [owner, intermediary, bc_operator, staker_1, staker_2, operator] = await ethers.getSigners();

    let wad = "000000000000000000"; // 18 Decimals
    amount_1 = toBN('10000000020000000000');
    amount_2 = toBN('20000000020000000000');

    const Davos = await ethers.getContractFactory("Davos");
    const Vat = await ethers.getContractFactory("Vat");
    const Dog = await ethers.getContractFactory("Dog");
    const Spot = await ethers.getContractFactory("Spotter");

    // /* davosJoin */
    const DavosJoin = await ethers.getContractFactory("DavosJoin");
    const GemJoin = await ethers.getContractFactory("GemJoin");
    
    // /* jug */
    const Jug = await ethers.getContractFactory("Jug");
    const Vow = await ethers.getContractFactory("Vow");
    const Clip = await ethers.getContractFactory("Clipper");
    const Oracle = await ethers.getContractFactory("Oracle");
    const Abacus = await ethers.getContractFactory("LinearDecrease");

    let [swapPool, wNative, cerosToken, masterVault, ceaMATICc , ce_Vault , cerosRouter, dMatic] = await deployMasterVault()

    // wmatic = wNative;
    amaticc = cerosToken;
    ce_vault = ce_Vault;
    ce_rot = cerosRouter;

    vat = await upgrades.deployProxy(Vat, [], {initializer: "initialize"});
    await vat.deployed();

    spot = await upgrades.deployProxy(Spot, [vat.address], {initializer: "initialize"});
    await spot.deployed();

    davos = await upgrades.deployProxy(Davos, [0, "DAVOS", "100000000" + wad], {initializer: "initialize"});
    await davos.deployed();

    davosJoin = await upgrades.deployProxy(DavosJoin, [vat.address, davos.address], {initializer: "initialize"});
    await davosJoin.deployed();

    _ilkCeMatic = ethers.utils.formatBytes32String("aMATICc");
    collateral = ethers.utils.formatBytes32String("aMATICc");

    amaticcJoin = await upgrades.deployProxy(GemJoin, [vat.address, _ilkCeMatic, amaticc.address], {initializer: "initialize"});
    await amaticcJoin.deployed();

    jug = await upgrades.deployProxy(Jug, [vat.address], {initializer: "initialize"});
    await jug.deployed();

    vow = await upgrades.deployProxy(Vow, [vat.address, davosJoin.address, deployer.address], {initializer: "initialize"});
    await vow.deployed();

    dog = await upgrades.deployProxy(Dog, [vat.address], {initializer: "initialize"});
    await dog.deployed();

    clip = await upgrades.deployProxy(Clip, [vat.address, spot.address, dog.address, _ilkCeMatic], {initializer: "initialize"});
    await clip.deployed();
  
    // oracle = await upgrades.deployProxy(Oracle, ["0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada"], {initializer: "initialize"});
    oracle = await Oracle.deploy()
    await oracle.deployed();

    abacus = await upgrades.deployProxy(Abacus, [], {initializer: "initialize"});
    await abacus.deployed();

    // Contracts Fetching
    DgtRewards = await hre.ethers.getContractFactory("DgtRewards");

    // Contracts deployment
    rewards = await upgrades.deployProxy(DgtRewards, [vat.address, ethUtils.parseEther('1').toString(), 5], {initializer: "initialize"});
    await rewards.deployed();

    // Contracts Fetching
    Rewards = await hre.ethers.getContractFactory("DgtRewards");
    rewards = Rewards.attach(rewards.address);
    AuctionProxy = await hre.ethers.getContractFactory("AuctionProxy");
    let auctionProxy = await AuctionProxy.deploy();
    await auctionProxy.deployed();
    Interaction = await hre.ethers.getContractFactory("Interaction", {
        unsafeAllow: ['external-library-linking'],
        libraries: {
            AuctionProxy: auctionProxy.address
        }
    });
    interaction = await upgrades.deployProxy(Interaction, [
        vat.address,
        spot.address,
        davos.address,
        davosJoin.address,
        jug.address,
        dog.address,
        rewards.address
    ], {
        initializer: "initialize",
        unsafeAllowLinkedLibraries: true,
    });
    await interaction.deployed();
    
    // Vat = await hre.ethers.getContractFactory("Vat");
    vat = Vat.attach(vat.address);
    await vat.rely(interaction.address);
    await rewards.rely(interaction.address);
    await spot.rely(interaction.address);

    // Contracts Fetching
    DavosProvider = await hre.ethers.getContractFactory("DavosProvider");
    DMatic = await hre.ethers.getContractFactory("dMATIC");
    CerosRouter = await hre.ethers.getContractFactory("CerosRouter");
    MasterVault = await hre.ethers.getContractFactory("MasterVault");

    davosProvider = await upgrades.deployProxy(DavosProvider, [dMatic.address, amaticc.address, interaction.address], {initializer: "initialize"});
    await davosProvider.deployed();

    masterVault = MasterVault.attach(masterVault.address);
    dMatic = await DMatic.attach(dMatic.address);
    await dMatic.changeMinter(davosProvider.address);
    await masterVault.changeProvider(davosProvider.address);
    
    await vat.rely(interaction.address);
    await amaticcJoin.rely(interaction.address);
    await dog.rely(interaction.address);
    await jug.rely(interaction.address);
    await clip.rely(interaction.address);
    await vat.rely(amaticcJoin.address)
    await vat.rely(spot.address)
    await vat.rely(davosJoin.address)
    await vat.rely(jug.address)
    await vat.rely(dog.address)
    await vat.rely(clip.address)
    await davos.rely(davosJoin.address)
    await davosJoin.rely(interaction.address);
    await davosJoin.rely(vow.address);
    
    // await interaction.setDavosProvider(amaticc.address, davosProvider.address);
    // await interaction.setCollateralType(masterVault.address, amaticcJoin.address, _ilkCeMatic, clip.address, "1333333333333333333333333333");

    /* ceVault */
    ce_vault = ce_Vault;
    ce_rot = cerosRouter;
    h_provider = davosProvider;
  }

  async function deployMasterVault() {
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    signer1 =  accounts[1];
    // deployer = await impersonateAccount("0x57f9672ba603251c9c03b36cabdbbca7ca8cfcf4");
    // signer1 = await impersonateAccount("0x57f9672ba603251c9c03b36cabdbbca7ca8cfcf4");
    signer2 =  accounts[2];
    signer3 =  accounts[3];

    [swapPool, wNative, cerosToken] = await deploySwapPool();
    wMaticAddress = wNative.address
    aMATICcAddress = cerosToken.address
    swapPoolAddress = swapPool.address

    // Get Contracts
    MasterVault = await ethers.getContractFactory("MasterVault");
    CerosStrategy = await ethers.getContractFactory("CerosYieldConverterStrategy");
    WaitingPool = await ethers.getContractFactory("WaitingPool");
    CeRouter = await ethers.getContractFactory("CerosRouter");
    Token = await ethers.getContractFactory("Token");
    CeaMATICc = await hre.ethers.getContractFactory("CeToken");
    CeVault = await hre.ethers.getContractFactory("CeVault");
    PriceGetter = await hre.ethers.getContractFactory("PriceGetter");
    DMatic = await hre.ethers.getContractFactory("dMATIC");
    
    // Deploy Contracts
    wMatic = await Token.attach(wMaticAddress);
    aMaticc = await Token.attach(aMATICcAddress);
    swapPool = await ethers.getContractAt("SwapPool", swapPoolAddress);
    // ceRouter = await CeRouter.attach(ceRouterAddress);
    
    // priceGetter = await PriceGetter.deploy(dex);
    // await priceGetter.deployed();

    ceaMATICc = await upgrades.deployProxy(CeaMATICc, ["CEROS aMATICc Vault Token", "ceaMATICc"], {initializer: "initialize"});
    await ceaMATICc.deployed();

    ceVault = await upgrades.deployProxy(CeVault, ["CEROS aMATICc Vault", ceaMATICc.address, aMATICcAddress], {initializer: "initialize"});
    await ceVault.deployed();
    ceVaultImp = await upgrades.erc1967.getImplementationAddress(ceVault.address);

    cerosRouter = await upgrades.deployProxy(CeRouter, [aMATICcAddress, wMaticAddress, ceaMATICc.address, ceVault.address, owner.address, 3000, swapPool.address, ZERO_ADDRESS], {initializer: "initialize"}, {gasLimit: 2000000});
    await cerosRouter.deployed();
    cerosRouterImp = await upgrades.erc1967.getImplementationAddress(cerosRouter.address);

    dMatic = await upgrades.deployProxy(DMatic, [], {initializer: "initialize"});
    await dMatic.deployed();

    await ceaMATICc.changeVault(ceVault.address);
    await ceVault.changeRouter(cerosRouter.address);

    const maxDepositFee = 500000, 
          maxWithdrawalFee = 500000,
          maxStrategies = 10,
          waitingPoolCapLimit = 10;

    masterVault = await upgrades.deployProxy(
      MasterVault,
      ["CEROS MATIC Vault Token", "ceMATIC", maxDepositFee, maxWithdrawalFee, wMaticAddress, maxStrategies, swapPoolAddress]
    );
    await masterVault.deployed();
    waitingPool = await upgrades.deployProxy(WaitingPool,
      [masterVault.address, waitingPoolCapLimit]
      );
    await waitingPool.deployed();
    await masterVault.setWaitingPool(waitingPool.address);
    await masterVault.changeProvider(signer1.address)
      destination = cerosRouter.address,
      feeRecipient = deployer.address,
      underlyingToken = wMaticAddress,
      certToekn = aMATICcAddress;
      cerosStrategy = await upgrades.deployProxy(CerosStrategy,
      [destination, feeRecipient, underlyingToken, certToekn, masterVault.address, swapPoolAddress]
    );
    await cerosStrategy.deployed();
    
    return [swapPool, wNative, cerosToken, masterVault, ceaMATICc , ceVault , cerosRouter, dMatic];
  }

  async function deploySwapPool() {
    const { MaxUint256 } = ethers.constants;
    const mintAmount = ethUtils.parseEther("10000000");
    const addAmount = ethUtils.parseEther("30");
  
    [deployer, user1] = await ethers.getSigners();
  
    const LPFactory = await ethers.getContractFactory("LP");
    const SwapPoolFactory = await ethers.getContractFactory("SwapPool");
    const WNativeFactory = await ethers.getContractFactory("WNative");
    const CerosTokenFactory = await ethers.getContractFactory("CerosToken");
  
    lp = await LPFactory.connect(deployer).deploy();
    await lp.deployed();
    wNative = await WNativeFactory.connect(deployer).deploy();
    await wNative.deployed();
    cerosToken = await CerosTokenFactory.connect(deployer).deploy();
    await cerosToken.deployed();
  
    swapPool = await upgrades.deployProxy(
      SwapPoolFactory,
      [wNative.address,
      cerosToken.address,
      lp.address,
      false,
      false],
      {initializer: "initialize"}
    );
    await swapPool.deployed();
  
    await wNative.connect(user1).deposit({ value: mintAmount });
    await cerosToken.connect(user1).mintMe(mintAmount);
  
    await wNative.connect(user1).approve(swapPool.address, MaxUint256);
    await cerosToken.connect(user1).approve(swapPool.address, MaxUint256);
    
    await cerosToken.setRatio(ethUtils.parseEther("0.6"));
    
    // Initialize Contracts
    await lp.setSwapPool(swapPool.address);
    await swapPool.connect(user1).addLiquidity(addAmount, addAmount);
    return [swapPool, wNative, cerosToken];
  } 

  const deployContracts = async () => {
    const Vat = await ethers.getContractFactory("Vat");
    const Spot = await ethers.getContractFactory("Spotter");
    const Davos = await ethers.getContractFactory("Davos");
    const AMATICC = await ethers.getContractFactory("aMATICc");
    const GemJoin = await ethers.getContractFactory("GemJoin");
    const DavosJoin = await ethers.getContractFactory("DavosJoin");
    const Jug = await ethers.getContractFactory("Jug");
    const Oracle = await ethers.getContractFactory("Oracle"); // Mock Oracle
    const Dog = await ethers.getContractFactory("Dog");
    const Clipper = await ethers.getContractFactory("Clipper");
    const LinearDecrease = await ethers.getContractFactory("LinearDecrease");
    const Vow = await ethers.getContractFactory("Vow");
    const DgtToken = await ethers.getContractFactory("DgtToken");
    const DgtRewards = await ethers.getContractFactory("DgtRewards");
    this.AuctionProxy = await ethers.getContractFactory("AuctionProxy");
    auctionProxy = await this.AuctionProxy.connect(deployer).deploy();
    await auctionProxy.deployed();

    const Interaction = await hre.ethers.getContractFactory("Interaction", {
      unsafeAllow: ['external-library-linking'],
      libraries: {
        AuctionProxy: auctionProxy.address
      },
    });

    // Abacus
    abacus = await LinearDecrease.connect(deployer).deploy();
    await abacus.deployed();

    // Core module
    vat = await Vat.connect(deployer).deploy();
    await vat.deployed();
    spot = await Spot.connect(deployer).deploy(vat.address);
    await spot.deployed();

    const rewards = await DgtRewards.connect(deployer).deploy(vat.address);
    await rewards.deployed();
    const dgtToken = await DgtToken.connect(deployer).deploy(ether("100000000").toString(), rewards.address);
    await dgtToken.deployed();

    await dgtToken.rely(rewards.address);
    await rewards.setDgtToken(dgtToken.address);
    await rewards.initPool(collateral, "1000000001847694957439350500"); //6%

    // Davos module
    davos = await Davos.connect(deployer).deploy(97);
    await davos.deployed(); // Stable Coin
    davosJoin = await DavosJoin.connect(deployer).deploy(vat.address, davos.address);
    await davosJoin.deployed();

    // Collateral module
    amaticc = await AMATICC.connect(deployer).deploy();
    await amaticc.deployed(); // Collateral
    amaticcJoin = await GemJoin.connect(deployer).deploy(
      vat.address,
      collateral,
      amaticc.address
    );
    await amaticcJoin.deployed();

    // Rates module
    jug = await Jug.connect(deployer).deploy(vat.address);
    await jug.deployed();

    // External
    oracle = await Oracle.connect(deployer).deploy();
    await oracle.deployed();

    // Auction modules
    dog = await Dog.connect(deployer).deploy(vat.address);
    await dog.deployed();
    clip = await Clipper.connect(deployer).deploy(
      vat.address,
      spot.address,
      dog.address,
      collateral
    );
    await clip.deployed();

    // vow
    vow = await Vow.connect(deployer).deploy(
      vat.address,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero
    );
    await vow.deployed();

    interaction = await upgrades.deployProxy(
      Interaction,
      [
        vat.address,
        spot.address,
        davos.address,
        davosJoin.address,
        jug.address,
        dog.address,
        rewards.address,
      ],
      { deployer }
    );
  };

  const configureAbacus = async () => {
    await abacus.connect(deployer).file(toBytes32("tau"), "1800");
  };

  const configureOracles = async () => {
    const collateral1Price = toWad("400");
    await oracle.connect(deployer).setPrice(collateral1Price);
  };

  const configureVat = async () => {
    await vat.connect(deployer).rely(davosJoin.address);
    await vat.connect(deployer).rely(spot.address);
    await vat.connect(deployer).rely(jug.address);
    await vat.connect(deployer).rely(interaction.address);
    await vat.connect(deployer).rely(dog.address);
    await vat.connect(deployer).rely(clip.address);
    await vat
      .connect(deployer)
      ["file(bytes32,uint256)"](toBytes32("Line"), toRad("20000")); // Normalized DAVOS
    await vat
      .connect(deployer)
      ["file(bytes32,bytes32,uint256)"](
        collateral,
        toBytes32("line"),
        toRad("20000")
      );
    await vat
      .connect(deployer)
      ["file(bytes32,bytes32,uint256)"](
        collateral,
        toBytes32("dust"),
        toRad("1")
      );
  };

  const configureSpot = async () => {
    await spot
      .connect(deployer)
      ["file(bytes32,bytes32,address)"](
        collateral,
        toBytes32("pip"),
        oracle.address
      );
    await spot
      .connect(deployer)
      ["file(bytes32,bytes32,uint256)"](
        collateral,
        toBytes32("mat"),
        "1250000000000000000000000000"
      ); // Liquidation Ratio
    await spot
      .connect(deployer)
      ["file(bytes32,uint256)"](toBytes32("par"), toRay("1")); // It means pegged to 1$
    await spot.connect(deployer).poke(collateral);
  };

  const configureDAVOS = async () => {
    // Initialize DAVOS Module
    await davos.connect(deployer).rely(davosJoin.address);
  };

  const configureDog = async () => {
    await dog.connect(deployer).rely(clip.address);
    await dog
      .connect(deployer)
      ["file(bytes32,address)"](toBytes32("vow"), vow.address);
    await dog
      .connect(deployer)
      ["file(bytes32,uint256)"](toBytes32("Hole"), toRad("10000000"));
    await dog
      .connect(deployer)
      ["file(bytes32,bytes32,uint256)"](
        collateral,
        toBytes32("chop"),
        toWad("1.13")
      );
    await dog
      .connect(deployer)
      ["file(bytes32,bytes32,uint256)"](
        collateral,
        toBytes32("hole"),
        toRad("10000000")
      );
    await dog
      .connect(deployer)
      ["file(bytes32,bytes32,address)"](
        collateral,
        toBytes32("clip"),
        clip.address
      );
  };

  const configureClippers = async () => {
    await clip.connect(deployer).rely(dog.address);
    await clip
      .connect(deployer)
      ["file(bytes32,uint256)"](toBytes32("buf"), toRay("1.2"));
    await clip
      .connect(deployer)
      ["file(bytes32,uint256)"](toBytes32("tail"), "1800");
    await clip
      .connect(deployer)
      ["file(bytes32,uint256)"](toBytes32("cusp"), toRay("0.3"));
    await clip
      .connect(deployer)
      ["file(bytes32,uint256)"](toBytes32("chip"), toWad("0.02"));
    await clip
      .connect(deployer)
      ["file(bytes32,uint256)"](toBytes32("tip"), toRad("100"));

    await clip
      .connect(deployer)
      ["file(bytes32,address)"](toBytes32("vow"), vow.address);
    await clip
      .connect(deployer)
      ["file(bytes32,address)"](toBytes32("calc"), abacus.address);
  };

  const configureVow = async () => {
    await vow.connect(deployer).rely(dog.address);
  };

  const configureJug = async () => {
    const BR = new BigNumber.from("1000000003022266000000000000");
    await jug.connect(deployer)["file(bytes32,uint256)"](toBytes32("base"), BR); // 1% Yearly

    const proxyLike = await (
      await (await ethers.getContractFactory("ProxyLike"))
        .connect(deployer)
        .deploy(jug.address, vat.address)
    ).deployed();
    await jug.connect(deployer).rely(proxyLike.address);
    await proxyLike
      .connect(deployer)
      .jugInitFile(collateral, toBytes32("duty"), "0");

    await jug
      .connect(deployer)
      ["file(bytes32,address)"](toBytes32("vow"), vow.address);
  };

  const configureInteraction = async () => {
    await interaction
      .connect(deployer)
      .setCollateralType(
        amaticc.address,
        amaticcJoin.address,
        collateral,
        clip.address,
        "1333333333333333333333333333"
      );
  };

  before("setup", async () => {
    [deployer, signer1, signer2, signer3] = await ethers.getSigners();

    // await deployContracts();
  
    await init();
    await configureOracles();
    await configureVat();
    await configureSpot();
    await configureDAVOS();
    await configureDog();
    await configureClippers();
    await configureVow();
    await configureJug();
    await configureInteraction();

    await networkSnapshotter.firstSnapshot();
  });

  afterEach("revert", async () => await networkSnapshotter.revert());

  xit("example", async () => {
    await amaticc.connect(deployer).mint(signer1.address, toWad("10000").toString());
    // Approve and send some collateral inside. collateral value == 400 == `dink`
    let dink = toWad("1000").toString();

    await amaticc.connect(signer1).approve(interaction.address, dink);
    // Deposit collateral(aMATICc) to the interaction contract
    await interaction.connect(signer1).deposit(amaticc.address, dink);

    let s1Balance = await amaticc.balanceOf(signer1.address);
    expect(s1Balance).to.equal(toWad("9000"));
    
    let s1DAVOSBalance = await davos.balanceOf(signer1.address);
    expect(s1DAVOSBalance).to.equal("0");

    let free = await interaction
      .connect(signer1)
      .free(amaticc.address, signer1.address);
    expect(free).to.equal("0");
    let locked = await interaction
      .connect(signer1)
      .locked(amaticc.address, signer1.address);
    expect(locked).to.equal(toWad("1000"));

    // Locking collateral and borrowing DAVOS
    // We want to draw 60 DAVOS == `dart`
    // Maximum available for borrow = (1000 * 400) * 0.8 = 320000
    let dart = toWad("70");
    await interaction.connect(signer1).borrow(amaticc.address, dart);

    free = await interaction
      .connect(signer1)
      .free(amaticc.address, signer1.address);
    expect(free).to.equal("0");
    locked = await interaction
      .connect(signer1)
      .locked(amaticc.address, signer1.address);
    expect(locked).to.equal(dink);
    s1DAVOSBalance = await davos.balanceOf(signer1.address);
    expect(s1DAVOSBalance).to.equal(dart);

    // User locked 1000 aMATICc with price 400 and rate 0.8 == 320000$ collateral worth
    // Borrowed 70$ => available should equal to 320000 - 70 = 319930.
    let available = await interaction
      .connect(signer1)
      .availableToBorrow(amaticc.address, signer1.address);
    expect(available).to.equal(toWad("319930"));

    // 1000 * 0.0875 * 0.8 == 70$
    let liquidationPrice = await interaction
      .connect(signer1)
      .currentLiquidationPrice(amaticc.address, signer1.address);
    expect(liquidationPrice).to.equal(toWad("0.0875"));

    // (1000 + 1000) * 0.04375 * 0.8 == 70$
    let estLiquidationPrice = await interaction
      .connect(signer1)
      .estimatedLiquidationPrice(amaticc.address, signer1.address, toWad("1000"));
    expect(estLiquidationPrice).to.equal(toWad("0.04375"));

    let availableYear = await interaction
      .connect(signer1)
      .availableToBorrow(amaticc.address, signer1.address);

    console.log(availableYear.toString());

    // Update Stability Fees
    await advanceTime(31536000);
    await interaction.connect(signer1).drip(amaticc.address);

    availableYear = await interaction
      .connect(signer1)
      .availableToBorrow(amaticc.address, signer1.address);
    console.log(availableYear.toString());
  });

  it("auction started as expected", async () => {
    await amaticc.connect(deployer).mint(signer1.address, toWad("10000").toString());
    // Approve and send some collateral inside. collateral value == 400 == `dink`
    const dink = toWad("10").toString();
    
    await amaticc.connect(signer1).approve(interaction.address, dink);
    // Deposit collateral(aMATICc) to the interaction contract
    await interaction.connect(signer1).deposit(signer1.address, amaticc.address, dink);
    const dart = toWad("1000").toString();
    await interaction.connect(signer1).borrow(amaticc.address, dart);
    
    // change collateral price
    await oracle.connect(deployer).setPrice(toWad("124").toString());
    await spot.connect(deployer).poke(collateral);
    await interaction
    .connect(deployer)
    .startAuction(amaticc.address, signer1.address, deployer.address);

    const sale = await clip.sales(1);
    expect(sale.usr).to.not.be.equal(ethers.utils.AddressZero);
  });

  xit("auction works as expected", async () => {
    await amaticc.connect(deployer).mint(signer1.address, toWad("10000").toString());
    await amaticc.connect(deployer).mint(signer2.address, toWad("10000").toString());
    await amaticc.connect(deployer).mint(signer3.address, toWad("10000").toString());

    const dink1 = toWad("10").toString();
    const dink2 = toWad("1000").toString();
    const dink3 = toWad("1000").toString();
    await amaticc.connect(signer1).approve(interaction.address, dink1);
    await amaticc.connect(signer2).approve(interaction.address, dink2);
    await amaticc.connect(signer3).approve(interaction.address, dink3);
    await interaction.connect(signer1).deposit(signer1.address, amaticc.address, dink1);
    await interaction.connect(signer2).deposit(signer2.address, amaticc.address, dink2);
    await interaction.connect(signer3).deposit(signer3.address, amaticc.address, dink3);

    const dart1 = toWad("1000").toString();
    const dart2 = toWad("5000").toString();
    const dart3 = toWad("5000").toString();
    await interaction.connect(signer1).borrow(amaticc.address, dart1);
    await interaction.connect(signer2).borrow(amaticc.address, dart2);
    await interaction.connect(signer3).borrow(amaticc.address, dart3);

    await oracle.connect(deployer).setPrice(toWad("124").toString());
    await spot.connect(deployer).poke(collateral);

    const auctionId = BigNumber.from(1);

    let res = await interaction
      .connect(deployer)
      .startAuction(amaticc.address, signer1.address, deployer.address);
    expect(res).to.emit(clip, "Kick");

    await vat.connect(signer2).hope(clip.address);
    await vat.connect(signer3).hope(clip.address);

    await davos
      .connect(signer2)
      .approve(davosJoin.address, ethers.constants.MaxUint256);
    await davos
      .connect(signer3)
      .approve(davosJoin.address, ethers.constants.MaxUint256);
    await davosJoin.connect(signer2).join(signer2.address, toWad("5000").toString());
    await davosJoin.connect(signer3).join(signer3.address, toWad("5000").toString());

    await clip
      .connect(signer2)
      .take(auctionId, toWad("7").toString(), toRay("500").toString(), signer2.address, []);

    await clip
      .connect(signer3)
      .take(auctionId, toWad("7").toString(), toRay("500").toString(), signer2.address, []);

    const sale = await clip.sales(auctionId);
    expect(sale.pos).to.equal(0);
    expect(sale.tab).to.equal(0);
    expect(sale.lot).to.equal(0);
    expect(sale.tic).to.equal(0);
    expect(sale.top).to.equal(0);
    expect(sale.usr).to.equal(ethers.constants.AddressZero);
  });

  xit("auction works as expected", async () => {
    await amaticc.connect(deployer).mint(signer1.address, toWad("10000").toString());
    await amaticc.connect(deployer).mint(signer2.address, toWad("10000").toString());
    await amaticc.connect(deployer).mint(signer3.address, toWad("10000").toString());

    const dink1 = toWad("10").toString();
    const dink2 = toWad("1000").toString();
    const dink3 = toWad("1000").toString();
    await amaticc.connect(signer1).approve(interaction.address, dink1);
    await amaticc.connect(signer2).approve(interaction.address, dink2);
    await amaticc.connect(signer3).approve(interaction.address, dink3);
    await interaction.connect(signer1).deposit(signer1.address, amaticc.address, dink1);
    await interaction.connect(signer2).deposit(signer2.address, amaticc.address, dink2);
    await interaction.connect(signer3).deposit(signer3.address, amaticc.address, dink3);

    const dart1 = toWad("1000").toString();
    const dart2 = toWad("5000").toString();
    const dart3 = toWad("5000").toString();
    await interaction.connect(signer1).borrow(amaticc.address, dart1);
    await interaction.connect(signer2).borrow(amaticc.address, dart2);
    await interaction.connect(signer3).borrow(amaticc.address, dart3);

    await oracle.connect(deployer).setPrice(toWad("124").toString());
    await spot.connect(deployer).poke(collateral);

    const auctionId = BigNumber.from(1);

    let res = await interaction
      .connect(deployer)
      .startAuction(amaticc.address, signer1.address, deployer.address);
    expect(res).to.emit(clip, "Kick");

    await vat.connect(signer2).hope(clip.address);
    await vat.connect(signer3).hope(clip.address);

    await davos.connect(signer2).approve(interaction.address, toWad("700").toString());
    await davos.connect(signer3).approve(interaction.address, toWad("700").toString());

    await advanceTime(1000);

    const amaticcSigner2BalanceBefore = await amaticc.balanceOf(signer2.address);
    const amaticcSigner3BalanceBefore = await amaticc.balanceOf(signer3.address);

    await interaction
      .connect(signer2)
      .buyFromAuction(
        amaticc.address,
        auctionId,
        toWad("7").toString(),
        toRay("100").toString(),
        signer2.address,
        []
      );

    await interaction
      .connect(signer3)
      .buyFromAuction(
        amaticc.address,
        auctionId,
        toWad("5").toString(),
        toRay("100").toString(),
        signer3.address,
        []
      );


    const amaticcSigner2BalanceAfter = await amaticc.balanceOf(signer2.address);
    const amaticcSigner3BalanceAfter = await amaticc.balanceOf(signer3.address);

    expect(amaticcSigner2BalanceAfter.sub(amaticcSigner2BalanceBefore)).to.be.equal(toWad("7").toString());
    expect(amaticcSigner3BalanceAfter.sub(amaticcSigner3BalanceBefore)).to.be.equal(toWad("3").toString());

    const sale = await clip.sales(auctionId);
    expect(sale.pos).to.equal(0);
    expect(sale.tab).to.equal(0);
    expect(sale.lot).to.equal(0);
    expect(sale.tic).to.equal(0);
    expect(sale.top).to.equal(0);
    expect(sale.usr).to.equal(ethers.constants.AddressZero);
  });
});
