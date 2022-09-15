const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { ethers, network } = require('hardhat');
const Web3 = require('web3');
const {ether, expectRevert, BN, expectEvent, constants} = require('@openzeppelin/test-helpers');
const hre = require("hardhat");

///////////////////////////////////////////
//Word of Notice: Commented means pending//
//The test will be updated on daily basis//
///////////////////////////////////////////

xdescribe('===INTERACTION-Multicollateral===', function () {
    let deployer, signer1, signer2, mockVow;

    let vat,
        spot,
        sikka,
        amaticc,
        amaticcJoin,
        amaticc2,
        amaticcJoin2,
        sikkaJoin,
        jug,
        dog,
        clipAMATICC,
        rewards,
        ikka,
        oracle,
        oracle2,
        ikkaOracle,
        auctionProxy;

    let interaction;

    let wad = "000000000000000000", // 18 Decimals
        ray = "000000000000000000000000000", // 27 Decimals
        rad = "000000000000000000000000000000000000000000000", // 45 Decimals
        ONE = 10 ** 27;


    let collateral = ethers.utils.formatBytes32String("aMATICc");
    let collateral2 = ethers.utils.formatBytes32String("aMATICc2");

    beforeEach(async function () {

        ////////////////////////////////
        /** Deployments ------------ **/
        ////////////////////////////////

        [deployer, signer1, signer2, mockVow] = await ethers.getSigners();

        this.Vat = await ethers.getContractFactory("Vat");
        this.Spot = await ethers.getContractFactory("Spotter");
        this.Sikka = await ethers.getContractFactory("Sikka");
        this.AMATICC = await ethers.getContractFactory("aMATICc");
        this.GemJoin = await ethers.getContractFactory("GemJoin");
        this.SikkaJoin = await ethers.getContractFactory("SikkaJoin");
        this.Jug = await ethers.getContractFactory("Jug");
        this.Oracle = await ethers.getContractFactory("Oracle"); // Mock Oracle
        this.Dog = await ethers.getContractFactory("Dog");
        this.ClipAMATICC = await ethers.getContractFactory("Clipper");
        this.Abaci = await ethers.getContractFactory("LinearDecrease");
        this.Vow = await ethers.getContractFactory("Vow");
        this.AuctionProxy = await ethers.getContractFactory("AuctionProxy");
        this.Ikka = await ethers.getContractFactory("IkkaToken");
        const MaticOracle = await ethers.getContractFactory('MaticOracle');
        const IkkaRewards = await ethers.getContractFactory('IkkaRewards');


        // Core module
        vat = await this.Vat.connect(deployer).deploy();
        await vat.initialize();

        spot = await this.Spot.connect(deployer).deploy(vat.address);
        await spot.deployed();

        // Sikka module
        sikka = await this.Sikka.connect(deployer).deploy(97, "testSIKKA");
        await sikka.deployed(); // Stable Coin
        sikkaJoin = await this.SikkaJoin.connect(deployer).deploy(vat.address, sikka.address);
        await sikkaJoin.deployed();

        const aMATICb = artifacts.require("aMATICb");
        amaticb = await aMATICb.new();
        await amaticb.initialize(deployer.address);
        amaticb2 = await aMATICb.new();
        await amaticb2.initialize(deployer.address);
        // Collateral module
        amaticc = await this.AMATICC.connect(deployer).deploy();
        await amaticc.initialize(constants.ZERO_ADDRESS, amaticb.address);
        amaticcJoin = await this.GemJoin.connect(deployer).deploy(vat.address, collateral, amaticc.address);
        await amaticcJoin.deployed();
        // Collateral 2
        amaticc2 = await this.AMATICC.connect(deployer).deploy();
        await amaticc2.initialize(constants.ZERO_ADDRESS, amaticb.address);
        amaticcJoin2 = await this.GemJoin.connect(deployer).deploy(vat.address, collateral2, amaticc2.address);
        await amaticcJoin2.deployed();

        // Rates module
        jug = await this.Jug.connect(deployer).deploy(vat.address);
        await jug.deployed();

        // External
        oracle = await this.Oracle.connect(deployer).deploy();
        await oracle.deployed();
        oracle2 = await this.Oracle.connect(deployer).deploy();
        await oracle2.deployed();

        dog = await this.Dog.connect(deployer).deploy(vat.address);
        await dog.deployed();
        clipAMATICC = await this.ClipAMATICC.connect(deployer).deploy(vat.address, spot.address, dog.address, collateral);
        await clipAMATICC.deployed();

        ikkaOracle = await MaticOracle.connect(deployer).deploy();
        await ikkaOracle.initialize("100000000000000000");
        rewards = await IkkaRewards.connect(deployer).deploy();
        await rewards.initialize(vat.address, ether("100000000").toString());
        ikka = await this.Ikka.connect(deployer).deploy(ether("100000000").toString(), rewards.address);
        await ikka.deployed();

        auctionProxy = await this.AuctionProxy.connect(deployer).deploy();
        await auctionProxy.deployed();

        const Interaction = await hre.ethers.getContractFactory("Interaction", {
            unsafeAllow: ['external-library-linking'],
            libraries: {
                AuctionProxy: auctionProxy.address
            },
        });
        interaction = await Interaction.deploy();
        await interaction.initialize(
            vat.address,
            spot.address,
            sikka.address,
            sikkaJoin.address,
            jug.address,
            dog.address,
            rewards.address,
        );
        //////////////////////////////
        /** Initial Setup -------- **/
        //////////////////////////////

        await ikka.connect(deployer).rely(rewards.address);
        await rewards.connect(deployer).setIkkaToken(ikka.address);
        await rewards.connect(deployer).setOracle(ikkaOracle.address);
        await rewards.connect(deployer).initPool(amaticc.address, collateral, "1000000001847694957439350500"); //6%
        await rewards.connect(deployer).rely(interaction.address);
        await jug.connect(deployer).rely(interaction.address);

        // Initialize External
        // 2.000000000000000000000000000 ($) * 0.8 (80%) = 1.600000000000000000000000000,
        // 2.000000000000000000000000000 / 1.600000000000000000000000000 = 1.250000000000000000000000000 = mat
        await oracle.connect(deployer).setPrice("400" + wad); // 400$, mat = 80%, 400$ * 80% = 320$ With Safety Margin
        await oracle2.connect(deployer).setPrice("300" + wad); // 400$, mat = 80%, 400$ * 80% = 320$ With Safety Margin

        // Initialize Core Module
        // await vat.connect(deployer).init(collateral);
        // await vat.connect(deployer).rely(amaticcJoin.address);
        await vat.connect(deployer).rely(sikkaJoin.address);
        await vat.connect(deployer).rely(spot.address);
        await vat.connect(deployer).rely(jug.address);
        await vat.connect(deployer).rely(interaction.address);
        await vat.connect(deployer).rely(dog.address);
        await vat.connect(deployer).rely(amaticcJoin.address);
        await vat.connect(deployer).rely(amaticcJoin2.address);

        // await vat.connect(deployer).rely(jug.address);
        await vat.connect(deployer)["file(bytes32,uint256)"](ethers.utils.formatBytes32String("Line"), "20000" + rad); // Normalized SIKKA
        await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, ethers.utils.formatBytes32String("line"), "2000" + rad);
        // await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, ethers.utils.formatBytes32String("spot"), "500" + rad);
        await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, ethers.utils.formatBytes32String("dust"), "100000000000000000" + ray); //0.1 rad

        await spot.connect(deployer)["file(bytes32,bytes32,address)"](collateral, ethers.utils.formatBytes32String("pip"), oracle.address);
        await spot.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, ethers.utils.formatBytes32String("mat"), "1250000000000000000000000000"); // Liquidation Ratio
        await spot.connect(deployer)["file(bytes32,uint256)"](ethers.utils.formatBytes32String("par"), "1" + ray); // It means pegged to 1$
        await spot.connect(deployer).poke(collateral);

        //Collateral2
        await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral2, ethers.utils.formatBytes32String("line"), "3000" + rad);
        await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral2, ethers.utils.formatBytes32String("dust"), "1" + rad);

        await spot.connect(deployer)["file(bytes32,bytes32,address)"](collateral2, ethers.utils.formatBytes32String("pip"), oracle2.address);
        await spot.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral2, ethers.utils.formatBytes32String("mat"), "1250000000000000000000000000"); // Liquidation Ratio
        await spot.connect(deployer)["file(bytes32,uint256)"](ethers.utils.formatBytes32String("par"), "1" + ray); // It means pegged to 1$
        await spot.connect(deployer).poke(collateral2);


        // Initialize SIKKA Module
        await sikka.connect(deployer).rely(sikkaJoin.address);

        // Stability fees
        //calculate base rate
        const year_seconds = 31536000;
        const rate_percent = 0.1; //10%;
        let fractionBR = (1 + rate_percent)**(1/year_seconds);
        // let BR = new BN(fractionBR)*10**27;
        let BR = new BN("1000000003022266000000000000").toString();
        console.log(BR);
        // await jug.connect(deployer)["file(bytes32,uint256)"](ethers.utils.formatBytes32String("base"), "1000000000315529215730000000"); // 1% Yearly
        await jug.connect(deployer)["file(bytes32,uint256)"](ethers.utils.formatBytes32String("base"), BR); // 1% Yearly
        // Setting duty requires now == rho. So Drip then Set, or Init then Set.
        // await jug.connect(deployer).init(collateral); // Duty by default set here to 1 Ray which is 0%, but added to Base that makes its effect compound
        // await jug.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, ethers.utils.formatBytes32String("duty"), "0000000000312410000000000000"); // 1% Yearly Factored

        // evm does not support stopping time for now == rho, so we create a mock contract which calls both functions to set duty
        let proxyLike = await (await (await ethers.getContractFactory("ProxyLike")).connect(deployer).deploy(jug.address, vat.address)).deployed();
        await jug.connect(deployer).rely(proxyLike.address);
        // await proxyLike.connect(deployer).jugInitFile(collateral, ethers.utils.formatBytes32String("duty"), "0");
        // await proxyLike.connect(deployer).jugInitFile(collateral2, ethers.utils.formatBytes32String("duty"), "0000000000312410000000000000"); // 1% Yearly Factored

        await jug.connect(deployer)["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), mockVow.address);

        await interaction.connect(deployer).setCollateralType(amaticc.address, amaticcJoin.address, collateral,
            clipAMATICC.address, "1250000000000000000000000000");
        await interaction.connect(deployer).setCollateralType(amaticc2.address, amaticcJoin2.address, collateral2,
            clipAMATICC.address, "1250000000000000000000000000");
        await amaticcJoin.connect(deployer).rely(interaction.address);
        await amaticcJoin2.connect(deployer).rely(interaction.address);
        await clipAMATICC.connect(deployer).rely(interaction.address);
        await sikkaJoin.connect(deployer).rely(interaction.address);

        expect(await(await jug.base()).toString()).to.be.equal(BR);
        expect(await(await(await jug.ilks(collateral)).duty).toString()).to.be.equal("0");
        expect(await(await(await jug.ilks(collateral2)).duty).toString()).to.be.equal("0");

        let s1Balance = (await amaticc.balanceOf(signer1.address)).toString();
        expect(s1Balance).to.equal("0");
        //Mint some tokens for user
        await amaticc.connect(deployer).mint(signer1.address, ether("5000").toString());
        await amaticc.connect(deployer).mint(signer2.address, ether("5000").toString());
        s1Balance = (await amaticc.balanceOf(signer1.address)).toString();
        expect(s1Balance).to.equal(ether("5000").toString());

        await amaticc2.connect(deployer).mint(signer1.address, ether("400").toString());
    });

    it('defaults', async function () {

        // let ilk = await interaction.connect(deployer).ilk(amaticc.address);
        // console.log("Ilk: " + ilk);
        let amaticcPrice = await interaction.connect(signer1).collateralPrice(amaticc.address);
        expect(amaticcPrice.toString()).to.equal(ether("400").toString());
        let amaticcPrice2 = await interaction.connect(signer1).collateralPrice(amaticc2.address);
        expect(amaticcPrice2.toString()).to.equal(ether("300").toString());

        let rate1 = await interaction.connect(signer1).collateralRate(amaticc.address);
        expect(rate1.toString()).to.equal("800000000000000000"); //80%
        let rate2 = await interaction.connect(signer1).collateralRate(amaticc2.address);
        expect(rate2.toString()).to.equal("800000000000000000");

        // Check initial state
        let free = await interaction.connect(signer1).free(amaticc.address, signer1.address);
        expect(free.toString()).to.equal("0");
        let locked = await interaction.connect(signer1).locked(amaticc.address, signer1.address);
        expect(locked.toString()).to.equal("0");

        let borrowApr = await interaction.connect(signer1).borrowApr(amaticc.address);
        expect(borrowApr.toString()).to.equal("10006965766471151936");

        let rewardPool = await rewards.rewardsPool();
        expect(rewardPool.toString()).to.equal("0");
    });

    it('put collateral and borrow', async function () {
        // Approve and send some collateral inside. collateral value == 400 == `dink`
        let dink = ether("2").toString();

        await amaticc.connect(signer1).approve(interaction.address, dink);
        // Deposit collateral(aMATICc) to the interaction contract
        await interaction.connect(signer1).deposit(signer1.address, amaticc.address, dink);

        let s1Balance = (await amaticc.balanceOf(signer1.address)).toString();
        expect(s1Balance).to.equal(ether("4998").toString());

        let s1SIKKABalance = (await sikka.balanceOf(signer1.address)).toString();
        expect(s1SIKKABalance).to.equal("0");

        let free = await interaction.connect(signer1).free(amaticc.address, signer1.address);
        expect(free.toString()).to.equal("0");
        let locked = await interaction.connect(signer1).locked(amaticc.address, signer1.address);
        expect(locked.toString()).to.equal(ether("2").toString());

        // Locking collateral and borrowing SIKKA
        // We want to draw 60 SIKKA == `dart`
        // Maximum available for borrow = (2 * 400 ) * 0.8 = 640
        let dart = ether("60").toString();
        await interaction.connect(signer1).borrow(amaticc.address, dart);

        s1SIKKABalance = (await sikka.balanceOf(signer1.address)).toString();
        expect(s1SIKKABalance).to.equal(dart);

        free = await interaction.connect(signer1).free(amaticc.address, signer1.address);
        expect(free.toString()).to.equal("0");
        locked = await interaction.connect(signer1).locked(amaticc.address, signer1.address);
        expect(locked.toString()).to.equal(dink);
        s1SIKKABalance = (await sikka.balanceOf(signer1.address)).toString();
        expect(s1SIKKABalance).to.equal(dart);

        // User locked 2 aMATICc with price 400 and rate 0.8 == 640$ collateral worth
        // Borrowed 60$ => available should equal to 640 - 60 = 580.
        let available = await interaction.connect(signer1).availableToBorrow(amaticc.address, signer1.address);
        expect(available.toString()).to.equal("579999999999999999999");

        // 2 * 37.5 * 0.8 == 60$
        let liquidationPrice = await interaction.connect(signer1).currentLiquidationPrice(amaticc.address, signer1.address);
        expect(liquidationPrice.toString()).to.equal(ether("37.5").toString());
        // console.log("Liq.price is: " + liquidationPrice.toString());

        // ( 2 + 1 ) * 25 * 0.8 == 60$
        let estLiquidationPrice = await interaction.connect(signer1).estimatedLiquidationPrice(
            amaticc.address, signer1.address, ether("1").toString()
        );
        expect(estLiquidationPrice.toString()).to.equal(ether("25").toString());
        console.log("Est.Liq.price is: " + estLiquidationPrice.toString());

        // Update Stability Fees
        await network.provider.send("evm_increaseTime", [31536000]); // Jump 1 Year
        await interaction.connect(signer1).drip(amaticc.address);

        availableYear = await interaction.connect(signer1).availableToBorrow(amaticc.address, signer1.address);
        expect(availableYear.toString()).to.equal("573999999759105624305"); //roughly 10 percents less.
    });

    // 100 MATIC -> Ankr
    // 100 aMATICc <-- Ankr 7%
    // 100 aMATICc --> Ikka
    // XXX DAI <-- Ikka (mint)
    // DAI -> Jar contract (modified MakerDAO Pot) 10%
    // jar is similar to pot but pot has no rewards limit and the interest is based on the percentage of deposit
    // jar has rewards limit and interest is based on percentage share of deposits from fixed emission
    // DAI*(1 + fees%) --> Ikka
    // MKR token <-- Ikka (amount of MKR == stability fee)

    it('payback and withdraw', async function() {
        //deposit&borrow
        let dink = ether("2").toString();
        await amaticc.connect(signer1).approve(interaction.address, dink);
        await interaction.connect(signer1).deposit(signer1.address, amaticc.address, dink);
        let dart = ether("60").toString();
        await interaction.connect(signer1).borrow(amaticc.address, dart);

        let s1Balance = (await amaticc.balanceOf(signer1.address)).toString();
        expect(s1Balance).to.equal(ether("4998").toString());
        let s1SIKKABalance = (await sikka.balanceOf(signer1.address)).toString();
        expect(s1SIKKABalance).to.equal(dart);

        await sikka.connect(signer1).approve(interaction.address, dart);
        await interaction.connect(signer1).payback(amaticc.address, dart);

        s1SIKKABalance = (await sikka.balanceOf(signer1.address)).toString();
        expect(s1SIKKABalance).to.equal("0");
        // let ilk = await vat.connect(signer1).ilks(collateral);
        // console.log(ilk);

        // vatState = await vat.connect(signer1).urns(collateral, signer1.address);
        // console.log(vatState);

        let available = await interaction.connect(signer1).availableToBorrow(amaticc.address, signer1.address);
        expect(available.toString()).to.equal(ether("640").toString());

        let willBeAvailable = await interaction.connect(signer1).willBorrow(
            amaticc.address, signer1.address, ether("1").toString()
        );
        expect(willBeAvailable.toString()).to.equal(ether("960").toString());

        // SIKKA are burned, now we have to withdraw collateral
        // We will always withdraw all available collateral
        s1Balance = (await amaticc.balanceOf(signer1.address)).toString();
        expect(s1Balance).to.equal(ether("4998").toString());

        let free = await interaction.connect(signer1).free(amaticc.address, signer1.address);
        expect(free.toString()).to.equal("0");

        expectRevert(interaction.connect(signer2).withdraw(signer1.address, amaticc.address, ether("1").toString()),
            "Interaction/Caller must be the same address as participant");

        await interaction.connect(signer1).withdraw(signer1.address, amaticc.address, ether("1").toString());

        s1Balance = (await amaticc.balanceOf(signer1.address)).toString();
        expect(s1Balance).to.equal(ether("4999").toString());
    });

    it('drip', async function() {
        //deposit&borrow
        let dink = ether("2").toString();
        await amaticc.connect(signer1).approve(interaction.address, dink);
        await interaction.connect(signer1).deposit(signer1.address, amaticc.address, dink);
        let dart = ether("60").toString();
        await interaction.connect(signer1).borrow(amaticc.address, dart);

        let borrowed = await interaction.connect(signer1).borrowed(amaticc.address, signer1.address);
        expect(borrowed.toString()).to.equal(dart);

        await network.provider.send("evm_increaseTime", [86400]); // Jump 1 Day
        await interaction.connect(signer1).drip(amaticc.address);

        await amaticc.connect(signer2).approve(interaction.address, dink);
        await interaction.connect(signer2).deposit(signer2.address, amaticc.address, dink);
        await interaction.connect(signer2).borrow(amaticc.address, dart);
        let borrowed2 = await interaction.connect(signer2).borrowed(amaticc.address, signer2.address);
        expect(borrowed2.toString()).to.equal(dart);

        // await network.provider.send("evm_increaseTime", [86400]); // Jump 1 Day
        // await interaction.drip(amaticc.address, {from: signer1.address});

        await sikka.connect(signer2).approve(interaction.address, dart);
        await interaction.connect(signer2).payback(amaticc.address, dart);

        borrowed2 = await interaction.connect(signer2).borrowed(amaticc.address, signer2.address);
        expect(borrowed2.toString()).to.equal("0");

        await interaction.connect(signer2).borrowed(amaticc.address, signer1.address);
        expect(borrowed.toString()).to.equal(dart);
    });

    xit('rewards', async function() {
        //deposit&borrow
        let dink = ether("2").toString();
        await amaticc.connect(signer1).approve(interaction.address, dink);
        await interaction.connect(signer1).deposit(signer1.address, amaticc.address, dink);
        let dart = ether("200").toString();
        await interaction.connect(signer1).borrow(signer1.address, amaticc.address, dart);

        let claimable = await rewards.claimable(amaticc.address, signer1.address);
        expect(claimable.toString()).to.equal("0");

        let borrowed = await interaction.connect(signer1).borrowed(amaticc.address, signer1.address);
        expect(borrowed.toString()).to.equal(dart);

        await network.provider.send("evm_increaseTime", [31536000]); // Jump 1 Day
        await network.provider.send("evm_increaseTime", [60]); // Jump 1 minute
        await network.provider.send("evm_mine");

        claimable = await rewards.claimable(amaticc.address, signer1.address);
        expect(claimable.toString()).to.equal("120000235026811392660");

        let totalPending = await rewards.pendingRewards(signer1.address);
        expect(totalPending.toString()).to.equal("120000235026811392660");

        await rewards.connect(signer1).claim(ether("60").toString());
        let ikkaBalance = await ikka.balanceOf(signer1.address);
        expect(ikkaBalance.toString()).to.equal(ether("60").toString());

        totalPending = await rewards.pendingRewards(signer1.address);
        expect(totalPending.toString()).to.equal("60000238943925136690");
    });
});
