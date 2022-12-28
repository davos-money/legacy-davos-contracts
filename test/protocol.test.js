const {ethers, upgrades} = require("hardhat");
const { expect, assert } = require("chai");
const { ether } = require("@openzeppelin/test-helpers");
const NetworkSnapshotter = require("../helpers/NetworkSnapshotter");
const { parseEther } = ethers.utils;
const web3 = require('web3');

const toBN = web3.utils.toBN;
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const {
    toWad,
    toRay,
    advanceTime,
} = require("./helpers/utils");

let owner, signer1, sikka, clip, interaction, auctionProxy, vat, _ilkCeMatic;

let swapPool, wNative, cerosToken, masterVault, ceaMATICc, cerosRouter, sMatic, sikkaProvider;

let _chainId, _mat, _ikkaRewardsPoolLimitInEth, _vat_Line, _vat_line,
    _spot_par, _dog_Hole, _dog_hole, _dog_chop, _abacus_tau, _clip_buf, _clip_tail,
    _clip_cusp, _clip_chip, _clip_tip, _clip_stopped, _multisig, _vat_dust;

describe('sikka-protocol', () => {
    const networkSnapshotter = new NetworkSnapshotter();

    before(async function () {
        await init();
        await networkSnapshotter.firstSnapshot();
    });

    afterEach("revert", async () => await networkSnapshotter.revert());

    describe('provide, borrow, payback & release flow', async () => {
        it('signer1 provides MATIC', async () => {

            await cerosToken.setRatio(parseEther("1"));
            
            await swapPool.setFee(100, 3);   // stake fee --> 0.1%
            await swapPool.setFee(100, 4);   // unstake fee --> 0.1%

            
            // <------------------------------------ provide() ----------------------------------------->
            
            
            // signer1 provides 10 Matic
            const depositAmount = parseEther("10");
            const signer1_sMaticBalanceBefore = await getTokenBalance(signer1.address, sMatic.address);
            let swapFee = (depositAmount.mul(await swapPool.stakeFee())).div(await swapPool.FEE_MAX());
            
            // swapFee will be charged for deposits so actualDeposit amount is:
            const actualDeposit = depositAmount.sub(swapFee);
            await expect(
                sikkaProvider.connect(signer1).provide({ value: depositAmount.toString() })
            )
            .to.emit(sikkaProvider, "Deposit")
            .withArgs(
                signer1.address,
                actualDeposit.toString()
            );

            // signer1 receives sMatic in return eq. to depositAmount - swapFee(Matic --> aMaticc)
            const signer1_sMaticBalanceAfter = await getTokenBalance(signer1.address, sMatic.address);
            expect(signer1_sMaticBalanceAfter).to.be.equal(signer1_sMaticBalanceBefore.add(depositAmount).sub(swapFee));

            // wMatic balance of MasterVault should match the depositAmount
            const masterVault_wMatic_balance = await getTokenBalance(masterVault.address, wNative.address);
            expect(masterVault_wMatic_balance).to.be.equal(depositAmount);

            // totalSupply of masterVault should match (depositAmount - swapFee)
            const masterVault_totalSupply = await masterVault.totalSupply();
            expect(masterVault_totalSupply).to.be.equal(actualDeposit);

            // deposits in makerDAO should match provided amount
            const deposits = await interaction.deposits(masterVault.address);
            expect(deposits).to.be.equal(actualDeposit);

            // ceMaticJoin's balance should match deposit amount 
            const ceMaticJoinBalance = await getTokenBalance(gemJoin.address, masterVault.address);
            expect(ceMaticJoinBalance).to.be.equal(actualDeposit);


            // <------------------------------------- borrow() --------------------------------------->
       
            
            // signer1 borrows max borrowable amount
            // check maxBorrowable Amount
            const vat_ilks = await vat.ilks(_ilkCeMatic);
            const availableToBorrowBefore = await interaction.availableToBorrow(masterVault.address, signer1.address);
            const locked = await interaction.locked(masterVault.address, signer1.address);
            
            // check borrowable amount
            expect(actualDeposit).to.be.equal(locked);
            assert.equal(Number(availableToBorrowBefore), (actualDeposit.mul(vat_ilks.spot)) / 1e27);
            
            // borrow maxAmount
            const borrowAmount = availableToBorrowBefore
            await expect(
                interaction.connect(signer1).borrow(
                masterVault.address,
                borrowAmount
            )).to.emit(interaction, "Borrow");
            
            // check borrowed Amount
            const availableToBorrowAfter = await interaction.availableToBorrow(masterVault.address, signer1.address);
            assert.equal(availableToBorrowAfter, availableToBorrowBefore - borrowAmount);
            expect((await interaction.borrowed(masterVault.address, signer1.address))).to.be.equal(borrowAmount.add(100));
            expect(await interaction.totalPegLiquidity()).to.be.equal(borrowAmount);


            // <----------- Set ceros-strategy and allocate funds from masterVault() ------------>


            // set strategy and allocate funds avaialble in masterVault to strategies
            const allocation = 80 * 10000   // 80%
            await masterVault.setStrategy(cerosStrategy.address, allocation);
            
            const availableToWithdrawBefore = await masterVault.availableToWithdraw();
            expect(availableToWithdrawBefore).to.be.equal(depositAmount);

            await masterVault.allocate();
            
            const availableToWithdrawAfter = await masterVault.availableToWithdraw();
            assert.equal(availableToWithdrawAfter, (depositAmount - (depositAmount * allocation) / 1e6));
            
            strategyParams = await masterVault.strategyParams(cerosStrategy.address);
            //swap fee charged on amount deposited to cerosStrategy
            swapFee = (((depositAmount * allocation) / 1e6 ) * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
            assert.equal(depositAmount.toString(), Number(availableToWithdrawAfter) + Number(strategyParams.debt) + swapFee);
            assert.equal(strategyParams.debt, (depositAmount * allocation) / 1e6 - swapFee);


            // <----------------------------------- payback() ------------------------------------------->


            // approve sikka token for interaction contract
            await sikka.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256);

            // cannot leave dust(set to 10 sikka) 
            const invalidPaybackAmount = borrowAmount.sub(parseEther("1"))
            await expect(
                interaction.connect(signer1).payback(
                masterVault.address,
                invalidPaybackAmount
            )).to.be.revertedWith("Vat/dust");
            
            // should be able to payback (borrowed - dust) amount
            const validPaybackAmount = (await interaction.borrowed(masterVault.address, signer1.address)).sub(parseEther("10")).sub("100")
            await expect(
                interaction.connect(signer1).payback(
                masterVault.address,
                validPaybackAmount
            )).to.emit(interaction, "Payback"); 
            expect(await interaction.borrowed(masterVault.address, signer1.address)).to.be.equal(parseEther("10").add("100"));

            // payback remaining debt
            const remainingPaybackAmount = (await interaction.borrowed(masterVault.address, signer1.address));
            await interaction.connect(signer1).payback(
                masterVault.address,
                remainingPaybackAmount.sub("100")
            )
            expect(await interaction.borrowed(masterVault.address, signer1.address)).to.be.equal(0);


            // <----------------------------------- release() ------------------------------------------->
            
            // check locked amount
            expect(await interaction.locked(masterVault.address, signer1.address)).to.be.equal(actualDeposit);
            
            // cannot withdraw more than locked
            await expect(
                sikkaProvider.connect(signer1).release(signer1.address, actualDeposit.add("1000"))
            ).to.be.rejectedWith("");

            // release actual deposited amount
            await expect(
                sikkaProvider.connect(signer1).release(signer1.address,actualDeposit.toString())
            )
            .to.emit(sikkaProvider, "Withdrawal")
            .withArgs(
                signer1.address,
                signer1.address,
                actualDeposit.toString()
            );
            
            // released everything and now locked amount should be 0
            expect(await interaction.locked(masterVault.address, signer1.address)).to.be.equal(0);


            // <--------------------------------- claimYield() ----------------------------------->


            // when ratio decreases, generated yield can be claimed through cerosStrategy
            // set ratio from 1 to 0.5
            await cerosToken.setRatio(parseEther("0.5"));
            const generatedyield = await cerosRouter.getYieldFor(cerosStrategy.address);
            const certTokenBalanceBefore = await cerosToken.balanceOf(deployer.address);
            await cerosStrategy.connect(deployer).harvest();
            const certTokenBalanceAfter = await cerosToken.balanceOf(deployer.address);
            assert.equal(Number(certTokenBalanceAfter), Number(certTokenBalanceBefore) + Number(generatedyield));
        });
    });

    describe('DAO functionality', async () => {

        it("auction flow", async () => {
            const collateral1Price = toWad("400");
            await oracle.connect(deployer).setPrice(collateral1Price);

            await interaction.poke(collateralToken.address);
            await interaction.drip(collateralToken.address);
            
            const dink1 = toWad("10").toString();
            const dink2 = toWad("1000").toString();
            const dink3 = toWad("1000").toString();


            // <--------------------------- Signer 1,2 & 3 provides() ------------------------------->
            
            
            await sikkaProvider.connect(signer1).provide( {value: dink1} );
            await sikkaProvider.connect(signer2).provide( {value: dink2} );
            await sikkaProvider.connect(signer3).provide( {value: dink3} );
            
            const dart1 = toWad("1000").toString();
            const dart2 = toWad("5000").toString();
            const dart3 = toWad("5000").toString();

            
            // <--------------------------- Signer 1,2 & 3 borrows() ------------------------------->
            

            await interaction.connect(signer1).borrow(masterVault.address, dart1);
            await interaction.connect(signer2).borrow(masterVault.address, dart2);
            await interaction.connect(signer3).borrow(masterVault.address, dart3);
            

            // price drops from 400 -> 124 
            await oracle.connect(deployer).setPrice(toWad("124").toString());
            await spot.connect(deployer).poke(collateral);
            
            
            // <--------------------------- Start auction for singer1 -------------------------------->
            
            
            const auctionId = 1;
            let res = await interaction
              .connect(deployer)
              .startAuction(masterVault.address, signer1.address, deployer.address);
            expect(res).to.emit(clip, "Kick");
        
            await vat.connect(signer2).hope(clip.address);
            await vat.connect(signer3).hope(clip.address);
        
            await sikka.connect(signer2).approve(interaction.address, toWad("10000").toString());
            await sikka.connect(signer3).approve(interaction.address, toWad("10000").toString());
        
            await advanceTime(1000);
        
            const signer2MaticBalanceBefore = await ethers.provider.getBalance(signer2.address);
        
            // signer2 buys from auction
            const tx = await interaction.connect(signer2).buyFromAuction(
                masterVault.address,
                auctionId,
                toWad("7").toString(),
                toRay("150").toString(),
                signer2.address,
            );
            const receipt = await tx.wait(1)
            const txFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
            
            // signer3 buys from auction
            await interaction.connect(signer3).buyFromAuction(
                masterVault.address,
                auctionId,
                toWad("3").toString(),
                toRay("150").toString(),
                signer3.address,
            );

            const signer2MaticBalanceAfter = await ethers.provider.getBalance(signer2.address);
            const sale = await clip.sales(auctionId);
        
            // check signer 2 & 3 Matic balance
            expect(signer2MaticBalanceAfter.sub(signer2MaticBalanceBefore).add(txFee)).to.be.equal(toWad("7").toString());
            
            // check sale params
            expect(sale.pos).to.equal(0);
            expect(sale.tab).to.equal(0);
            expect(sale.lot).to.equal(0);
            expect(sale.tic).to.equal(0);
            expect(sale.top).to.equal(0);
            expect(sale.usr).to.equal(ethers.constants.AddressZero);
        });
    });
});

