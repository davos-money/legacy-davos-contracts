const { ethers, network } = require('hardhat');
const { expect } = require("chai");

describe('===IkkaRewards===', function () {
    let deployer, signer1, signer2;

    let wad = "000000000000000000", // 18 Decimals
        ray = "000000000000000000000000000", // 27 Decimals
        rad = "000000000000000000000000000000000000000000000"; // 45 Decimals

    let collateral = ethers.utils.formatBytes32String("TEST");

    const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

    beforeEach(async function () {

        [deployer, signer1, signer2] = await ethers.getSigners();

        // Contract factory
        this.IkkaRewards = await ethers.getContractFactory("IkkaRewards");
        this.IkkaToken = await ethers.getContractFactory("IkkaToken");
        this.Vat = await ethers.getContractFactory("Vat");
        this.IkkaOracle = await ethers.getContractFactory("IkkaOracle");

        this.Spot = await hre.ethers.getContractFactory("Spotter");
        this.Sikka = await hre.ethers.getContractFactory("Sikka");
        this.GemJoin = await hre.ethers.getContractFactory("GemJoin");
        this.SikkaJoin = await hre.ethers.getContractFactory("SikkaJoin");
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
        ikkarewards = await this.IkkaRewards.connect(deployer).deploy();
        await ikkarewards.deployed();
        ikkatoken = await this.IkkaToken.connect(deployer).deploy();
        await ikkatoken.deployed();
        vat = await this.Vat.connect(deployer).deploy();
        await vat.deployed();
        ikkaoracle = await this.IkkaOracle.connect(deployer).deploy();
        await ikkaoracle.deployed();

        await vat.initialize();
        spot = await this.Spot.connect(deployer).deploy();
        await spot.deployed(); await spot.initialize(vat.address);
        sikka = await this.Sikka.connect(deployer).deploy();
        await sikka.deployed(); await sikka.initialize(97, "SIKKA", "100" + wad);
        gem = await this.Sikka.connect(deployer).deploy();
        await gem.deployed(); await gem.initialize(97, "SIKKA", "100" + wad);
        gemJoin = await this.GemJoin.connect(deployer).deploy();
        await gemJoin.deployed(); await gemJoin.initialize(vat.address, collateral, gem.address);
        sikkaJoin = await this.SikkaJoin.connect(deployer).deploy();
        await sikkaJoin.deployed(); await sikkaJoin.initialize(vat.address, sikka.address);
        oracle = await this.Oracle.connect(deployer).deploy();
        await oracle.deployed(); await oracle.setPrice("1" + wad);
        jug = await this.Jug.connect(deployer).deploy();
        await jug.deployed(); await jug.initialize(vat.address);
        vow = await this.Vow.connect(deployer).deploy();
        await vow.deployed(); await vow.initialize(vat.address, sikkaJoin.address, deployer.address);
    });

    describe('--- initialize()', function () {
        it('initialize', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            expect(await ikkarewards.poolLimit()).to.be.equal("100" + wad);
        });
    });
    describe('--- rely()', function () {
        it('reverts: Rewards/not-authorized', async function () {
            await expect(ikkarewards.rely(signer1.address)).to.be.revertedWith("Rewards/not-authorized");
            expect(await ikkarewards.wards(signer1.address)).to.be.equal("0");
        });
        it('reverts: Rewards/not-live', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkarewards.cage();
            await expect(ikkarewards.rely(signer1.address)).to.be.revertedWith("Rewards/not-live");
        });
        it('relies on address', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkarewards.rely(signer1.address);
            expect(await ikkarewards.wards(signer1.address)).to.be.equal("1");
        });
    });
    describe('--- deny()', function () {
        it('reverts: Rewards/not-authorized', async function () {
            await expect(ikkarewards.deny(signer1.address)).to.be.revertedWith("Rewards/not-authorized");
        });
        it('reverts: Rewards/not-live', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkarewards.cage();
            await expect(ikkarewards.deny(NULL_ADDRESS)).to.be.revertedWith("Rewards/not-live");
        });
        it('denies an address', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkarewards.rely(signer1.address);
            expect(await ikkarewards.wards(signer1.address)).to.be.equal("1");
            await ikkarewards.deny(signer1.address);
            expect(await ikkarewards.wards(signer1.address)).to.be.equal("0");
        });
    });
    describe('--- cage()', function () {
        it('disables the live flag', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkarewards.cage();
            expect(await ikkarewards.live()).to.be.equal("0");
        });
    });
    describe('--- uncage()', function () {
        it('enables the live flag', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkarewards.cage();
            expect(await ikkarewards.live()).to.be.equal("0");

            await ikkarewards.uncage();
            expect(await ikkarewards.live()).to.be.equal("1");
        });
    });
    describe('--- initPool()', function () {
        it('reverts: Reward/not-enough-reward-token', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await expect(ikkarewards.initPool(gem.address, collateral, "1" + ray)).to.be.revertedWith("Reward/not-enough-reward-token");
        });
        it('reverts: Reward/pool-existed', async function () {
            await ikkarewards.initialize(vat.address, "40" + wad);
            await ikkatoken.initialize("100" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.initPool(gem.address, collateral, "1" + ray)

            await expect(ikkarewards.initPool(gem.address, collateral, "1" + ray)).to.be.revertedWith("Reward/pool-existed");
        });
        it('reverts: Reward/invalid-token', async function () {
            await ikkarewards.initialize(vat.address, "40" + wad);
            await ikkatoken.initialize("100" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await expect(ikkarewards.initPool(NULL_ADDRESS, collateral, "1" + ray)).to.be.revertedWith("Reward/invalid-token");
        });
        it('inits a pool', async function () {
            await ikkarewards.initialize(vat.address, "40" + wad);
            await ikkatoken.initialize("100" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.initPool(gem.address, collateral, "1" + ray);
            expect(await (await ikkarewards.pools(gem.address)).rewardRate).to.be.equal("1" + ray);
        });
    });
    describe('--- setIkkaToken()', function () {
        it('reverts: Reward/invalid-token', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await expect(ikkarewards.setIkkaToken(NULL_ADDRESS)).to.be.revertedWith("Reward/invalid-token");
        });
        it('sets ikka token address', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);

            expect(await ikkarewards.ikkaToken()).to.be.equal(ikkatoken.address);
        });
    });
    describe('--- setRewardsMaxLimit()', function () {
        it('reverts: Reward/not-enough-reward-token', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await expect(ikkarewards.setRewardsMaxLimit("110" + wad)).to.be.revertedWith("Reward/not-enough-reward-token");
        });
        it('sets rewards max limit', async function () {
            await ikkarewards.initialize(vat.address, "50" + wad);
            await ikkatoken.initialize("100" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.setRewardsMaxLimit("100" + wad);
            expect(await ikkarewards.poolLimit()).to.be.equal("100" + wad);
        });
    });
    describe('--- setOracle()', function () {
        it('reverts: Reward/invalid-oracle', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await expect(ikkarewards.setOracle(NULL_ADDRESS)).to.be.revertedWith("Reward/invalid-oracle");
        });
        it('sets oracle', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkaoracle.initialize("1" + wad);
            await ikkarewards.setOracle(ikkaoracle.address);
            expect(await ikkarewards.oracle()).to.be.equal(ikkaoracle.address);
        });
    });
    describe('--- setRate()', function () {
        it('reverts: Reward/pool-existed', async function () {
            await ikkarewards.initialize(vat.address, "50" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.initPool(gem.address, collateral, "1" + ray);
            await expect(ikkarewards.setRate(gem.address, "1" + ray)).to.be.revertedWith("Reward/pool-existed");
        });
        it('reverts: Reward/invalid-token', async function () {
            await ikkarewards.initialize(vat.address, "50" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.initPool(gem.address, collateral, "1" + ray);
            await expect(ikkarewards.setRate(NULL_ADDRESS, "1" + ray)).to.be.revertedWith("Reward/invalid-token");
        });
        it('reverts: Reward/negative-rate', async function () {
            await ikkarewards.initialize(vat.address, "50" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await expect(ikkarewards.setRate(gem.address, "1" + wad)).to.be.revertedWith("Reward/negative-rate");
        });
        it('reverts: Reward/high-rate', async function () {
            await ikkarewards.initialize(vat.address, "50" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await expect(ikkarewards.setRate(gem.address, "3" + ray)).to.be.revertedWith("Reward/high-rate");
        });
        it('sets rate', async function () {
            await ikkarewards.initialize(vat.address, "50" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.setRate(gem.address, "1" + ray);
            expect(await (await ikkarewards.pools(gem.address)).rewardRate).to.be.equal("1" + ray);
        });
    });
    describe('--- ikkaPrice()', function () {
        it('returns ikka price', async function () {
            await ikkarewards.initialize(vat.address, "50" + wad);
            await ikkarewards.setOracle(ikkaoracle.address);
            await ikkaoracle.initialize("2" + wad);
            expect(await ikkarewards.ikkaPrice()).to.be.equal("2" + wad);
        });
    });
    describe('--- rewardsRate()', function () {
        it('returns token  rate', async function () {
            await ikkarewards.initialize(vat.address, "40" + wad);
            await ikkatoken.initialize("100" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.initPool(gem.address, collateral, "1" + ray);
            expect(await ikkarewards.rewardsRate(gem.address)).to.be.equal("1" + ray);
        });
    });
    describe('--- drop()', function () {
        it('returns if rho is 0', async function () {
            await ikkarewards.initialize(vat.address, "40" + wad);
            await ikkatoken.initialize("100" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.drop(ikkatoken.address, deployer.address);
            expect(await (await ikkarewards.pools(ikkatoken.address)).rewardRate).to.be.equal("0");
        });
        it('drops rewards', async function () {
            const interaction = await upgrades.deployProxy(this.Interaction, [vat.address, spot.address, sikka.address, sikkaJoin.address, jug.address, NULL_ADDRESS, ikkarewards.address],
                {
                  initializer: "initialize",
                  unsafeAllowLinkedLibraries: true,
                }
              );
            await interaction.deployed();
    
            // Initialize Core
            await vat.rely(gemJoin.address);
            await vat.rely(spot.address);
            await vat.rely(sikkaJoin.address);
            await vat.rely(jug.address);
            await vat.rely(interaction.address);
            await vat["file(bytes32,uint256)"](ethers.utils.formatBytes32String("Line"), "5000000" + rad);
            await vat["file(bytes32,bytes32,uint256)"](collateral, ethers.utils.formatBytes32String("line"), "5000000" + rad);
            await vat["file(bytes32,bytes32,uint256)"](collateral, ethers.utils.formatBytes32String("dust"), "100" + ray);

            await sikka.rely(sikkaJoin.address);

            await spot.rely(interaction.address);
            await spot["file(bytes32,bytes32,address)"](collateral, ethers.utils.formatBytes32String("pip"), oracle.address);
            await spot["file(bytes32,uint256)"](ethers.utils.formatBytes32String("par"), "1" + ray); // Pegged to 1$

            await gemJoin.rely(interaction.address);

            await sikkaJoin.rely(interaction.address);
            await sikkaJoin.rely(vow.address);
    
            await jug.rely(interaction.address);
            // 1000000000315522921573372069 1% Borrow Rate
            // 1000000000627937192491029810 2% Borrow Rate
            // 1000000000937303470807876290 3% Borrow Rate
            // 1000000003022266000000000000 10% Borrow Rate
            await jug["file(bytes32,address)"](ethers.utils.formatBytes32String("vow"), vow.address);

            await vow["file(bytes32,address)"](ethers.utils.formatBytes32String("sikka"), sikka.address);
    
            // Initialize Interaction
            await interaction.setCollateralType(gem.address, gemJoin.address, collateral, NULL_ADDRESS, "1333333333333333333333333333", {gasLimit: 700000}); // 1.333.... <- 75% borrow ratio
            await interaction.poke(gem.address, {gasLimit: 200000});
            await interaction.drip(gem.address, {gasLimit: 200000});

            // Initialize IkkaRewards
            await ikkarewards.initialize(vat.address, "40" + wad);
            await ikkatoken.initialize("100" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.initPool(gem.address, collateral, "1000000000627937192491029810");
            await ikkaoracle.initialize("1" + wad);
            await ikkarewards.setOracle(ikkaoracle.address);
            await ikkarewards.rely(interaction.address);

            expect(await (await ikkarewards.piles(signer1.address, gem.address)).ts).to.be.equal("0");

            // Mint collateral to User, deposit and borrow from that user
            await gem.mint(signer1.address, "10" + wad);
            await gem.connect(signer1).approve(interaction.address, "10" + wad);
            await interaction.connect(signer1).deposit(signer1.address, gem.address, "10" + wad);
            await interaction.connect(signer1).borrow(gem.address, "5" + wad);

            expect(await (await ikkarewards.piles(signer1.address, gem.address)).ts).not.to.be.equal("0");
            expect(await (await ikkarewards.piles(signer1.address, gem.address)).amount).to.be.equal("0");

            tau = (await ethers.provider.getBlock()).timestamp;
            await network.provider.send("evm_setNextBlockTimestamp", [tau + 100]);
            await network.provider.send("evm_mine");

            await ikkarewards.drop(gem.address, signer1.address);

            expect(await (await ikkarewards.piles(signer1.address, gem.address)).amount).to.be.equal("317108292164");
        });
    });
    describe('--- distributionApy()', function () {
        it('returns token APY', async function () {
            await ikkarewards.initialize(vat.address, "40" + wad);
            await ikkatoken.initialize("100" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.initPool(gem.address, collateral, "1" + ray);
            expect(await ikkarewards.distributionApy(gem.address)).to.be.equal("0");
        });
    });
});