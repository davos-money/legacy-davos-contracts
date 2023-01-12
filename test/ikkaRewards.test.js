const { ethers, network } = require('hardhat');
const { expect } = require("chai");

describe('===DgtRewards===', function () {
    let deployer, signer1, signer2;

    let wad = "000000000000000000", // 18 Decimals
        ray = "000000000000000000000000000", // 27 Decimals
        rad = "000000000000000000000000000000000000000000000"; // 45 Decimals

    let collateral = ethers.utils.formatBytes32String("TEST");
    let maxPools = 5;

    const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

    beforeEach(async function () {

        [deployer, signer1, signer2] = await ethers.getSigners();

        // Contract factory
        this.DgtRewards = await ethers.getContractFactory("DgtRewards");
        this.DgtToken = await ethers.getContractFactory("DgtToken");
        this.Vat = await ethers.getContractFactory("Vat");
        this.DgtOracle = await ethers.getContractFactory("DgtOracle");

        this.Spot = await hre.ethers.getContractFactory("Spotter");
        this.Davos = await hre.ethers.getContractFactory("Davos");
        this.GemJoin = await hre.ethers.getContractFactory("GemJoin");
        this.DavosJoin = await hre.ethers.getContractFactory("DavosJoin");
        this.Oracle = await hre.ethers.getContractFactory("Oracle");
        this.Jug = await hre.ethers.getContractFactory("Jug");
        this.Vow = await hre.ethers.getContractFactory("Vow");

        this.AuctionProxy = await hre.ethers.getContractFactory("AuctionProxy");

        const auctionProxy = await this.AuctionProxy.deploy();
        await auctionProxy.deployed();
        this.Interaction = await hre.ethers.getContractFactory("Interaction", {
            unsafeAllow: ["external-library-linking"],
            libraries: {
            AuctionProxy: auctionProxy.address,
            },
        });

        // Contract deployment
        dgtrewards = await this.DgtRewards.connect(deployer).deploy();
        await dgtrewards.deployed();
        dgttoken = await this.DgtToken.connect(deployer).deploy();
        await dgttoken.deployed();
        vat = await this.Vat.connect(deployer).deploy();
        await vat.deployed();
        dgtoracle = await this.DgtOracle.connect(deployer).deploy();
        await dgtoracle.deployed();

        await vat.initialize();
        spot = await this.Spot.connect(deployer).deploy();
        await spot.deployed(); await spot.initialize(vat.address);
        davos = await this.Davos.connect(deployer).deploy();
        await davos.deployed(); await davos.initialize(97, "DAVOS", "100" + wad);
        gem = await this.Davos.connect(deployer).deploy();
        await gem.deployed(); await gem.initialize(97, "DAVOS", "100" + wad);
        gemJoin = await this.GemJoin.connect(deployer).deploy();
        await gemJoin.deployed(); await gemJoin.initialize(vat.address, collateral, gem.address);
        davosJoin = await this.DavosJoin.connect(deployer).deploy();
        await davosJoin.deployed(); await davosJoin.initialize(vat.address, davos.address);
        oracle = await this.Oracle.connect(deployer).deploy();
        await oracle.deployed(); await oracle.setPrice("1" + wad);
        jug = await this.Jug.connect(deployer).deploy();
        await jug.deployed(); await jug.initialize(vat.address);
        vow = await this.Vow.connect(deployer).deploy();
        await vow.deployed(); await vow.initialize(vat.address, davosJoin.address, deployer.address);
    });

    describe('--- initialize()', function () {
        it('initialize', async function () {
            await dgtrewards.initialize(vat.address, "100" + wad, maxPools);
            expect(await dgtrewards.poolLimit()).to.be.equal("100" + wad);
        });
    });
    describe('--- rely()', function () {
        it('reverts: Rewards/not-authorized', async function () {
            await expect(dgtrewards.rely(signer1.address)).to.be.revertedWith("Rewards/not-authorized");
            expect(await dgtrewards.wards(signer1.address)).to.be.equal("0");
        });
        it('reverts: Rewards/not-live', async function () {
            await dgtrewards.initialize(vat.address, "100" + wad, maxPools);
            await dgtrewards.cage();
            await expect(dgtrewards.rely(signer1.address)).to.be.revertedWith("Rewards/not-live");
        });
        it('relies on address', async function () {
            await dgtrewards.initialize(vat.address, "100" + wad, maxPools);
            await dgtrewards.rely(signer1.address);
            expect(await dgtrewards.wards(signer1.address)).to.be.equal("1");
        });
    });
    describe('--- deny()', function () {
        it('reverts: Rewards/not-authorized', async function () {
            await expect(dgtrewards.deny(signer1.address)).to.be.revertedWith("Rewards/not-authorized");
        });
        it('reverts: Rewards/not-live', async function () {
            await dgtrewards.initialize(vat.address, "100" + wad, maxPools);
            await dgtrewards.cage();
            await expect(dgtrewards.deny(NULL_ADDRESS)).to.be.revertedWith("Rewards/not-live");
        });
        it('denies an address', async function () {
            await dgtrewards.initialize(vat.address, "100" + wad, maxPools);
            await dgtrewards.rely(signer1.address);
            expect(await dgtrewards.wards(signer1.address)).to.be.equal("1");
            await dgtrewards.deny(signer1.address);
            expect(await dgtrewards.wards(signer1.address)).to.be.equal("0");
        });
    });
    describe('--- cage()', function () {
        it('disables the live flag', async function () {
            await dgtrewards.initialize(vat.address, "100" + wad, maxPools);
            await dgtrewards.cage();
            expect(await dgtrewards.live()).to.be.equal("0");
        });
    });
    describe('--- uncage()', function () {
        it('enables the live flag', async function () {
            await dgtrewards.initialize(vat.address, "100" + wad, maxPools);
            await dgtrewards.cage();
            expect(await dgtrewards.live()).to.be.equal("0");

            await dgtrewards.uncage();
            expect(await dgtrewards.live()).to.be.equal("1");
        });
    });
    describe('--- initPool()', function () {
        it('reverts: Reward/not-enough-reward-token', async function () {
            await dgtrewards.initialize(vat.address, "100" + wad, maxPools);
            await dgttoken.initialize("90" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await expect(dgtrewards.initPool(gem.address, collateral, "1" + ray)).to.be.revertedWith("Reward/not-enough-reward-token");
        });
        it('reverts: Reward/pool-existed', async function () {
            await dgtrewards.initialize(vat.address, "40" + wad, maxPools);
            await dgttoken.initialize("100" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await dgtrewards.initPool(gem.address, collateral, "1" + ray)

            await expect(dgtrewards.initPool(gem.address, collateral, "1" + ray)).to.be.revertedWith("Reward/pool-existed");
        });
        it('reverts: Reward/invalid-token', async function () {
            await dgtrewards.initialize(vat.address, "40" + wad, maxPools);
            await dgttoken.initialize("100" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await expect(dgtrewards.initPool(NULL_ADDRESS, collateral, "1" + ray)).to.be.revertedWith("Reward/invalid-token");
        });
        it('inits a pool', async function () {
            await dgtrewards.initialize(vat.address, "40" + wad, maxPools);
            await dgttoken.initialize("100" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await dgtrewards.initPool(gem.address, collateral, "1" + ray);
            expect(await (await dgtrewards.pools(gem.address)).rewardRate).to.be.equal("1" + ray);
        });
    });
    describe('--- setDgtToken()', function () {
        it('reverts: Reward/invalid-token', async function () {
            await dgtrewards.initialize(vat.address, "100" + wad, maxPools);
            await dgttoken.initialize("90" + wad, dgtrewards.address);
            await expect(dgtrewards.setDgtToken(NULL_ADDRESS)).to.be.revertedWith("Reward/invalid-token");
        });
        it('sets dgt token address', async function () {
            await dgtrewards.initialize(vat.address, "100" + wad, maxPools);
            await dgttoken.initialize("90" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);

            expect(await dgtrewards.dgtToken()).to.be.equal(dgttoken.address);
        });
    });
    describe('--- setRewardsMaxLimit()', function () {
        it('reverts: Reward/not-enough-reward-token', async function () {
            await dgtrewards.initialize(vat.address, "100" + wad, maxPools);
            await dgttoken.initialize("90" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await expect(dgtrewards.setRewardsMaxLimit("110" + wad)).to.be.revertedWith("Reward/not-enough-reward-token");
        });
        it('sets rewards max limit', async function () {
            await dgtrewards.initialize(vat.address, "50" + wad, maxPools);
            await dgttoken.initialize("100" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await dgtrewards.setRewardsMaxLimit("100" + wad);
            expect(await dgtrewards.poolLimit()).to.be.equal("100" + wad);
        });
    });
    describe('--- setOracle()', function () {
        it('reverts: Reward/invalid-oracle', async function () {
            await dgtrewards.initialize(vat.address, "100" + wad, maxPools);
            await dgttoken.initialize("90" + wad, dgtrewards.address);
            await expect(dgtrewards.setOracle(NULL_ADDRESS)).to.be.revertedWith("Reward/invalid-oracle");
        });
        it('sets oracle', async function () {
            await dgtrewards.initialize(vat.address, "100" + wad, maxPools);
            await dgttoken.initialize("90" + wad, dgtrewards.address);
            await dgtoracle.initialize("1" + wad);
            await dgtrewards.setOracle(dgtoracle.address);
            expect(await dgtrewards.oracle()).to.be.equal(dgtoracle.address);
        });
    });
    describe('--- setRate()', function () {
        it('reverts: Reward/pool-existed', async function () {
            await dgtrewards.initialize(vat.address, "50" + wad, maxPools);
            await dgttoken.initialize("90" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await dgtrewards.initPool(gem.address, collateral, "1" + ray);
            await expect(dgtrewards.setRate(gem.address, "1" + ray)).to.be.revertedWith("Reward/pool-existed");
        });
        it('reverts: Reward/invalid-token', async function () {
            await dgtrewards.initialize(vat.address, "50" + wad, maxPools);
            await dgttoken.initialize("90" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await dgtrewards.initPool(gem.address, collateral, "1" + ray);
            await expect(dgtrewards.setRate(NULL_ADDRESS, "1" + ray)).to.be.revertedWith("Reward/invalid-token");
        });
        it('reverts: Reward/negative-rate', async function () {
            await dgtrewards.initialize(vat.address, "50" + wad, maxPools);
            await dgttoken.initialize("90" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await expect(dgtrewards.setRate(gem.address, "1" + wad)).to.be.revertedWith("Reward/negative-rate");
        });
        it('reverts: Reward/high-rate', async function () {
            await dgtrewards.initialize(vat.address, "50" + wad, maxPools);
            await dgttoken.initialize("90" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await expect(dgtrewards.setRate(gem.address, "3" + ray)).to.be.revertedWith("Reward/high-rate");
        });
        it('sets rate', async function () {
            await dgtrewards.initialize(vat.address, "50" + wad, maxPools);
            await dgttoken.initialize("90" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await dgtrewards.setRate(gem.address, "1" + ray);
            expect(await (await dgtrewards.pools(gem.address)).rewardRate).to.be.equal("1" + ray);
        });
    });
    describe('--- dgtPrice()', function () {
        it('returns dgt price', async function () {
            await dgtrewards.initialize(vat.address, "50" + wad, maxPools);
            await dgtrewards.setOracle(dgtoracle.address);
            await dgtoracle.initialize("2" + wad);
            expect(await dgtrewards.dgtPrice()).to.be.equal("2" + wad);
        });
    });
    describe('--- rewardsRate()', function () {
        it('returns token  rate', async function () {
            await dgtrewards.initialize(vat.address, "40" + wad, maxPools);
            await dgttoken.initialize("100" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await dgtrewards.initPool(gem.address, collateral, "1" + ray);
            expect(await dgtrewards.rewardsRate(gem.address)).to.be.equal("1" + ray);
        });
    });
    describe('--- drop()', function () {
        it('returns if rho is 0', async function () {
            await dgtrewards.initialize(vat.address, "40" + wad, maxPools);
            await dgttoken.initialize("100" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await dgtrewards.drop(dgttoken.address, deployer.address);
            expect(await (await dgtrewards.pools(dgttoken.address)).rewardRate).to.be.equal("0");
        });
        it('drops rewards', async function () {
            const interaction = await upgrades.deployProxy(this.Interaction, [vat.address, spot.address, davos.address, davosJoin.address, jug.address, NULL_ADDRESS, dgtrewards.address],
                {
                  initializer: "initialize",
                  unsafeAllowLinkedLibraries: true,
                }
              );
            await interaction.deployed();
    
            // Initialize Core
            await vat.rely(gemJoin.address);
            await vat.rely(spot.address);
            await vat.rely(davosJoin.address);
            await vat.rely(jug.address);
            await vat.rely(interaction.address);
            await vat["file(bytes32,uint256)"](ethers.utils.formatBytes32String("Line"), "5000000" + rad);
            await vat["file(bytes32,bytes32,uint256)"](collateral, ethers.utils.formatBytes32String("line"), "5000000" + rad);
            await vat["file(bytes32,bytes32,uint256)"](collateral, ethers.utils.formatBytes32String("dust"), "100" + ray);

            await davos.rely(davosJoin.address);

            await spot.rely(interaction.address);
            await spot["file(bytes32,bytes32,address)"](collateral, ethers.utils.formatBytes32String("pip"), oracle.address);
            await spot["file(bytes32,uint256)"](ethers.utils.formatBytes32String("par"), "1" + ray); // Pegged to 1$

            await gemJoin.rely(interaction.address);

            await davosJoin.rely(interaction.address);
            await davosJoin.rely(vow.address);
    
            await jug.rely(interaction.address);
            // 1000000000315522921573372069 1% Borrow Rate
            // 1000000000627937192491029810 2% Borrow Rate
            // 1000000000937303470807876290 3% Borrow Rate
            // 1000000003022266000000000000 10% Borrow Rate
            await jug["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address);

            await vow["file(bytes32,address)"](ethers.utils.formatBytes32String("davos"), davos.address);
    
            // Initialize Interaction
            await interaction.setCollateralType(gem.address, gemJoin.address, collateral, NULL_ADDRESS, "1333333333333333333333333333", {gasLimit: 700000}); // 1.333.... <- 75% borrow ratio
            await interaction.poke(gem.address, {gasLimit: 200000});
            await interaction.drip(gem.address, {gasLimit: 200000});

            // Initialize DgtRewards
            await dgtrewards.initialize(vat.address, "40" + wad, maxPools);
            await dgttoken.initialize("100" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await dgtrewards.initPool(gem.address, collateral, "1000000000627937192491029810");
            await dgtoracle.initialize("1" + wad);
            await dgtrewards.setOracle(dgtoracle.address);
            await dgtrewards.rely(interaction.address);

            expect(await (await dgtrewards.piles(signer1.address, gem.address)).ts).to.be.equal("0");

            // Mint collateral to User, deposit and borrow from that user
            await gem.mint(signer1.address, "10" + wad);
            await gem.connect(signer1).approve(interaction.address, "10" + wad);
            await interaction.connect(signer1).deposit(signer1.address, gem.address, "10" + wad);
            await interaction.connect(signer1).borrow(gem.address, "5" + wad);

            expect(await (await dgtrewards.piles(signer1.address, gem.address)).ts).not.to.be.equal("0");
            expect(await (await dgtrewards.piles(signer1.address, gem.address)).amount).to.be.equal("0");

            tau = (await ethers.provider.getBlock()).timestamp;
            await network.provider.send("evm_setNextBlockTimestamp", [tau + 100]);
            await network.provider.send("evm_mine");

            await dgtrewards.drop(gem.address, signer1.address);

            expect(await (await dgtrewards.piles(signer1.address, gem.address)).amount).to.be.equal("317108292164");
        });
    });
    describe('--- distributionApy()', function () {
        it('returns token APY', async function () {
            await dgtrewards.initialize(vat.address, "40" + wad, maxPools);
            await dgttoken.initialize("100" + wad, dgtrewards.address);
            await dgtrewards.setDgtToken(dgttoken.address);
            await dgtrewards.initPool(gem.address, collateral, "1" + ray);
            expect(await dgtrewards.distributionApy(gem.address)).to.be.equal("0");
        });
    });
});