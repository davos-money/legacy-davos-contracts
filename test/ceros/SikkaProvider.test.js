const { expect, assert } = require("chai");
const { ethers, waffle } = require("hardhat");
const ethUtils = ethers.utils;

const web3 = require('web3');

const toBN = web3.utils.toBN;
const { constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");

let owner, staker_1, staker_2,
    amount_1, amount_2,
    amaticc, amaticb, wmatic, sMatic, sikka, ce_Amaticc_join, collateral, clip,
    ce_vault, ce_token, interaction, pool, h_provider, ce_rot, vat, _ilkCeMatic;

describe('Sikka Provider', () => {
    before(async function () {
        await init();
    });
    describe('Basic functionality', async () => {
        it('staker_1 provides MATIC', async () => {
            ratio = await amaticc.ratio();
            await expect(
                h_provider.connect(staker_1).provide({ value: amount_2.toString() })
            ).to.emit(h_provider, "Deposit")
                .withArgs(
                    staker_1.address,
                    amount_2.toString()
                );

            console.log(`------- balance after staker_1 provided(${amount_2.toString()} MATIC) -------`);
            await printBalances();
        });
        it('staker_1 releases MATIC', async () => {
            await expect(
                h_provider.connect(staker_1).release(staker_1.address, amount_1.toString())
            ).to.emit(h_provider, "Withdrawal")
                .withArgs(
                    staker_1.address,
                    staker_1.address,
                    amount_1.toString()
                );
            console.log(`------- balance after staker_1 provided(${amount_2.toString()} MATIC) -------`);
            await printBalances();
        });
    });
    describe('Dao functionality', async () => {
        it('daoBurn()', async () => {
            await expect(
                h_provider.connect(staker_1).daoBurn(staker_1.address, toBN('1000').toString())
            ).to.be.revertedWith("AuctionProxy: not allowed");
            // change DAO to check access easily
            await h_provider.connect(owner).changeProxy(intermediary.address);

            await h_provider.connect(intermediary).daoBurn(staker_1.address, toBN('1000').toString());
        });
        it('daoMint()', async () => {
            await expect(
                h_provider.connect(staker_1).daoMint(staker_1.address, toBN('1000').toString())
            ).to.be.revertedWith("AuctionProxy: not allowed");

            await h_provider.connect(intermediary).daoMint(staker_1.address, toBN('1000').toString());
        });
    });
    describe("Updating functionality", async () => {
        let example_address = "0xF92Ff9DBda8B780a9C7BC2d2b37db9D74D1BAcd6";
        it("change Dao and verify allowances", async () => {
            // try to update from not owner and waiting for a revert
            await expect(
                h_provider.connect(staker_1).changeDao(example_address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
            // update
            await h_provider.connect(owner).changeDao(example_address);
            // check allowances for new Dao
            expect(
                await masterVault.allowance(h_provider.address, example_address)
            ).to.be.equal(constants.MAX_UINT256.toString());
        });
        it('change ceToken and verify allowances', async () => {
            // try to update from not owner and waiting for a revert
            await expect(
                h_provider.connect(staker_1).changeCeToken(example_address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
            /* ceToken */ // deploy mock smart contract
            const CeToken = await ethers.getContractFactory("CeToken");
            mockCeToken = await CeToken.deploy();
            await mockCeToken.initialize("Mock Ceros token", "mock");
            // update
            await h_provider.connect(owner).changeCeToken(mockCeToken.address);
            // check allowances for new Dao
            expect(
                await mockCeToken.allowance(h_provider.address, example_address)
            ).to.be.equal(constants.MAX_UINT256.toString());
        });
        it("change collateral token", async () => {
            // try to update from not owner and waiting for a revert
            await expect(
                h_provider.connect(staker_1).changeCollateralToken(example_address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
            // update
            await expect(
                h_provider.connect(owner).changeCollateralToken(example_address)
            ).to.emit(h_provider, "ChangeCollateralToken")
                .withArgs(example_address);
            // check allowances for new Dao
        });
    });
});

async function init() {
    [owner, intermediary, bc_operator, staker_1, staker_2, operator] = await ethers.getSigners();

    let wad = "000000000000000000"; // 18 Decimals
    amount_1 = toBN('10000000020000000000');
    amount_2 = toBN('20000000020000000000');

    const Sikka = await ethers.getContractFactory("Sikka");
    const Vat = await ethers.getContractFactory("Vat");
    const Dog = await ethers.getContractFactory("Dog");
    const Spot = await ethers.getContractFactory("Spotter");

    // /* sikkaJoin */
    const SikkaJoin = await ethers.getContractFactory("SikkaJoin");
    const GemJoin = await ethers.getContractFactory("GemJoin");
    
    // /* jug */
    const Jug = await ethers.getContractFactory("Jug");
    const Vow = await ethers.getContractFactory("Vow");
    const Clip = await ethers.getContractFactory("Clipper");
    const Oracle = await ethers.getContractFactory("MaticOracle");
    const Abacus = await ethers.getContractFactory("LinearDecrease");

    let [swapPool, wNative, cerosToken, masterVault, ceaMATICc , ce_Vault , cerosRouter, sMatic] = await deployMasterVault()

    // wmatic = wNative;
    amaticc = cerosToken;
    ce_vault = ce_Vault;
    ce_rot = cerosRouter;

    vat = await upgrades.deployProxy(Vat, [], {initializer: "initialize"});
    await vat.deployed();

    spot = await upgrades.deployProxy(Spot, [vat.address], {initializer: "initialize"});
    await spot.deployed();

    sikka = await upgrades.deployProxy(Sikka, [0, "SIKKA", "100000000" + wad], {initializer: "initialize"});
    await sikka.deployed();

    sikkaJoin = await upgrades.deployProxy(SikkaJoin, [vat.address, sikka.address], {initializer: "initialize"});
    await sikkaJoin.deployed();

    _ilkCeMatic = ethers.utils.formatBytes32String("ceMATIC");
    collateral = ethers.utils.formatBytes32String("ceMATIC");

    ceaMATICcJoin = await upgrades.deployProxy(GemJoin, [vat.address, _ilkCeMatic, masterVault.address], {initializer: "initialize"});
    await ceaMATICcJoin.deployed();

    jug = await upgrades.deployProxy(Jug, [vat.address], {initializer: "initialize"});
    await jug.deployed();

    vow = await upgrades.deployProxy(Vow, [vat.address, sikkaJoin.address, deployer.address], {initializer: "initialize"});
    await vow.deployed();

    dog = await upgrades.deployProxy(Dog, [vat.address], {initializer: "initialize"});
    await dog.deployed();

    clip = await upgrades.deployProxy(Clip, [vat.address, spot.address, dog.address, _ilkCeMatic], {initializer: "initialize"});
    await clip.deployed();
  
    oracle = await upgrades.deployProxy(Oracle, ["0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada"], {initializer: "initialize"});
    await oracle.deployed();

    abacus = await upgrades.deployProxy(Abacus, [], {initializer: "initialize"});
    await abacus.deployed();

    // Contracts Fetching
    IkkaRewards = await hre.ethers.getContractFactory("IkkaRewards");

    // Contracts deployment
    rewards = await upgrades.deployProxy(IkkaRewards, [vat.address, ethUtils.parseEther('1').toString()], {initializer: "initialize"});
    await rewards.deployed();

    // Contracts Fetching
    Rewards = await hre.ethers.getContractFactory("IkkaRewards");
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
        sikka.address,
        sikkaJoin.address,
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
    SikkaProvider = await hre.ethers.getContractFactory("SikkaProvider");
    SMatic = await hre.ethers.getContractFactory("sMATIC");
    CerosRouter = await hre.ethers.getContractFactory("CerosRouter");
    MasterVault = await hre.ethers.getContractFactory("MasterVault");

    sikkaProvider = await upgrades.deployProxy(SikkaProvider, [sMatic.address, masterVault.address, interaction.address], {initializer: "initialize"});
    await sikkaProvider.deployed();

    masterVault = MasterVault.attach(masterVault.address);
    sMatic = await SMatic.attach(sMatic.address);
    await sMatic.changeMinter(sikkaProvider.address);
    await masterVault.changeProvider(sikkaProvider.address);
    
    await vat.rely(interaction.address);
    await ceaMATICcJoin.rely(interaction.address);
    await sikkaJoin.rely(interaction.address);
    await sikkaJoin.rely(vow.address);
    await dog.rely(interaction.address);
    await jug.rely(interaction.address);
    await clip.rely(interaction.address);
    await vat.rely(ceaMATICcJoin.address)
    await vat.rely(spot.address)
    await vat.rely(sikkaJoin.address)
    await vat.rely(jug.address)
    await vat.rely(dog.address)
    await vat.rely(clip.address)
    await interaction.setSikkaProvider(masterVault.address, sikkaProvider.address);
    await interaction.setCollateralType(masterVault.address, ceaMATICcJoin.address, _ilkCeMatic, clip.address, "1333333333333333333333333333");

    /* ceVault */
    ce_vault = ce_Vault;
    ce_rot = cerosRouter;
    h_provider = sikkaProvider;
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
    SMatic = await hre.ethers.getContractFactory("sMATIC");
    
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

    sMatic = await upgrades.deployProxy(SMatic, [], {initializer: "initialize"});
    await sMatic.deployed();

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
    
    return [swapPool, wNative, cerosToken, masterVault, ceaMATICc , ceVault , cerosRouter, sMatic];
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

async function printBalances() {
    matic_balance = await waffle.provider.getBalance(staker_1.address);
    console.log(`MATIC balance(staker_1): ${matic_balance.toString()}`);
    // aMATICc balance of staker_1
    console.log(`balance of staker_1 in aMATICc: ${(await amaticc.balanceOf(staker_1.address)).toString()}`);
    // aMATICc balance of ce_vault
    console.log(`balance of ce_vault in aMATICc: ${(await amaticc.balanceOf(ce_vault.address)).toString()}`);
    // sMATIC balance of staker_1
    console.log(`balance of staker_1 in sMATIC: ${(await sMatic.balanceOf(staker_1.address)).toString()}`);
    // sMATIC supply
    console.log(`supply sMATIC: ${(await sMatic.totalSupply()).toString()}`);
    // ceToken balance of staker_1
    console.log(`balance of staker_1 in ceToken: ${(await ceaMATICc.balanceOf(staker_1.address)).toString()}`);
    // ceToken supply
    console.log(`supply ceToken: ${(await ceaMATICc.totalSupply()).toString()}`);
    // Available rewards
    console.log(`yield for staker_1: ${(await ce_vault.getYieldFor(staker_1.address)).toString()}`);
    console.log(`yield for sikka: ${(await ce_vault.getYieldFor(h_provider.address)).toString()}`);
    console.log(`current ratio: ${(await amaticc.ratio()).toString()}`);
}
