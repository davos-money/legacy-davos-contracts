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

describe("Interaction", function () {

    let collateral, _chainId, _mat, _ikkaRewardsPoolLimitInEth, _vat_Line, _vat_line,
        _spot_par, _dog_Hole, _dog_hole, _dog_chop, _abacus_tau, _clip_buf, _clip_tail,
        _clip_cusp, _clip_chip, _clip_tip, _clip_stopped, _multisig, _vat_dust, sMatic;
        
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
        _ikkaRewardsPoolLimitInEth = "100000000";
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

        // Signer
        [deployer] = await ethers.getSigners();
        _multisig = deployer.address;

        [swapPool, wMatic, aMaticc] = await deploySwapPool();
        collateralToken = aMaticc;

        _ilkCeMatic = ethers.utils.formatBytes32String("aMATICc");

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

        const auctionProxy = await this.AuctionProxy.deploy();
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

        gemJoin = await upgrades.deployProxy(this.GemJoin, [vat.address, _ilkCeMatic, collateralToken.address], {initializer: "initialize"});
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

        sikkaProvider = await upgrades.deployProxy(this.SikkaProvider, [sMatic.address, collateralToken.address, interaction.address], {initializer: "initialize"});
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
    }

    async function setCollateralType() {
        await interaction.setCollateralType(collateralToken.address, gemJoin.address, _ilkCeMatic, clip.address, _mat);
        await interaction.poke(collateralToken.address);
        await interaction.drip(collateralToken.address);
    }
    
    before(async function () {
        [deployer, signer1, signer2, signer3] = await ethers.getSigners();
        await init();
        await networkSnapshotter.firstSnapshot();
    });

    afterEach("revert", async () => await networkSnapshotter.revert());
    
    describe('Basic functionality', async () => {
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

        it("revert:: deposit(): cannot deposit collateral for inactive collateral type", async function () {
            const depositAmount = parseEther("1");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
                interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
            )).to.be.revertedWith("Interaction/inactive-collateral");
        });

        it("deposit(): should let user deposit collateral", async function () {
            await setCollateralType();
            const depositAmount = parseEther("1");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256);
            await expect(
            tx = await interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
            )).to.emit(interaction, "Deposit")
            .withArgs(signer1.address, collateralToken.address, depositAmount, depositAmount);
            const deposits = await interaction.deposits(aMaticc.address);
            expect(deposits.eq(depositAmount));
        });

        it("revert:: deposit(): only whitelisted account can deposit", async function () {
            await interaction.connect(deployer).enableWhitelist();
            await setCollateralType();
            const depositAmount = parseEther("1");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
                interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
            )).to.be.revertedWith("Interaction/not-in-whitelist");
        });

        it("revert:: deposit(): should not let user deposit collateral directly to interaction", async function () {
            await setCollateralType();
            await interaction.setSikkaProvider(collateralToken.address, sikkaProvider.address)
            const depositAmount = parseEther("1");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
                interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
            )).to.be.revertedWith("Interaction/only sikka provider can deposit for this token");
        });

        it("withdraw(): should let user withdraw", async function () {
            await setCollateralType();
            const depositAmount = parseEther("1");
            const withdrawAmount = parseEther("0.5");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
                interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
            )).to.emit(interaction, "Deposit")
            .withArgs(signer1.address, collateralToken.address, depositAmount, depositAmount);
            const depositsBefore = await interaction.deposits(aMaticc.address);
            expect(depositsBefore.eq(depositAmount));
            
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

        it("revert:: withdraw(): Caller must be the same address as participant(!sikkaProvider)", async function () {
            await setCollateralType();
            const depositAmount = parseEther("1");
            const withdrawAmount = parseEther("0.5");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
                interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
            )).to.emit(interaction, "Deposit")
            .withArgs(signer1.address, collateralToken.address, depositAmount, depositAmount);
            const depositsBefore = await interaction.deposits(aMaticc.address);
            expect(depositsBefore.eq(depositAmount));
            
            await expect(
                interaction.connect(signer2).withdraw(
                signer1.address,
                aMaticc.address,
                withdrawAmount
            )).to.be.revertedWith("Interaction/Caller must be the same address as participant");
        });

        it("revert:: withdraw(): Caller must be the same address as participant(!sikkaProvider)", async function () {
            await setCollateralType();
            const depositAmount = parseEther("1");
            const withdrawAmount = parseEther("0.5");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
                interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
            )).to.emit(interaction, "Deposit")
            .withArgs(signer1.address, collateralToken.address, depositAmount, depositAmount);
            const depositsBefore = await interaction.deposits(aMaticc.address);
            expect(depositsBefore.eq(depositAmount));
           
            await interaction.setSikkaProvider(collateralToken.address, sikkaProvider.address)
            await expect(
                interaction.connect(signer2).withdraw(
                signer1.address,
                aMaticc.address,
                withdrawAmount
            )).to.be.revertedWith("Interaction/Only sikka provider can call this function for this token");
        });

        it("borrow(): should let user borrow", async function () {
            await setCollateralType();
            const depositAmount = parseEther("1000");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
                interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
            )).to.emit(interaction, "Deposit")
            .withArgs(signer1.address, collateralToken.address, depositAmount, depositAmount);
            const depositsBefore = await interaction.deposits(aMaticc.address);
            expect(depositsBefore.eq(depositAmount));
              
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrowBefore = await interaction.availableToBorrow(aMaticc.address, signer1.address);
            const locked = await interaction.locked(collateralToken.address, signer1.address);
            
            expect(depositAmount.eq(locked));
            assert.equal(Number(availableToBorrowBefore), (depositAmount.mul(vat_ilks.spot))/1e27);
            
            const borrowAmount = availableToBorrowBefore
            await expect(
                interaction.connect(signer1).borrow(
                aMaticc.address,
                borrowAmount
            )).to.emit(interaction, "Borrow");
            
            const availableToBorrowAfter = await interaction.availableToBorrow(aMaticc.address, signer1.address);
            assert.equal(availableToBorrowAfter, availableToBorrowBefore - borrowAmount);
            expect((await interaction.borrowed(collateralToken.address, signer1.address)).eq(borrowAmount))
            expect((await interaction.totalPegLiquidity()).eq(borrowAmount))
        });

        it("borrow(): should let user borrow and compare getter function values", async function () {
            await setCollateralType();
            const depositAmount = parseEther("1000");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
                interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
            )).to.emit(interaction, "Deposit")
            .withArgs(signer1.address, collateralToken.address, depositAmount, depositAmount);
            const depositsBefore = await interaction.deposits(aMaticc.address);
            expect(depositsBefore.eq(depositAmount));
              
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrowBefore = await interaction.availableToBorrow(aMaticc.address, signer1.address);
            const locked = await interaction.locked(collateralToken.address, signer1.address);
            
            expect(depositAmount.eq(locked));
            assert.equal(Number(availableToBorrowBefore), (depositAmount.mul(vat_ilks.spot)) / 1e27);
            await interaction.upchostClipper(collateralToken.address)
            
            const borrowAmount = availableToBorrowBefore;
            await interaction.connect(signer1).borrow(aMaticc.address,borrowAmount);
            await interaction.borrowApr(collateralToken.address);
            
            const estLiqPriceSikka = await interaction.estimatedLiquidationPriceSIKKA(collateralToken.address, signer1.address, borrowAmount);
            expect(estLiqPriceSikka.gt(borrowAmount));

            const estimatedLiquidationPrice = await interaction.estimatedLiquidationPrice(collateralToken.address, signer1.address, borrowAmount);
            expect(estimatedLiquidationPrice.gt(borrowAmount));

            const currentLiquidationPrice = await interaction.currentLiquidationPrice(collateralToken.address, signer1.address);
            expect(currentLiquidationPrice.gt(borrowAmount));

            const willBorrow = await interaction.willBorrow(collateralToken.address, signer1.address, depositAmount);
            expect(willBorrow.eq(borrowAmount.add(borrowAmount)));

            const free = await interaction.free(collateralToken.address, signer1.address);
            expect(free.eq(0));

            const collateralTVL = await interaction.collateralTVL(collateralToken.address);
            expect(collateralTVL.eq(borrowAmount));

            const depositTVL = await interaction.depositTVL(collateralToken.address);
            expect(depositTVL.eq(depositAmount));

            
            const sikkaPrice = await interaction.sikkaPrice(collateralToken.address);
            expect(sikkaPrice.eq(parseEther("1")));
            
            const collateralPrice = await interaction.collateralPrice(collateralToken.address);
            expect(collateralPrice.eq(parseEther("2")));

            const collateralRate = await interaction.collateralRate(collateralToken.address);
            assert.equal(collateralRate, 1e45 / _mat);
        });

        it("revert:: borrow(): should not let borrow more than available", async function () {
            await setCollateralType();
            const depositAmount = parseEther("1000");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256)
            await expect(
                interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
            )).to.emit(interaction, "Deposit")
            .withArgs(signer1.address, collateralToken.address, depositAmount, depositAmount);
            const depositsBefore = await interaction.deposits(aMaticc.address);
            expect(depositsBefore.eq(depositAmount));
              
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrowBefore = await interaction.availableToBorrow(aMaticc.address, signer1.address);
            const locked = await interaction.locked(collateralToken.address, signer1.address);
            
            expect(depositAmount.eq(locked));
            assert.equal(Number(availableToBorrowBefore), (depositAmount.mul(vat_ilks.spot))/1e27);
            
            const borrowAmount = availableToBorrowBefore + 1
            await expect(
                interaction.connect(signer1).borrow(
                aMaticc.address,
                borrowAmount
            )).to.be.revertedWith("Vat/not-safe");
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
            expect(depositsBefore.eq(depositAmount));
              
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrowBefore = await interaction.availableToBorrow(aMaticc.address, signer1.address);
            const locked = await interaction.locked(collateralToken.address, signer1.address);
            
            expect(depositAmount.eq(locked));
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

        it("payback(): should let user payback outstanding debt(borrowed sikka)", async function () {
            await setCollateralType();
            const depositAmount = parseEther("1000");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256);
            await sikka.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256);

            await expect(
                interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
            )).to.emit(interaction, "Deposit")
            .withArgs(signer1.address, collateralToken.address, depositAmount, depositAmount);
            const depositsBefore = await interaction.deposits(aMaticc.address);
            expect(depositsBefore.eq(depositAmount));
              
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrowBefore = await interaction.availableToBorrow(aMaticc.address, signer1.address);
            const locked = await interaction.locked(collateralToken.address, signer1.address);
            
            expect(depositAmount.eq(locked));
            assert.equal(Number(availableToBorrowBefore), (depositAmount.mul(vat_ilks.spot))/1e27);
            
            const borrowAmount = availableToBorrowBefore
            await expect(
                interaction.connect(signer1).borrow(
                aMaticc.address,
                borrowAmount
            )).to.emit(interaction, "Borrow");
            
            const availableToBorrowAfter = await interaction.availableToBorrow(aMaticc.address, signer1.address);
            assert.equal(availableToBorrowAfter, availableToBorrowBefore - borrowAmount);

            const paybackAmount = (await interaction.borrowed(collateralToken.address, signer1.address)).sub(parseEther("100")).sub("100");
            await expect(
                interaction.connect(signer1).payback(
                aMaticc.address,
                paybackAmount
            )).to.emit(interaction, "Payback");
            
            const borrowed = await interaction.borrowed(collateralToken.address, signer1.address)
            expect(borrowed.eq(0));
        });

        it("revert:: payback(): should revert if user leave dust", async function () {
            await setCollateralType();
            const depositAmount = parseEther("1000");
            await aMaticc.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256);
            await sikka.connect(signer1).approve(interaction.address, ethers.constants.MaxUint256);

            await expect(
                interaction.connect(signer1).deposit(
                signer1.address,
                aMaticc.address,
                depositAmount
            )).to.emit(interaction, "Deposit")
            .withArgs(signer1.address, collateralToken.address, depositAmount, depositAmount);
            const depositsBefore = await interaction.deposits(aMaticc.address);
            expect(depositsBefore.eq(depositAmount));
              
            const vat_ilks = await vat.ilks(collateral);
            const availableToBorrowBefore = await interaction.availableToBorrow(aMaticc.address, signer1.address);
            const locked = await interaction.locked(collateralToken.address, signer1.address);
            
            expect(depositAmount.eq(locked));
            assert.equal(Number(availableToBorrowBefore), (depositAmount.mul(vat_ilks.spot))/1e27);
            
            const borrowAmount = availableToBorrowBefore
            await expect(
                interaction.connect(signer1).borrow(
                aMaticc.address,
                borrowAmount
            )).to.emit(interaction, "Borrow");
            const availableToBorrowAfter = await interaction.availableToBorrow(aMaticc.address, signer1.address);
            assert.equal(availableToBorrowAfter, availableToBorrowBefore - borrowAmount);
            
            const paybackAmount = borrowAmount.sub(parseEther("1"))
            await expect(
                interaction.connect(signer1).payback(
                aMaticc.address,
                paybackAmount
            )).to.be.revertedWith("Vat/dust");            
        });

        it("auction started as expected", async () => {
            const collateral1Price = toWad("400");
            await oracle.connect(deployer).setPrice(collateral1Price);

            await setCollateralType();
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
        
            await sikka.connect(signer2).approve(interaction.address, toWad("10000").toString());
            await sikka.connect(signer3).approve(interaction.address, toWad("10000").toString());
        
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

        it("stringToBytes32(): should convert string to bytes32", async () => {
            let bytes = await interaction.stringToBytes32("aMATICc");
            assert.equal(bytes, collateral);
        });

        it("stringToBytes32(): should return 0x00 for empty string", async () => {
            let bytes = await interaction.stringToBytes32("");
            assert.equal(bytes, "0x0000000000000000000000000000000000000000000000000000000000000000");
        });

        it("removeCollateralType(): should remove an active collateral type", async () => {
            await setCollateralType();
            const tx = await interaction.removeCollateralType(collateralToken.address)
            const receipt = await tx.wait(1);
            
            let event = (receipt.events?.filter((x) => {return x.event == "CollateralDisabled"}));
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

    describe("setters", function () {

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
            await interaction.setCores(vat.address, spot.address, sikkaJoin.address, jug.address);
        });

        it("setSikkaApprove(): only authorized account can set core contracts", async function () {
            await expect(
                interaction
                .connect(signer1)
                .setSikkaApprove()
            ).to.be.revertedWith("Interaction/not-authorized");
        });

        it("setSikkaApprove(): should let authorized account set core contracts", async function () {
            await interaction.setSikkaApprove();
            let allowance = await sikka.allowance(interaction.address, sikkaJoin.address);
            expect(allowance.eq(ethers.constants.MaxUint256))
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
            assert.equal((await interaction.ikkaRewards()), signer1.address);
        });
    })
});