async function getTokenBalance(account, token) {
    const tokenContract = await ethers.getContractAt("ERC20Upgradeable", token);
    return await tokenContract.balanceOf(account);
}

async function init() {
    [owner, intermediary, bc_operator, signer1, staker_2, operator] = await ethers.getSigners();

    [swapPool, wNative, cerosToken, masterVault, ceaMATICc , ce_Vault , cerosRouter, sMatic] = await deployMasterVault()

    interaction = await deployInteraction(masterVault);

    sikkaProvider = await deploySikkaProvider(sMatic, masterVault, interaction)
}

async function deployMasterVault() {
    accounts = await ethers.getSigners();
    
    [deployer, signer1, signer2, signer3] = accounts;

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
    const mintAmount = parseEther("10000000");
    const addAmount = parseEther("30");
  
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
    
    await cerosToken.setRatio(parseEther("1"));
    
    // Initialize Contracts
    await lp.setSwapPool(swapPool.address);
    await swapPool.connect(user1).addLiquidity(addAmount, addAmount);
    return [swapPool, wNative, cerosToken];
}

async function deployInteraction(masterVault) {

    _mat = "1333333333333333333333333333";
    _ikkaRewardsPoolLimitInEth = "100000000";
    _vat_Line = "5000000";
    _vat_line = "5000000";
    _vat_dust = "10";
    _spot_par = "1";
    _dog_Hole = "50000000";
    _dog_hole = "50000000";
    _dog_chop = "1100000000000000000";
    _abacus_tau = "36000";
    _clip_buf = "1100000000000000000000000000";
    _clip_tail = "10800";
    _clip_cusp = "600000000000000000000000000";
    _clip_chip = "100000000000000";
    _clip_tip = "10";
    _clip_stopped = "0";
    _chainId = "97";


    // _mat = "1333333333333333333333333333";
    // _ikkaRewardsPoolLimitInEth = "100000000";
    // _vat_Line = "5000000";
    // _vat_line = "5000000";
    // _vat_dust = "100";
    // _spot_par = "1";
    // _dog_Hole = "50000000";
    // _dog_hole = "50000000";
    // _dog_chop = "1100000000000000000";
    // _abacus_tau = "36000";
    // _clip_buf = "1100000000000000000000000000";
    // _clip_tail = "10800";
    // _clip_cusp = "600000000000000000000000000";
    // _clip_chip = "100000000000000";
    // _clip_tip = "10";
    // _clip_stopped = "0";
    // _chainId = "97";

    collateral = ethers.utils.formatBytes32String("ceMATIC");

    wad = "000000000000000000", // 18 Decimals
    ray = "000000000000000000000000000", // 27 Decimals
    rad = "000000000000000000000000000000000000000000000", // 45 Decimals
    ONE = 10 ** 27;
    YEAR = 31556952;

    // Signer
    [deployer] = await ethers.getSigners();
    _multisig = deployer.address;

    collateralToken = masterVault;

    _ilkCeMatic = ethers.utils.formatBytes32String("ceMATIC");

    // Contracts Fetching
    CeaMATICc = await hre.ethers.getContractFactory("CeToken");
    CeVault = await hre.ethers.getContractFactory("CeVault");
    AMATICb = await hre.ethers.getContractFactory("aMATICb");
    AMATICc = await hre.ethers.getContractFactory("aMATICc");
    SMatic = await hre.ethers.getContractFactory("sMATIC");
    CerosRouter = await hre.ethers.getContractFactory("CerosRouter");
    SikkaProvider = await hre.ethers.getContractFactory("SikkaProvider");
    Vat = await hre.ethers.getContractFactory("Vat");
    Spot = await hre.ethers.getContractFactory("Spotter");
    Sikka = await hre.ethers.getContractFactory("Sikka");
    GemJoin = await hre.ethers.getContractFactory("GemJoin");
    SikkaJoin = await hre.ethers.getContractFactory("SikkaJoin");
    Oracle = await hre.ethers.getContractFactory("Oracle"); 
    Jug = await hre.ethers.getContractFactory("Jug");
    Vow = await hre.ethers.getContractFactory("Vow");
    Dog = await hre.ethers.getContractFactory("Dog");
    Clip = await hre.ethers.getContractFactory("Clipper");
    Abacus = await hre.ethers.getContractFactory("LinearDecrease");
    IkkaToken = await hre.ethers.getContractFactory("IkkaToken");
    IkkaRewards = await hre.ethers.getContractFactory("IkkaRewards");
    IkkaOracle = await hre.ethers.getContractFactory("IkkaOracle"); 
    AuctionProxy = await hre.ethers.getContractFactory("AuctionProxy");

    auctionProxy = await this.AuctionProxy.deploy();
    await auctionProxy.deployed();
    Interaction = await hre.ethers.getContractFactory("Interaction", {
        unsafeAllow: ['external-library-linking'],
        libraries: {
            AuctionProxy: auctionProxy.address
        }
    });

    MasterVault = await hre.ethers.getContractFactory("MasterVault");
    WaitingPool = await hre.ethers.getContractFactory("WaitingPool");
    CerosYieldConverterStrategy = await hre.ethers.getContractFactory("CerosYieldConverterStrategy");
    PriceGetter = await hre.ethers.getContractFactory("PriceGetter");
    SwapPool = await ethers.getContractFactory("SwapPool");
    LP = await ethers.getContractFactory("LP");

    sMatic = await upgrades.deployProxy(this.SMatic, [], {initializer: "initialize"});
    await sMatic.deployed();
    sMaticImp = await upgrades.erc1967.getImplementationAddress(sMatic.address);

    abacus = await upgrades.deployProxy(this.Abacus, [], {initializer: "initialize"});
    await abacus.deployed();
    abacusImp = await upgrades.erc1967.getImplementationAddress(abacus.address);

    oracle = await this.Oracle.deploy();
    await oracle.deployed();
    await oracle.setPrice("2" + wad); // 2$

    vat = await upgrades.deployProxy(this.Vat, [], {initializer: "initialize"});
    await vat.deployed();
    vatImp = await upgrades.erc1967.getImplementationAddress(vat.address);

    spot = await upgrades.deployProxy(this.Spot, [vat.address], {initializer: "initialize"});
    await spot.deployed();
    spotImp = await upgrades.erc1967.getImplementationAddress(spot.address);

    sikka = await upgrades.deployProxy(this.Sikka, [_chainId, "SIKKA", "5000000" + wad], {initializer: "initialize"});
    await sikka.deployed();
    sikkaImp = await upgrades.erc1967.getImplementationAddress(sikka.address);

    sikkaJoin = await upgrades.deployProxy(this.SikkaJoin, [vat.address, sikka.address], {initializer: "initialize"});
    await sikkaJoin.deployed();
    sikkaJoinImp = await upgrades.erc1967.getImplementationAddress(sikkaJoin.address);

    gemJoin = await upgrades.deployProxy(this.GemJoin, [vat.address, _ilkCeMatic, masterVault.address], {initializer: "initialize"});
    await gemJoin.deployed();
    gemJoinImp = await upgrades.erc1967.getImplementationAddress(gemJoin.address);

    jug = await upgrades.deployProxy(this.Jug, [vat.address], {initializer: "initialize"});
    await jug.deployed();
    jugImp = await upgrades.erc1967.getImplementationAddress(jug.address);

    vow = await upgrades.deployProxy(this.Vow, [vat.address, sikkaJoin.address, _multisig], {initializer: "initialize"});
    await vow.deployed();
    vowImp = await upgrades.erc1967.getImplementationAddress(vow.address);

    dog = await upgrades.deployProxy(this.Dog, [vat.address], {initializer: "initialize"});
    await dog.deployed();
    dogImpl = await upgrades.erc1967.getImplementationAddress(dog.address);

    clip = await upgrades.deployProxy(this.Clip, [vat.address, spot.address, dog.address, _ilkCeMatic], {initializer: "initialize"});
    await clip.deployed();
    clipImp = await upgrades.erc1967.getImplementationAddress(dog.address);

    rewards = await upgrades.deployProxy(this.IkkaRewards, [vat.address, ether(_ikkaRewardsPoolLimitInEth).toString(), 5], {initializer: "initialize"});
    await rewards.deployed();
    rewardsImp = await upgrades.erc1967.getImplementationAddress(rewards.address);

    interaction = await upgrades.deployProxy(this.Interaction, [vat.address, spot.address, sikka.address, sikkaJoin.address, jug.address, dog.address, rewards.address], 
        {
            initializer: "initialize",
            unsafeAllowLinkedLibraries: true,
        }
    );
    await interaction.deployed();
    interactionImplAddress = await upgrades.erc1967.getImplementationAddress(interaction.address);

    sikkaProvider = await upgrades.deployProxy(this.SikkaProvider, [sMatic.address, masterVault.address, interaction.address], {initializer: "initialize"});
    await sikkaProvider.deployed();
    sikkaProviderImplementation = await upgrades.erc1967.getImplementationAddress(sikkaProvider.address);

    await vat.rely(gemJoin.address);
    await vat.rely(spot.address);
    await vat.rely(sikkaJoin.address);
    await vat.rely(jug.address);
    await vat.rely(dog.address);
    await vat.rely(clip.address);
    await vat.rely(interaction.address);
    await vat["file(bytes32,uint256)"](ethers.utils.formatBytes32String("Line"), _vat_Line + rad);
    await vat["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("line"), _vat_line + rad);
    await vat["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("dust"), _vat_dust + rad);
    
    await sikka.rely(sikkaJoin.address);
    await sikka.setSupplyCap("5000000" + wad);
    
    await spot.rely(interaction.address);
    await spot["file(bytes32,bytes32,address)"](_ilkCeMatic, ethers.utils.formatBytes32String("pip"), oracle.address);
    await spot["file(bytes32,uint256)"](ethers.utils.formatBytes32String("par"), _spot_par + ray); // It means pegged to 1$
    
    await rewards.rely(interaction.address);
    
    await gemJoin.rely(interaction.address);
    await sikkaJoin.rely(interaction.address);
    await sikkaJoin.rely(vow.address);
    
    await dog.rely(interaction.address);
    await dog.rely(clip.address);
    await dog["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address);
    await dog["file(bytes32,uint256)"](ethers.utils.formatBytes32String("Hole"), _dog_Hole + rad);
    await dog["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("hole"), _dog_hole + rad);
    await dog["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("chop"), _dog_chop);
    await dog["file(bytes32,bytes32,address)"](_ilkCeMatic, ethers.utils.formatBytes32String("clip"), clip.address);
    
    await clip.rely(interaction.address);
    await clip.rely(dog.address);
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("buf"), _clip_buf); // 10%
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tail"), _clip_tail); // 3H reset time
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("cusp"), _clip_cusp); // 60% reset ratio
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("chip"), _clip_chip); // 0.01% vow incentive
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tip"), _clip_tip + rad); // 10$ flat incentive
    await clip["file(bytes32,uint256)"](ethers.utils.formatBytes32String("stopped"), _clip_stopped);
    await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("spotter"), spot.address);
    await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("dog"), dog.address);
    await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address);
    await clip["file(bytes32,address)"](ethers.utils.formatBytes32String("calc"), abacus.address);
    
    await jug.rely(interaction.address);
    await jug["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address);
    
    await vow.rely(dog.address);
    await vow["file(bytes32,address)"](ethers.utils.formatBytes32String("sikka"), sikka.address);
    
    await abacus.connect(deployer)["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tau"), _abacus_tau); // Price will reach 0 after this time

    await interaction.setCollateralType(masterVault.address, gemJoin.address, _ilkCeMatic, clip.address, _mat);
    await interaction.poke(masterVault.address);
    await interaction.drip(masterVault.address);

    return interaction;
}

async function deploySikkaProvider(sMatic, masterVault, interaction) {
    // Contracts Fetching
    SikkaProvider = await hre.ethers.getContractFactory("SikkaProvider");

    let sikkaProvider = await upgrades.deployProxy(SikkaProvider, [sMatic.address, masterVault.address, interaction.address], {initializer: "initialize"});
    await sikkaProvider.deployed();

    await sMatic.changeMinter(sikkaProvider.address);
    await masterVault.changeProvider(sikkaProvider.address);
    
    await interaction.setSikkaProvider(masterVault.address, sikkaProvider.address);
    await sikkaProvider.changeProxy(interaction.address);
    return sikkaProvider;
}