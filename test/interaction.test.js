const {ethers, upgrades} = require("hardhat");
const { expect, assert } = require("chai");
const { ether } = require("@openzeppelin/test-helpers");
const { parseEther } = ethers.utils;
const NetworkSnapshotter = require("./helpers/NetworkSnapshotter");

const {
    toWad,
    toRay,
    advanceTime,
} = require("./helpers/utils");
const {BigNumber} = require("ethers");

describe("Interaction", function () {

    let collateral, _chainId, _mat, _dgtRewardsPoolLimitInEth, _vat_Line, _vat_line,
        _spot_par, _dog_Hole, _dog_hole, _dog_chop, _abacus_tau, _clip_buf, _clip_tail,
        _clip_cusp, _clip_chip, _clip_tip, _clip_stopped, _multisig, _vat_dust, dMatic,
      signers, aMaticRateUSD;
        
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
        
        await cerosToken.setRatio(parseEther("0.6"));
        
        await swapPool.setFee(100, 3);
        await swapPool.setFee(100, 4);

        // Initialize Contracts
        await lp.setSwapPool(swapPool.address);
        await swapPool.connect(user1).addLiquidity(addAmount, addAmount);
        return [swapPool, wNative, cerosToken];
    } 

    const networkSnapshotter = new NetworkSnapshotter();

    async function init() {

        _mat = "1333333333333333333333333333";
        _dgtRewardsPoolLimitInEth = "100000000";
        _vat_Line = "5000000";
        _vat_line = "5000000";
        _vat_dust = "100";
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

        collateral = ethers.utils.formatBytes32String("aMATICc");

        wad = "000000000000000000", // 18 Decimals
        ray = "000000000000000000000000000", // 27 Decimals
        rad = "000000000000000000000000000000000000000000000", // 45 Decimals
        ONE = 10 ** 27;
        YEAR = 31556952;
        aMaticRateUSD = "2";

        // Signer
        [deployer] = await ethers.getSigners();
        _multisig = deployer.address;

        [swapPool, wMatic, aMaticc] = await deploySwapPool();
        collateralToken = aMaticc;

        _ilkCeMatic = ethers.utils.formatBytes32String("aMATICc");

        // Contracts Fetching
        CeaMATICc = await ethers.getContractFactory("CeToken");
        CeVault = await ethers.getContractFactory("CeVault");
        AMATICb = await ethers.getContractFactory("aMATICb");
        AMATICc = await ethers.getContractFactory("aMATICc");
        DMatic = await ethers.getContractFactory("dMATIC");
        CerosRouter = await ethers.getContractFactory("CerosRouter");
        DavosProvider = await ethers.getContractFactory("DavosProvider");
        Vat = await ethers.getContractFactory("Vat");
        Spot = await ethers.getContractFactory("Spotter");
        Davos = await ethers.getContractFactory("Davos");
        GemJoin = await ethers.getContractFactory("GemJoin");
        DavosJoin = await ethers.getContractFactory("DavosJoin");
        Oracle = await ethers.getContractFactory("Oracle");
        Jug = await ethers.getContractFactory("Jug");
        Vow = await ethers.getContractFactory("Vow");
        Dog = await ethers.getContractFactory("Dog");
        Clip = await ethers.getContractFactory("Clipper");
        Abacus = await ethers.getContractFactory("LinearDecrease");
        DgtToken = await ethers.getContractFactory("DGTToken");
        DgtRewards = await ethers.getContractFactory("DGTRewards");
        DgtOracle = await ethers.getContractFactory("DGTOracle");
        AuctionProxy = await ethers.getContractFactory("AuctionProxy");

        const auctionProxy = await this.AuctionProxy.deploy();
        await auctionProxy.deployed();
        Interaction = await ethers.getContractFactory("Interaction", {
            unsafeAllow: ['external-library-linking'],
            libraries: {
                AuctionProxy: auctionProxy.address
            }
        });

        MasterVault = await ethers.getContractFactory("MasterVault");
        WaitingPool = await ethers.getContractFactory("WaitingPool");
        CerosYieldConverterStrategy = await ethers.getContractFactory("CerosYieldConverterStrategy");
        PriceGetter = await ethers.getContractFactory("PriceGetter");
        SwapPool = await ethers.getContractFactory("SwapPool");
        LP = await ethers.getContractFactory("LP");

        dMatic = await upgrades.deployProxy(this.DMatic, [], {initializer: "initialize"});
        await dMatic.deployed();
        dMaticImp = await upgrades.erc1967.getImplementationAddress(dMatic.address);

        abacus = await upgrades.deployProxy(this.Abacus, [], {initializer: "initialize"});
        await abacus.deployed();
        abacusImp = await upgrades.erc1967.getImplementationAddress(abacus.address);

        oracle = await this.Oracle.deploy();
        await oracle.deployed();
        await oracle.setPrice(aMaticRateUSD + wad); // 2$

        vat = await upgrades.deployProxy(this.Vat, [], {initializer: "initialize"});
        await vat.deployed();
        vatImp = await upgrades.erc1967.getImplementationAddress(vat.address);

        spot = await upgrades.deployProxy(this.Spot, [vat.address], {initializer: "initialize"});
        await spot.deployed();
        spotImp = await upgrades.erc1967.getImplementationAddress(spot.address);

        davos = await upgrades.deployProxy(this.Davos, [_chainId, "DAVOS", "5000000" + wad], {initializer: "initialize"});
        await davos.deployed();
        davosImp = await upgrades.erc1967.getImplementationAddress(davos.address);

        davosJoin = await upgrades.deployProxy(this.DavosJoin, [vat.address, davos.address], {initializer: "initialize"});
        await davosJoin.deployed();
        davosJoinImp = await upgrades.erc1967.getImplementationAddress(davosJoin.address);

        gemJoin = await upgrades.deployProxy(this.GemJoin, [vat.address, _ilkCeMatic, collateralToken.address], {initializer: "initialize"});
        await gemJoin.deployed();
        gemJoinImp = await upgrades.erc1967.getImplementationAddress(gemJoin.address);

        jug = await upgrades.deployProxy(this.Jug, [vat.address], {initializer: "initialize"});
        await jug.deployed();
        jugImp = await upgrades.erc1967.getImplementationAddress(jug.address);

        vow = await upgrades.deployProxy(this.Vow, [vat.address, davosJoin.address, _multisig], {initializer: "initialize"});
        await vow.deployed();
        vowImp = await upgrades.erc1967.getImplementationAddress(vow.address);

        dog = await upgrades.deployProxy(this.Dog, [vat.address], {initializer: "initialize"});
        await dog.deployed();
        dogImpl = await upgrades.erc1967.getImplementationAddress(dog.address);

        clip = await upgrades.deployProxy(this.Clip, [vat.address, spot.address, dog.address, _ilkCeMatic], {initializer: "initialize"});
        await clip.deployed();
        clipImp = await upgrades.erc1967.getImplementationAddress(dog.address);

        rewards = await upgrades.deployProxy(this.DgtRewards, [vat.address, ether(_dgtRewardsPoolLimitInEth).toString(), 5], {initializer: "initialize"});
        await rewards.deployed();
        rewardsImp = await upgrades.erc1967.getImplementationAddress(rewards.address);

        interaction = await upgrades.deployProxy(this.Interaction, [vat.address, spot.address, davos.address, davosJoin.address, jug.address, dog.address, rewards.address], 
            {
                initializer: "initialize",
                unsafeAllowLinkedLibraries: true,
            }
        );
        await interaction.deployed();
        interactionImplAddress = await upgrades.erc1967.getImplementationAddress(interaction.address);

        davosProvider = await upgrades.deployProxy(this.DavosProvider, [dMatic.address, collateralToken.address, interaction.address], {initializer: "initialize"});
        await davosProvider.deployed();
        davosProviderImplementation = await upgrades.erc1967.getImplementationAddress(davosProvider.address);

        await vat.rely(gemJoin.address);
        await vat.rely(spot.address);
        await vat.rely(davosJoin.address);
        await vat.rely(jug.address);
        await vat.rely(dog.address);
        await vat.rely(clip.address);
        await vat.rely(interaction.address);
        await vat["file(bytes32,uint256)"](ethers.utils.formatBytes32String("Line"), _vat_Line + rad);
        await vat["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("line"), _vat_line + rad);
        await vat["file(bytes32,bytes32,uint256)"](_ilkCeMatic, ethers.utils.formatBytes32String("dust"), _vat_dust + rad);
        
        await davos.rely(davosJoin.address);
        await davos.setSupplyCap("5000000" + wad);
        
        await spot.rely(interaction.address);
        await spot["file(bytes32,bytes32,address)"](_ilkCeMatic, ethers.utils.formatBytes32String("pip"), oracle.address);
        await spot["file(bytes32,uint256)"](ethers.utils.formatBytes32String("par"), _spot_par + ray); // It means pegged to 1$
        
        await rewards.rely(interaction.address);
        
        await gemJoin.rely(interaction.address);
        await davosJoin.rely(interaction.address);
        await davosJoin.rely(vow.address);
        
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
        await vow["file(bytes32,address)"](ethers.utils.formatBytes32String("davos"), davos.address);
        
        await abacus.connect(deployer)["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tau"), _abacus_tau); // Price will reach 0 after this time
    }

    async function setCollateralType() {
        await interaction.setCollateralType(collateralToken.address, gemJoin.address, _ilkCeMatic, clip.address, _mat);
        await interaction.poke(collateralToken.address);
        await interaction.drip(collateralToken.address);
    }
    
    before(async function () {
        [deployer, signer1, signer2, signer3] = await ethers.getSigners();
        signers = [signer1, signer2, signer3];
        await init();
        await networkSnapshotter.firstSnapshot();
    });

    afterEach("revert", async () => await networkSnapshotter.revert());
    
    describe('--- Wards - list of address with administrative privileges', async () => {
    
        it("Authorized user can enable whitelist mode", async function () {
            await interaction.connect(deployer).enableWhitelist();
            const whitelistMode = await interaction.whitelistMode();
            assert.equal(whitelistMode, 1);
        });
       
        it("Revert: Unauthorized user can not enable whitelist mode", async function () {
            await expect(
              interaction
                .connect(signer1)
                .enableWhitelist()
            ).to.be.revertedWith("Interaction/not-authorized");
        });
    });
    
    describe('--- Whitelist - restrict deposit for the specified addresses', async () => {
        
        it("Whitelisted address can provide collateral", async function () {
            await setCollateralType();
            //Enable whitelist and add signers
            await interaction.connect(deployer).enableWhitelist();
            await interaction.connect(deployer).addToWhitelist(signers.map(signer => signer.address));
            
            //Signers can deposit
            let totalDeposited = BigNumber.from(0);
            for(const signer of signers){
                const depositAmount = parseEther("1");
                await aMaticc.connect(deployer).mint(signer.address, depositAmount);
                await aMaticc.connect(signer).approve(interaction.address, ethers.constants.MaxUint256)
                await interaction.connect(signer).deposit(signer.address, aMaticc.address, depositAmount);
                totalDeposited = totalDeposited.add(depositAmount);
                expect(await interaction.deposits(aMaticc.address)).to.be.equal(totalDeposited);
            }
        });
        
        it("Revert: Addresses out of whitelist can not deposit when whitelist mode is enabled", async function () {
            await setCollateralType();
            //Enable whitelist
            await interaction.connect(deployer).enableWhitelist();
            //Deposit fails
            const depositAmount = parseEther("1");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
              interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
              )).to.be.revertedWith("Interaction/not-in-whitelist");
        });
    
        it("Address removed from whitelist can't deposit when whitelist enabled", async function () {
    
            await setCollateralType();
            //Enable whitelist and add signer1
            await interaction.connect(deployer).enableWhitelist();
            await interaction.connect(deployer).addToWhitelist(signers.map(signer => signer.address));
            //Remove signer3 from the whitelist
            await interaction.connect(deployer).removeFromWhitelist([signer3.address]);
    
            //Signer1 can deposit still
            const depositAmount = parseEther("1");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            expect(await interaction.deposits(aMaticc.address)).to.be.equal(depositAmount);
    
            //Signer3 cant deposit
            await aMaticc.connect(deployer).mint(signer3.address, depositAmount);
            await aMaticc.connect(signer3).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
              interaction.connect(signer3).deposit(
                signer3.address,
                aMaticc.address,
                depositAmount
              )).to.be.revertedWith("Interaction/not-in-whitelist");
        })
    });
    
    describe('--- Deposit collateral', async () => {
        
        it("User can deposit", async function () {
            await setCollateralType();
            const deposited = parseEther("1");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256);
            await expect(
              tx = await interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                deposited
              )).to.emit(interaction, "Deposit")
              .withArgs(signer1.address, collateralToken.address, deposited, deposited);
            expect(await interaction.deposits(aMaticc.address)).eq(deposited);
        });
        
        it("Deposit many times by many users", async function () {
            await setCollateralType();
            const vat_ilks = await vat.ilks(collateral);
            let expectedTotalDeposited = BigNumber.from(0);
            for(const signer of signers){
                let expectedSignerDeposited = BigNumber.from(0);
                for (let i = 0; i < 3; i++){
                    const deposited = parseEther(Math.random().toString());
                    await aMaticc.mint(signer.address, deposited);
                    await aMaticc.connect(signer).approve(interaction.address, deposited);
                
                    expectedTotalDeposited = expectedTotalDeposited.add(deposited);
                    expectedSignerDeposited = expectedSignerDeposited.add(deposited);
                    await expect(
                      tx = await interaction.connect(signer).deposit(
                        signer.address,
                        aMaticc.address,
                        deposited
                      )).to.emit(interaction, "Deposit")
                      .withArgs(signer.address, collateralToken.address, deposited, expectedSignerDeposited);
                
                    //aMATICc become locked as a collateral by default
                    expect(await interaction.locked(collateralToken.address, signer.address)).to.be.equal(expectedSignerDeposited);
                    //Borrow limit in DAVOS~$ = collateral x collateralRate
                    expect(await interaction.availableToBorrow(aMaticc.address, signer.address)).to.be.equal(expectedSignerDeposited.mul(vat_ilks.spot).div(`1${ray}`));
                }
            }
            //Total amount of aMATICc deposits
            expect(await interaction.deposits(aMaticc.address)).to.be.equal(expectedTotalDeposited);
            //Deposited TVL in $ = tokenDeposits x tokenRate
            expect(await interaction.depositTVL(collateralToken.address)).to.be.equal(expectedTotalDeposited.mul(aMaticRateUSD));
        });
    
        it("Revert: Direct deposit to Interaction is not allowed when [Davos]Provider is set", async function () {
            await setCollateralType();
            await interaction.setDavosProvider(collateralToken.address, davosProvider.address)
            const depositAmount = parseEther("1");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
              interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
              )).to.be.revertedWith("Interaction/only davos provider can deposit for this token");
        });
    
        it("Revert: User can not deposit collateral of undefined type", async function () {
            const depositAmount = parseEther("1");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
              interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
              )).to.be.revertedWith("Interaction/inactive-collateral");
        });
    });
    
    describe('--- Withdraw collateral', async () => {
        it("User can withdraw part of their collateral back", async function () {
            await setCollateralType();
            
            //Deposit
            const depositAmount = parseEther("1");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            const depositsBefore = await interaction.deposits(aMaticc.address);
            expect(depositsBefore).eq(depositAmount);
            
            //Withdraw half of the collateral
            const withdrawAmount = depositAmount.div(2);
            await expect(
              interaction.connect(signer1).withdraw(
                signer1.address,
                aMaticc.address,
                withdrawAmount
              )).to.emit(interaction, "Withdraw")
              .withArgs(signer1.address, withdrawAmount);
            
            depositsAfter = await interaction.deposits(aMaticc.address);
            assert.equal(depositsAfter, depositsBefore - withdrawAmount);
        });
    
        it("Revert: User cannot withdraw another account collateral", async function () {
            await setCollateralType();
    
            //Deposit as Signer1
            const depositAmount = parseEther("1");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            const depositsBefore = await interaction.deposits(aMaticc.address);
            expect(depositsBefore).eq(depositAmount);
            
            //Withdraw as Signer2 from Signer1 address
            const withdrawAmount = depositAmount.div(2);
            await expect(
              interaction.connect(signer2).withdraw(
                signer1.address,
                aMaticc.address,
                withdrawAmount
              )).to.be.revertedWith("Interaction/Caller must be the same address as participant");
        });
    
        it("Revert: Direct withdraw from Interaction is not allowed when [Davos]Provider is set", async function () {
            await setCollateralType();
            
            //Deposit
            const depositAmount = parseEther("1");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            const depositsBefore = await interaction.deposits(aMaticc.address);
            expect(depositsBefore).eq(depositAmount);
        
            //Set DAVOS provider
            await interaction.setDavosProvider(collateralToken.address, davosProvider.address)
            
            //User can not withdraw directly from Interaction (Only DavosProvider can)
            const withdrawAmount = depositAmount.div(2);
            await expect(
              interaction.connect(signer2).withdraw(
                signer1.address,
                aMaticc.address,
                withdrawAmount
              )).to.be.revertedWith("Interaction/Only davos provider can call this function for this token");
        });
    
        it("revert:: withdraw(): should not let withdraw when user has outstanding debt", async function () {
            await setCollateralType();
            const depositAmount = parseEther("1000");
            const withdrawAmount = parseEther("500");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
              interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
              )).to.emit(interaction, "Deposit")
              .withArgs(signer1.address, collateralToken.address, depositAmount, depositAmount);
            const depositsBefore = await interaction.deposits(aMaticc.address);
            expect(depositsBefore).eq(depositAmount);
        
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrowBefore = await interaction.availableToBorrow(aMaticc.address, signer1.address);
            const locked = await interaction.locked(collateralToken.address, signer1.address);
        
            expect(depositAmount).eq(locked);
            assert.equal(Number(availableToBorrowBefore), (depositAmount.mul(vat_ilks.spot))/1e27);
        
            const borrowAmount = availableToBorrowBefore
            await expect(
              interaction.connect(signer1).borrow(
                aMaticc.address,
                borrowAmount
              )).to.emit(interaction, "Borrow");
        
            const availableToBorrowAfter = await interaction.availableToBorrow(aMaticc.address, signer1.address);
            assert.equal(availableToBorrowAfter, availableToBorrowBefore - borrowAmount);
        
            await expect(
              interaction.connect(signer1).withdraw(
                signer1.address,
                aMaticc.address,
                withdrawAmount
              )).to.be.revertedWith("Vat/not-safe")
        });
    });
    
    describe('--- Borrow', async () => {
        
        it("User can borrow", async function () {
            await setCollateralType();
            
            const depositAmount = parseEther(_vat_dust);
            
            //Alternative way to calc available to borrow
            // const collateralRate = await interaction.collateralRate(collateralToken.address);
            // const availableToBorrow = deposited.mul(aMATICcRate).mul(collateralRate).div(`1${e18}`);
            
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrow = depositAmount.mul(vat_ilks.spot).div(`1${ray}`);
            expect(await interaction.willBorrow(collateralToken.address, signer1.address, depositAmount)).to.be.equal(availableToBorrow);
            
            await aMaticc.connect(signer1).approve(interaction.address, depositAmount);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            expect(await interaction.availableToBorrow(collateralToken.address, signer1.address)).to.be.equal(availableToBorrow);
            
            await expect(
              interaction.connect(signer1).borrow(
                aMaticc.address,
                availableToBorrow
              )).to.emit(interaction, "Borrow");
            expect(await interaction.borrowed(aMaticc.address, signer1.address)).to.be.equal(availableToBorrow.add(100));
            expect(await interaction.totalPegLiquidity()).to.be.equal(availableToBorrow);
            expect(await interaction.availableToBorrow(aMaticc.address, signer1.address)).to.be.equal(0);
        });
        
        it("Borrow limit and liquidation price depending on borrow amount", async function () {
            await setCollateralType();
            
            let deposited = parseEther("10000");
            await aMaticc.connect(signer1).approve(interaction.address, deposited);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, deposited);
            
            const totalDeposited = await interaction.deposits(aMaticc.address);
            expect(totalDeposited).to.be.equal(deposited);
            
            const collateralRate = await interaction.collateralRate(collateralToken.address);
            expect(collateralRate).to.be.equal(BigNumber.from("1"+rad).div(_mat));
            
            const vat_ilks = await vat.ilks(collateral);
            const expectedBorrowLimit = deposited.mul(vat_ilks.spot).div(`1${ray}`);
            const numberOfIterations = 100;
            const borrowStep = expectedBorrowLimit.div(numberOfIterations);
            let freeCollateral = deposited;
            const collateralStep = deposited.div(numberOfIterations);
            let borrowed = BigNumber.from(0);
            for (let i = 0; i < numberOfIterations; i++) {
                await interaction.connect(signer1).borrow(aMaticc.address, borrowStep);
                borrowed = borrowed.add(borrowStep);
                expect(await interaction.borrowed(collateralToken.address, signer1.address)).to.be.equal(borrowed.add(100), "Borrowed amount increased")
                expect(await interaction.totalPegLiquidity()).to.be.equal(borrowed, "Total borrowed amount increased");
                
                const availableToBorrow = await interaction.availableToBorrow(aMaticc.address, signer1.address);
                freeCollateral = freeCollateral.sub(collateralStep);
                const expectedAvailableToBorrow = freeCollateral.mul(vat_ilks.spot).div(`1${ray}`);
                expect(availableToBorrow).to.be.equal(expectedAvailableToBorrow, "Available to borrow decreased");
                
                const locked = await interaction.locked(collateralToken.address, signer1.address);
                expect(locked).to.be.equal(deposited, "Locked collateral hasn't changed after borrow");
                
                const free = await interaction.free(collateralToken.address, signer1.address);
                expect(free).to.be.equal("0", "Free collateral amount hasn't change after borrow");
                
                const davosPrice = await interaction.davosPrice(collateralToken.address);
                expect(davosPrice).to.be.equal("1"+wad, "Davos USD rate stays the same");
                const collateralPrice = await interaction.collateralPrice(collateralToken.address);
                expect(collateralPrice).to.be.equal(aMaticRateUSD+wad, "aMATICc USD rate stays the same");
                
                expect(await interaction.collateralRate(collateralToken.address)).to.be.equal(collateralRate, "Collateral rate hasn't change");
                
                const currentLiquidationPrice = await interaction.currentLiquidationPrice(collateralToken.address, signer1.address);
                const expectedLiquidationPrice = borrowed.mul("1"+wad+wad).div(deposited.mul(collateralRate)).sub(1);
                expect(currentLiquidationPrice).to.be.equal(expectedLiquidationPrice, "Current liquidation price in USD");
                
                const estLiqPriceDavos = await interaction.estimatedLiquidationPriceDAVOS(collateralToken.address, signer1.address, 0);
                expect(estLiqPriceDavos).to.be.equal(expectedLiquidationPrice.div(1e9), "");
                
                const estimatedLiquidationPrice = await interaction.estimatedLiquidationPrice(collateralToken.address, signer1.address, 0);
                expect(estimatedLiquidationPrice).to.be.equal(expectedLiquidationPrice, "Estimated liquidation price in USD");
            }
        });
        
        it("The first borrow has to be greater than min debt position", async function () {
            await setCollateralType();
            
            let deposited = parseEther("10000");
            await aMaticc.connect(signer1).approve(interaction.address, deposited);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, deposited);
            
            const openAmount = parseEther(_vat_dust);
            let expectedBorrowed = openAmount;
            await interaction.connect(signer1).borrow(aMaticc.address, openAmount);
            expect(await interaction.borrowed(aMaticc.address, signer1.address)).to.be.equal(expectedBorrowed.add(100));
            
            const nextAmount = BigNumber.from(1);
            for (let i = 1; i < 10; i++){
                expectedBorrowed = expectedBorrowed.add(nextAmount);
                await interaction.connect(signer1).borrow(aMaticc.address, nextAmount);
            }
            expect(await interaction.borrowed(aMaticc.address, signer1.address)).to.be.equal(expectedBorrowed.add(100));
        });
        
        it("User cant borrow less than min debt position", async function () {
            await setCollateralType();
            
            let deposited = parseEther("10000");
            await aMaticc.connect(signer1).approve(interaction.address, deposited);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, deposited);
            
            const openAmount = parseEther(_vat_dust).sub(1);
            await expect(interaction.connect(signer1).borrow(aMaticc.address, openAmount)).to.be.revertedWith("Vat/dust");
            expect(await interaction.borrowed(aMaticc.address, signer1.address)).to.be.equal(0);
        });
        
        it("User cant exceed borrow limit with collateral > 0", async function () {
            await setCollateralType();
            
            let depositAmount = parseEther("1000");
            await aMaticc.connect(signer1).approve(interaction.address, depositAmount);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrow = depositAmount.mul(vat_ilks.spot).div(`1${ray}`);
            await expect(interaction.connect(signer1).borrow(aMaticc.address, availableToBorrow.add(1))).to.be.revertedWith("Vat/not-safe");
            expect(await interaction.borrowed(aMaticc.address, signer1.address)).to.be.equal(0);
        });
        
        it("User cant exceed borrow limit with collateral = 0", async function () {
            await setCollateralType();
            
            let depositAmount = parseEther("1000");
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrow = depositAmount.mul(vat_ilks.spot).div(`1${ray}`);
            await expect(interaction.connect(signer1).borrow(aMaticc.address, availableToBorrow.add(1))).to.be.revertedWith("Vat/not-safe");
            expect(await interaction.borrowed(aMaticc.address, signer1.address)).to.be.equal(0);
        });
        
        it("User cant borrow 0", async function () {
            await setCollateralType();
            
            let deposited = parseEther(_vat_dust+"0");
            await aMaticc.connect(signer1).approve(interaction.address, deposited);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, deposited);
            
            const vat_ilks = await vat.ilks(collateral);
            const borrowed = deposited.div(10).mul(vat_ilks.spot).div(`1${ray}`);
            await expect(
              interaction.connect(signer1).borrow(
                aMaticc.address,
                borrowed
              )).to.emit(interaction, "Borrow");
            expect(await interaction.borrowed(aMaticc.address, signer1.address)).to.be.equal(borrowed.add(100));
            await expect(interaction.connect(signer1).borrow(aMaticc.address, "0")).to.be.revertedWith("Interaction/invalid-davosAmount");
        });
        
        it("User cant borrow with unknown collateral", async function () {
            await expect(interaction.connect(signer1).borrow(aMaticc.address, "1")).to.be.revertedWith("Interaction/inactive-collateral");
        });
    });
    
    describe('--- willBorrow() returns amount of DAVOS that can be borrowed/payedback with specified collateral', async () => {
        
        it("willBorrow() changes with the amount", async function () {
            await setCollateralType();
            
            let deposited = parseEther(_vat_dust).mul(10);
            await aMaticc.connect(signer1).approve(interaction.address, deposited);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, deposited);
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrow = deposited.mul(vat_ilks.spot).div(`1${ray}`);
            await interaction.connect(signer1).borrow(aMaticc.address, availableToBorrow);
            
            console.log(`Amount\tWill borrow\tExpected`)
            const iterations = 20;
            for(let i = 0; i < iterations+1; i++){
                const amount = deposited.mul(i).div(iterations/2).sub(deposited);
                const willBorrow = await interaction.willBorrow(collateralToken.address, signer1.address, amount);
                const expectedWillBorrow = amount.mul(vat_ilks.spot).div(`1${ray}`);
                console.log(`${amount}\t${willBorrow}\t${expectedWillBorrow}`);
                expect(willBorrow).to.be.equal(expectedWillBorrow);
            }
        });
        
        it("willBorrow() changes with the collateral price", async function () {
            await setCollateralType();
            
            let deposited = parseEther(_vat_dust);
            await aMaticc.connect(signer1).approve(interaction.address, deposited);
            const vat_ilks = await vat.ilks(collateral);
            const willBorrowBefore = deposited.mul(vat_ilks.spot).div(`1${ray}`);
            expect(await interaction.willBorrow(collateralToken.address, signer1.address, deposited)).to.be.equal(willBorrowBefore);
            
            //Decrease collateral price by half
            const collateralPriceBefore = await interaction.collateralPrice(collateralToken.address);
            const collateralPrice = collateralPriceBefore.div(2);
            await oracle.connect(deployer).setPrice(collateralPrice);
            await spot.connect(deployer).poke(collateral);
            
            expect(await interaction.willBorrow(collateralToken.address, signer1.address, deposited)).to.be.equal(willBorrowBefore.div(2));
        });
        
        it("willBorrow() of negative amount is 0 for depositors who hasn't borrow yet", async function () {
            await setCollateralType();
            let deposited = parseEther(_vat_dust);
            await aMaticc.connect(signer1).approve(interaction.address, deposited);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, deposited);
            expect(await interaction.willBorrow(collateralToken.address, signer1.address, deposited.mul(-1))).to.be.equal(0);
        });
        
        it("willBorrow() of negative amount cant be calculated for users who hasn't deposited yet", async function () {
            await setCollateralType();
            let deposited = parseEther(_vat_dust);
            await expect(interaction.willBorrow(collateralToken.address, signer1.address, deposited.mul(-1))).to.be.revertedWith("Cannot withdraw more than current amount");
        });
    });
    
    describe('--- Payback', async () => {
        
        it("User can payback", async function () {
            await setCollateralType();
            const depositAmount = parseEther(_vat_dust);
            const vat_ilks = await vat.ilks(collateral);
            const borrowed = depositAmount.mul(vat_ilks.spot).div(`1${ray}`);
            
            await aMaticc.connect(signer1).approve(interaction.address, depositAmount);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            await interaction.connect(signer1).borrow(aMaticc.address, borrowed);
            expect(await interaction.borrowed(aMaticc.address, signer1.address)).to.be.equal(borrowed.add(100));
            await davos.connect(signer1).approve(interaction.address, borrowed);
            
            //Payback
            await expect(
              interaction.connect(signer1).payback(
                aMaticc.address,
                borrowed
              )).to.emit(interaction, "Payback");
            
            expect(await interaction.deposits(aMaticc.address)).to.be.equal(depositAmount, "Deposited amount stays the same");
            expect(await interaction.borrowed(collateralToken.address, signer1.address)).to.be.equal(0, "Borrowed amount reduced to 0");
            expect(await interaction.collateralTVL(collateralToken.address)).to.be.equal(0, "Collateral TVL reduced to 0");
        })
        
        it("User can pay back partially to 0", async function () {
            await setCollateralType();
            
            let deposited = parseEther("10000");
            await aMaticc.connect(signer1).approve(interaction.address, deposited);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, deposited);
            
            const totalDeposited = await interaction.deposits(aMaticc.address);
            expect(totalDeposited).to.be.equal(deposited);
            
            const collateralRate = await interaction.collateralRate(collateralToken.address);
            expect(collateralRate).to.be.equal(BigNumber.from("1"+rad).div(_mat));
            
            const vat_ilks = await vat.ilks(collateral);
            let borrowed = deposited.mul(vat_ilks.spot).div(`1${ray}`);
            await interaction.connect(signer1).borrow(aMaticc.address, borrowed);
            await davos.connect(signer1).approve(interaction.address, borrowed);
            
            const numberOfIterations = 10;
            const paybackStep = borrowed.div(numberOfIterations);
            let freeCollateral = BigNumber.from(0);
            const collateralStep = deposited.div(numberOfIterations);
            for (let i = 0; i < numberOfIterations; i++) {
                await interaction.connect(signer1).payback(aMaticc.address, paybackStep);
                borrowed = borrowed.sub(paybackStep);
                
                if(borrowed.gt(0)){
                    expect(await interaction.borrowed(collateralToken.address, signer1.address)).to.be.equal(borrowed.add(100), "Borrowed amount is decreasing")
                } else {
                    expect(await interaction.borrowed(collateralToken.address, signer1.address)).to.be.equal(borrowed, "Borrowed amount is decreasing")
                }
                
                expect(await interaction.totalPegLiquidity()).to.be.equal(borrowed, "Total borrowed amount is decreasing");
                
                const availableToBorrow = await interaction.availableToBorrow(aMaticc.address, signer1.address);
                freeCollateral = freeCollateral.add(collateralStep);
                const expectedAvailableToBorrow = freeCollateral.mul(vat_ilks.spot).div(`1${ray}`);
                expect(availableToBorrow).to.be.equal(expectedAvailableToBorrow, "Available to borrow is increasing");
                
                const locked = await interaction.locked(collateralToken.address, signer1.address);
                expect(locked).to.be.equal(deposited, "Locked collateral hasn't changed after borrow");
                
                const free = await interaction.free(collateralToken.address, signer1.address);
                expect(free).to.be.equal("0", "Free collateral amount hasn't change after borrow");
                
                const davosPrice = await interaction.davosPrice(collateralToken.address);
                expect(davosPrice).to.be.equal("1"+wad, "Davos USD rate stays the same");
                const collateralPrice = await interaction.collateralPrice(collateralToken.address);
                expect(collateralPrice).to.be.equal(aMaticRateUSD+wad, "aMATICc USD rate stays the same");
                
                expect(await interaction.collateralRate(collateralToken.address)).to.be.equal(collateralRate, "Collateral rate hasn't change");
                
                const currentLiquidationPrice = await interaction.currentLiquidationPrice(collateralToken.address, signer1.address);
                let expectedLiquidationPrice = borrowed.mul("1"+wad+wad).div(deposited.mul(collateralRate));
                if (borrowed.gt(0)){
                    expectedLiquidationPrice = expectedLiquidationPrice.sub(1);
                }
                expect(currentLiquidationPrice).to.be.equal(expectedLiquidationPrice, "Current liquidation price is decreasing");
                
                const estLiqPriceDavos = await interaction.estimatedLiquidationPriceDAVOS(collateralToken.address, signer1.address, 0);
                expect(estLiqPriceDavos).to.be.equal(expectedLiquidationPrice.div(1e9), "");
                
                const estimatedLiquidationPrice = await interaction.estimatedLiquidationPrice(collateralToken.address, signer1.address, 0);
                expect(estimatedLiquidationPrice).to.be.equal(expectedLiquidationPrice, "Estimated liquidation price is decreasing");
            }
        });
        
        it("Payback rounding checks", async function () {
            await setCollateralType();
            
            let deposited = parseEther("1000");
            await aMaticc.connect(signer1).approve(interaction.address, deposited);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, deposited);
            
            const vat_ilks = await vat.ilks(collateral);
            let borrowed = deposited.mul(vat_ilks.spot).div(`1${ray}`);
            await interaction.connect(signer1).borrow(aMaticc.address, borrowed);
            await davos.connect(signer1).approve(interaction.address, borrowed);
            
            const numberOfIterations = 100;
            const paybackStep = BigNumber.from("111111111111111111");
            for (let i = 1; i <= numberOfIterations; i++) {
                
                await interaction.connect(signer1).payback(aMaticc.address, paybackStep);
                const borrowedActual = await interaction.borrowed(collateralToken.address, signer1.address);
                const borrowedExpected = borrowed.sub(paybackStep.mul(i)).add(100);
                expect(borrowedActual).to.be.equal(borrowedActual)
                console.log(`Borrowed: ${borrowedActual}\tBorrowed diff ${borrowedActual.sub(borrowedExpected)}`);
            }
        });
        
        it("User can not payback more than borrowed", async function () {
            await setCollateralType();
            
            const depositAmount = parseEther(_vat_dust);
            const vat_ilks = await vat.ilks(collateral);
            const borrowed = depositAmount.mul(vat_ilks.spot).div(`1${ray}`);
            
            await aMaticc.connect(signer1).approve(interaction.address, depositAmount);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            await interaction.connect(signer1).borrow(aMaticc.address, borrowed);
            
            await davos.connect(signer1).approve(interaction.address, borrowed);
            //Payback
            await expect(interaction.connect(signer1).payback(aMaticc.address, borrowed.add(1))).to
              .emit(interaction, "Payback")
              .withArgs(signer1.address, aMaticc.address,borrowed, 0, 0); //Event contains correct borrowed amount
            expect(await interaction.borrowed(aMaticc.address, signer1.address)).to.be.equal(0);
            expect(await interaction.deposits(aMaticc.address)).to.be.equal(depositAmount);
        });
        
        it("Reverts: user cant leave less than dust amount", async function () {
            await setCollateralType();
            
            const depositAmount = parseEther(_vat_dust);
            const vat_ilks = await vat.ilks(collateral);
            const borrowed = depositAmount.mul(vat_ilks.spot).div(`1${ray}`);
            
            await aMaticc.connect(signer1).approve(interaction.address, depositAmount);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            await interaction.connect(signer1).borrow(aMaticc.address, borrowed);
            await davos.connect(signer1).approve(interaction.address, borrowed);
            
            //Payback
            await expect(interaction.connect(signer1).payback(aMaticc.address, borrowed.sub(1))).to.be.revertedWith("Vat/dust");
            expect(await interaction.borrowed(aMaticc.address, signer1.address)).to.be.equal(borrowed.add(100));
        });
        
        it("Reverts: amount = 0", async function () {
            await setCollateralType();
            
            const depositAmount = parseEther(_vat_dust);
            const vat_ilks = await vat.ilks(collateral);
            const borrowed = depositAmount.mul(vat_ilks.spot).div(`1${ray}`);
            
            await aMaticc.connect(signer1).approve(interaction.address, depositAmount);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            await interaction.connect(signer1).borrow(aMaticc.address, borrowed);
            await davos.connect(signer1).approve(interaction.address, borrowed);
            
            //Payback
            await expect(interaction.connect(signer1).payback(aMaticc.address, 0)).to.be.revertedWith("Interaction/invalid-davosAmount");
            expect(await interaction.borrowed(aMaticc.address, signer1.address)).to.be.equal(borrowed.add(100));
        });
    });
    
    describe('--- Liquidation and auction', async () => {
        
        it("Reverts: Auction can not be started for the client whom collateral is sufficient", async () => {
            await setCollateralType();
            
            //Approve and deposit
            const depositAmount = parseEther(_vat_dust);
            await aMaticc.connect(signer1).approve(interaction.address, depositAmount);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            
            //Borrow max amount
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrow = depositAmount.mul(vat_ilks.spot).div(`1${ray}`);
            await interaction.connect(signer1).borrow(aMaticc.address, availableToBorrow);
            //No auctions have started yet
            expect(await clip.list()).to.be.empty;
            
            //Start auction - reverted
            await expect(interaction.connect(signer2).startAuction(aMaticc.address, signer1.address, deployer.address))
              .to.be.revertedWith("Dog/not-unsafe");
            expect(await clip.list()).to.be.empty;
        })
        
        it("Auction can be started when the price drops to a liquidation level", async () => {
            await setCollateralType();
            
            //Approve and deposit
            const depositAmount = parseEther(_vat_dust);
            await aMaticc.connect(signer1).approve(interaction.address, depositAmount);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            
            //Borrow max amount
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrow = depositAmount.mul(vat_ilks.spot).div(`1${ray}`);
            console.log(`Going to borrow: ${availableToBorrow}`)
            await interaction.connect(signer1).borrow(aMaticc.address, availableToBorrow);
            //No auctions have started yet
            expect(await clip.list()).to.be.empty
            
            //Get current liquidation price
            const currentLiquidationPrice = await interaction.currentLiquidationPrice(collateralToken.address, signer1.address);
            
            //Set new collateral price = liquidation price
            await oracle.connect(deployer).setPrice(currentLiquidationPrice);
            await spot.connect(deployer).poke(collateral);
            //Start auction
            await interaction.connect(signer2).startAuction(aMaticc.address, signer1.address, deployer.address);
            const sale = await clip.sales(1);
            expect(sale.usr).to.be.equal(signer1.address);
            console.log(sale);
            //User who started auction rewarded with tip and chip
            console.log(`Auction initiator balance: ${await davos.balanceOf(signer2.address)}`);
            
        });
        
        it("Get active auctions", async () => {
            await setCollateralType();
            
            //Approve and deposit
            const depositAmount = parseEther(_vat_dust);
            await aMaticc.connect(deployer).mint(signer2.address, depositAmount);
            //Signer1
            await aMaticc.connect(signer1).approve(interaction.address, depositAmount);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            //Signer2
            await aMaticc.connect(signer2).approve(interaction.address, depositAmount);
            await interaction.connect(signer2).deposit(signer2.address, aMaticc.address, depositAmount);
            
            //Borrow max amount
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrow = depositAmount.mul(vat_ilks.spot).div(`1${ray}`);
            console.log(`Going to borrow: ${availableToBorrow}`)
            //Signer1
            await interaction.connect(signer1).borrow(aMaticc.address, availableToBorrow);
            //Signer2
            await interaction.connect(signer2).borrow(aMaticc.address, availableToBorrow);
            //No auctions have started yet
            expect(await clip.list()).to.be.empty
            
            //Set new collateral price = liquidation price
            const currentLiquidationPrice = await interaction.currentLiquidationPrice(collateralToken.address, signer1.address);
            await oracle.connect(deployer).setPrice(currentLiquidationPrice);
            await spot.connect(deployer).poke(collateral);
            
            const auctionsBefore = await interaction.getAllActiveAuctionsForToken(collateralToken.address);
            expect(auctionsBefore).to.be.empty;
            
            //Start auction
            await interaction.connect(signer3).startAuction(aMaticc.address, signer1.address, deployer.address);
            await interaction.connect(signer3).startAuction(aMaticc.address, signer2.address, deployer.address);
            
            const auctionsAfter = await interaction.getAllActiveAuctionsForToken(collateralToken.address);
            console.log(auctionsAfter);
            expect(auctionsAfter[0].usr).to.be.equal(signer1.address);
            expect(auctionsAfter[1].usr).to.be.equal(signer2.address);
            
            console.log(`Auction[1] status ${await interaction.getAuctionStatus(collateralToken.address, 1)}`);
            console.log(`Auction[2] status ${await interaction.getAuctionStatus(collateralToken.address, 2)}`);
            
        });
        
        it("Reverts: User provides additional collateral after price drops below liquidation but before start of auction", async () => {
            await setCollateralType();
            
            //Approve and deposit
            const depositAmount = parseEther(_vat_dust);
            await aMaticc.connect(signer1).approve(interaction.address, depositAmount);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            
            //Borrow max amount
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrow = depositAmount.mul(vat_ilks.spot).div(`1${ray}`);
            await interaction.connect(signer1).borrow(aMaticc.address, availableToBorrow);
            const currentLiquidationPrice = await interaction.currentLiquidationPrice(collateralToken.address, signer1.address);
            
            //Set new collateral price = liquidation price
            await oracle.connect(deployer).setPrice(currentLiquidationPrice);
            await spot.connect(deployer).poke(collateral);
            
            //Signer1 had provided more collateral before auction started
            await aMaticc.connect(signer1).approve(interaction.address, depositAmount);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, depositAmount);
            
            //Start auction - reverted
            await expect(interaction.connect(signer2).startAuction(aMaticc.address, signer1.address, deployer.address))
              .to.be.revertedWith("Dog/not-unsafe");
            expect(await clip.list()).to.be.empty;
        });
        
        it("revert:: cannot reset auction if status is false(redo not required)", async () => {
            const collateral1Price = toWad("400");
            await oracle.connect(deployer).setPrice(collateral1Price);
            
            await setCollateralType();
            // await aMaticc.connect(deployer).mint(signer1.address, toWad("10000").toString());
            // Approve and send some collateral inside. collateral value == 400 == `dink`
            const dink = toWad("10").toString();
            
            await aMaticc.connect(signer1).approve(interaction.address, dink);
            // Deposit collateral(aMATICc) to the interaction contract
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, dink);
            const dart = toWad("1000").toString();
            await interaction.connect(signer1).borrow(aMaticc.address, dart);
            
            // change collateral price
            await oracle.connect(deployer).setPrice(toWad("124").toString());
            await spot.connect(deployer).poke(collateral);
            await interaction
              .connect(deployer)
              .startAuction(aMaticc.address, signer1.address, deployer.address);
            
            const sale = await clip.sales(1);
            expect(sale.usr).to.not.be.equal(ethers.utils.AddressZero);
            
            const auctions = await interaction.getAllActiveAuctionsForToken(collateralToken.address);
            assert.equal(auctions[0].usr, signer1.address);
            
            const list = await clip.list();
            const auctionStatus = await interaction.getAuctionStatus(collateralToken.address, list[0]);
            // returns true if AuctionRedo is required else returns false
            assert.equal(auctionStatus[0], false);
            
            // since redo is not required, therefore cannot reset the auction
            await expect(
              interaction
                .resetAuction(collateralToken.address, list[0], deployer.address)
            ).to.be.revertedWith("Clipper/cannot-reset");
        });
        
        it("auction works as expected", async () => {
            const collateral1Price = toWad("400");
            await oracle.connect(deployer).setPrice(collateral1Price);
            
            await setCollateralType();
            
            await aMaticc.connect(deployer).mint(signer1.address, toWad("10000").toString());
            await aMaticc.connect(deployer).mint(signer2.address, toWad("10000").toString());
            await aMaticc.connect(deployer).mint(signer3.address, toWad("10000").toString());
            
            const dink1 = toWad("10").toString();
            const dink2 = toWad("1000").toString();
            const dink3 = toWad("1000").toString();
            await aMaticc.connect(signer1).approve(interaction.address, dink1);
            await aMaticc.connect(signer2).approve(interaction.address, dink2);
            await aMaticc.connect(signer3).approve(interaction.address, dink3);
            await interaction.connect(signer1).deposit(signer1.address, aMaticc.address, dink1);
            await interaction.connect(signer2).deposit(signer2.address, aMaticc.address, dink2);
            await interaction.connect(signer3).deposit(signer3.address, aMaticc.address, dink3);
            
            const dart1 = toWad("1000").toString();
            const dart2 = toWad("5000").toString();
            const dart3 = toWad("5000").toString();
            await interaction.connect(signer1).borrow(aMaticc.address, dart1);
            await interaction.connect(signer2).borrow(aMaticc.address, dart2);
            await interaction.connect(signer3).borrow(aMaticc.address, dart3);
            
            await oracle.connect(deployer).setPrice(toWad("124").toString());
            await spot.connect(deployer).poke(collateral);
            
            const auctionId = 1;
            
            let res = await interaction
              .connect(deployer)
              .startAuction(aMaticc.address, signer1.address, deployer.address);
            expect(res).to.emit(clip, "Kick");
            
            await vat.connect(signer2).hope(clip.address);
            await vat.connect(signer3).hope(clip.address);
            
            await davos.connect(signer2).approve(interaction.address, toWad("10000").toString());
            await davos.connect(signer3).approve(interaction.address, toWad("10000").toString());
            
            await advanceTime(1000);
            
            const aMaticcSigner2BalanceBefore = await aMaticc.balanceOf(signer2.address);
            
            await interaction.connect(signer2).buyFromAuction(
              aMaticc.address,
              auctionId,
              toWad("7").toString(),
              toRay("150").toString(),
              signer2.address,
            );
            
            await interaction.connect(signer3).buyFromAuction(
              aMaticc.address,
              auctionId,
              toWad("3").toString(),
              toRay("150").toString(),
              signer3.address,
            );
            
            const aMaticcSigner2BalanceAfter = await aMaticc.balanceOf(signer2.address);
            const sale = await clip.sales(auctionId);
            
            expect(aMaticcSigner2BalanceAfter.sub(aMaticcSigner2BalanceBefore)).to.be.equal(toWad("7").toString());
            expect(sale.pos).to.equal(0);
            expect(sale.tab).to.equal(0);
            expect(sale.lot).to.equal(0);
            expect(sale.tic).to.equal(0);
            expect(sale.top).to.equal(0);
            expect(sale.usr).to.equal(ethers.constants.AddressZero);
        });
    });
    
    describe('--- Collateral management', async () => {
        it("removeCollateralType(): should remove an active collateral type", async () => {
            await setCollateralType();
            const tx = await interaction.removeCollateralType(collateralToken.address)
            const receipt = await tx.wait(1);
        
            let event = (receipt.events?.filter((x) => {return x.event === "CollateralDisabled"}));
            assert.equal(event[0].args.token, collateralToken.address);
            assert.equal(event[0].args.ilk, collateral);
        });
    
        it("revert:: removeCollateralType(): cannot remove an inactive collateral type", async () => {
            await expect(
              interaction
                .removeCollateralType(collateralToken.address)
            ).to.be.revertedWith("Interaction/token-not-init");
        });
    });
    
    describe('--- Helpers', async () => {
        it("stringToBytes32(): should convert string to bytes32", async () => {
            let bytes = await interaction.stringToBytes32("aMATICc");
            assert.equal(bytes, collateral);
        });

        it("stringToBytes32(): should return 0x00 for empty string", async () => {
            let bytes = await interaction.stringToBytes32("");
            assert.equal(bytes, "0x0000000000000000000000000000000000000000000000000000000000000000");
        });
    });

    describe('--- Setters', function () {

        it("revert:: whitelist: only authorized account can enable whitelist", async function () {
            await expect(
                interaction
                .connect(signer1)
                .enableWhitelist()
            ).to.be.revertedWith("Interaction/not-authorized");
        });

        it("whitelist: should let authorized account enable whitelist", async function () {
            await interaction.connect(deployer).enableWhitelist();
            const whitelistMode = await interaction.whitelistMode();
            assert.equal(whitelistMode, 1);
        });

        it("revert:: whitelist: only authorized account can disable whitelist", async function () {
            await expect(
                interaction
                .connect(signer1)
                .disableWhitelist()
            ).to.be.revertedWith("Interaction/not-authorized");
        });
        
        it("whitelist: should let authorized account enable whitelist", async function () {
            await interaction.connect(deployer).enableWhitelist();
            await interaction.connect(deployer).disableWhitelist();
            const whitelistMode = await interaction.whitelistMode();
            assert.equal(whitelistMode, 0);
        });

        it("revert:: whitelist: only authorized account can set whitelist operator", async function () {
            await expect(
                interaction
                .connect(signer1)
                .setWhitelistOperator(signer1.address)
            ).to.be.revertedWith("Interaction/not-authorized");
        });
        
        it("whitelist: should let authorized account set whitelist operator", async function () {
            await interaction.connect(deployer).setWhitelistOperator(signer1.address);
            const whitelistOperator = await interaction.whitelistOperator();
            assert.equal(whitelistOperator, signer1.address);
        });

        it("revert:: whitelist: only authorized account can add an account to whitelist", async function () {
            await expect(
                interaction
                .connect(signer1)
                .addToWhitelist([signer1.address])
            ).to.be.revertedWith("Interaction/not-operator-or-ward");
        });
        
        it("whitelist: should whitelist operator add account to whitelist", async function () {
            await interaction.connect(deployer).setWhitelistOperator(signer1.address);
            await interaction.connect(signer1).addToWhitelist([signer2.address]);
            const whitelisted = await interaction.whitelist(signer2.address);
            assert.equal(whitelisted, true);
        });

        it("revert:: whitelist: only authorized account can remove an account from whitelist", async function () {
            await expect(
                interaction
                .connect(signer1)
                .removeFromWhitelist([signer1.address])
            ).to.be.revertedWith("Interaction/not-operator-or-ward");
        });
        
        it("whitelist: should whitelist operator remove account to whitelist", async function () {
            await interaction.connect(deployer).setWhitelistOperator(signer1.address);
            await interaction.connect(signer1).addToWhitelist([signer2.address]);
            let whitelisted = await interaction.whitelist(signer2.address);
            assert.equal(whitelisted, true);
            await interaction.connect(signer1).removeFromWhitelist([signer2.address]);
            whitelisted = await interaction.whitelist(signer2.address);
            assert.equal(whitelisted, false);
        });

        it("setCores(): only authorized account can set core contracts", async function () {
            await expect(
                interaction
                .connect(signer1)
                .setCores(signer1.address, signer2.address, signer3.address, deployer.address)
            ).to.be.revertedWith("Interaction/not-authorized");
        });

        it("setCores(): should let authorized account set core contracts", async function () {
            await interaction.setCores(vat.address, spot.address, davosJoin.address, jug.address);
        });

        it("setDavosApprove(): only authorized account can set core contracts", async function () {
            await expect(
                interaction
                .connect(signer1)
                .setDavosApprove()
            ).to.be.revertedWith("Interaction/not-authorized");
        });

        it("setDavosApprove(): should let authorized account set core contracts", async function () {
            await interaction.setDavosApprove();
            let allowance = await davos.allowance(interaction.address, davosJoin.address);
            expect(allowance).eq(ethers.constants.MaxUint256);
        });

        it("setCollateralType(): only authorized account can set core contracts", async function () {
            await expect(
                interaction
                .connect(signer1)
                .setCollateralType(
                    collateralToken.address,
                    gemJoin.address,
                    _ilkCeMatic,
                    clip.address,
                    _mat)
            ).to.be.revertedWith("Interaction/not-authorized");
        });

        it("setCollateralType(): collateral type can be set for once only", async function () {
            await setCollateralType();
            await expect(
                interaction
                .connect(deployer)
                .setCollateralType(
                    collateralToken.address,
                    gemJoin.address,
                    _ilkCeMatic,
                    clip.address,
                    _mat)
            ).to.be.revertedWith("Interaction/token-already-init");
        });

        it("setRewards(): only authorized account can set core contracts", async function () {
            await expect(
                interaction
                .connect(signer1)
                .setRewards(rewards.address)
            ).to.be.revertedWith("Interaction/not-authorized");
        });

        it("setRewards(): should let authorized account set core contracts", async function () {
            await interaction.setRewards(signer1.address);
            assert.equal((await interaction.dgtRewards()), signer1.address);
        });
    })
});