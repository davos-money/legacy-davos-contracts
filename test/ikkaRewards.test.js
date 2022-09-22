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

        // Contract deployment
        ikkarewards = await this.IkkaRewards.connect(deployer).deploy();
        await ikkarewards.deployed();
        ikkatoken = await this.IkkaToken.connect(deployer).deploy();
        await ikkatoken.deployed();
        vat = await this.Vat.connect(deployer).deploy();
        await vat.deployed();
        ikkaoracle = await this.IkkaOracle.connect(deployer).deploy();
        await ikkaoracle.deployed();
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
            await ikkarewards.stop();
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
            await ikkarewards.stop();
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
    describe('--- stop()', function () {
        it('disables the live flag', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkarewards.stop();
            expect(await ikkarewards.live()).to.be.equal("0");
        });
    });
    describe('--- start()', function () {
        it('enables the live flag', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkarewards.stop();
            expect(await ikkarewards.live()).to.be.equal("0");

            await ikkarewards.start();
            expect(await ikkarewards.live()).to.be.equal("1");
        });
    });
    describe('--- initPool()', function () {
        it('reverts: Reward/not-enough-reward-token', async function () {
            await ikkarewards.initialize(vat.address, "100" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await expect(ikkarewards.initPool(ikkatoken.address, collateral, "1" + ray)).to.be.revertedWith("Reward/not-enough-reward-token");
        });
        it('reverts: Reward/pool-existed', async function () {
            await ikkarewards.initialize(vat.address, "40" + wad);
            await ikkatoken.initialize("100" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.initPool(ikkatoken.address, collateral, "1" + ray)

            await expect(ikkarewards.initPool(ikkatoken.address, collateral, "1" + ray)).to.be.revertedWith("Reward/pool-existed");
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
            await ikkarewards.initPool(ikkatoken.address, collateral, "1" + ray);
            expect(await (await ikkarewards.pools(ikkatoken.address)).rewardRate).to.be.equal("1" + ray);
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
            await ikkarewards.initPool(ikkatoken.address, collateral, "1" + ray);
            await expect(ikkarewards.setRate(ikkatoken.address, "1" + ray)).to.be.revertedWith("Reward/pool-existed");
        });
        it('reverts: Reward/invalid-token', async function () {
            await ikkarewards.initialize(vat.address, "50" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.initPool(ikkatoken.address, collateral, "1" + ray);
            await expect(ikkarewards.setRate(NULL_ADDRESS, "1" + ray)).to.be.revertedWith("Reward/invalid-token");
        });
        it('reverts: Reward/negative-rate', async function () {
            await ikkarewards.initialize(vat.address, "50" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await expect(ikkarewards.setRate(ikkatoken.address, "1" + wad)).to.be.revertedWith("Reward/negative-rate");
        });
        it('reverts: Reward/high-rate', async function () {
            await ikkarewards.initialize(vat.address, "50" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await expect(ikkarewards.setRate(ikkatoken.address, "3" + ray)).to.be.revertedWith("Reward/high-rate");
        });
        it('sets rate', async function () {
            await ikkarewards.initialize(vat.address, "50" + wad);
            await ikkatoken.initialize("90" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.setRate(ikkatoken.address, "1" + ray);
            expect(await (await ikkarewards.pools(ikkatoken.address)).rewardRate).to.be.equal("1" + ray);
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
            await ikkarewards.initPool(ikkatoken.address, collateral, "1" + ray);
            expect(await ikkarewards.rewardsRate(ikkatoken.address)).to.be.equal("1" + ray);
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
            await vat.initialize();
            await vat.init(collateral);

            await vat.connect(deployer)["file(bytes32,uint256)"](await ethers.utils.formatBytes32String("Line"), "200" + rad);
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("line"), "200" + rad);  
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("dust"), "10" + rad);              
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("spot"), "100" + ray);

            await vat.slip(collateral, deployer.address, "1" + wad);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, deployer.address, "1" + wad, 0);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, deployer.address, 0, "15" + wad);

            await ikkarewards.initialize(vat.address, "40" + wad);
            await ikkatoken.initialize("100" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.initPool(ikkatoken.address, collateral, "1000000001847694957439350500");
            await ikkaoracle.initialize("1" + wad);
            await ikkarewards.setOracle(ikkaoracle.address);

            expect(await (await ikkarewards.piles(deployer.address, ikkatoken.address)).amount).to.be.equal("0");

            await ikkarewards.drop(ikkatoken.address, deployer.address);

            tau = (await ethers.provider.getBlock()).timestamp;
            await network.provider.send("evm_setNextBlockTimestamp", [tau + 100]);
            await network.provider.send("evm_mine");
            await ikkarewards.drop(ikkatoken.address, deployer.address);
            expect(await (await ikkarewards.piles(deployer.address, ikkatoken.address)).amount).to.be.equal("2799258119129");

            await ikkarewards.claim("2799258119129");
        });
    });
    describe('--- distributionApy()', function () {
        it('returns token APY', async function () {
            await ikkarewards.initialize(vat.address, "40" + wad);
            await ikkatoken.initialize("100" + wad, ikkarewards.address);
            await ikkarewards.setIkkaToken(ikkatoken.address);
            await ikkarewards.initPool(ikkatoken.address, collateral, "1" + ray);
            expect(await ikkarewards.distributionApy(ikkatoken.address)).to.be.equal("0");
        });
    });
});