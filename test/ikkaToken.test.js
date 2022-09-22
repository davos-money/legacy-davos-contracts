const { ethers, network } = require('hardhat');
const { expect } = require("chai");

describe('===IkkaToken===', function () {
    let deployer, signer1, signer2;

    let wad = "000000000000000000", // 18 Decimals
        ray = "000000000000000000000000000", // 27 Decimals
        rad = "000000000000000000000000000000000000000000000"; // 45 Decimals

    let collateral = ethers.utils.formatBytes32String("TEST");

    const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

    beforeEach(async function () {

        [deployer, signer1, signer2] = await ethers.getSigners();

        // Contract factory
        this.IkkaToken = await ethers.getContractFactory("IkkaToken");

        // Contract deployment
        ikkatoken = await this.IkkaToken.connect(deployer).deploy();
        await ikkatoken.deployed();
    });

    describe('--- initialize()', function () {
        it('initialize', async function () {
            await ikkatoken.initialize("100" + wad, deployer.address);
            expect(await ikkatoken.symbol()).to.be.equal("IKKA");
        });
    });
    describe('--- rely()', function () {
        it('reverts: IkkaToken/not-authorized', async function () {
            await expect(ikkatoken.rely(signer1.address)).to.be.revertedWith("IkkaToken/not-authorized");
            expect(await ikkatoken.wards(signer1.address)).to.be.equal("0");
        });
        it('reverts: IkkaToken/invalid-address', async function () {
            await ikkatoken.initialize("100" + wad, deployer.address);
            await expect(ikkatoken.rely(NULL_ADDRESS)).to.be.revertedWith("IkkaToken/invalid-address");
        });
        it('relies on address', async function () {
            await ikkatoken.initialize("100" + wad, deployer.address);
            await ikkatoken.rely(signer1.address);
            expect(await ikkatoken.wards(signer1.address)).to.be.equal("1");
        });
    });
    describe('--- deny()', function () {
        it('reverts: IkkaToken/not-authorized', async function () {
            await expect(ikkatoken.deny(signer1.address)).to.be.revertedWith("IkkaToken/not-authorized");
        });
        it('reverts: IkkaToken/invalid-address', async function () {
            await ikkatoken.initialize("100" + wad, deployer.address);
            await expect(ikkatoken.deny(NULL_ADDRESS)).to.be.revertedWith("IkkaToken/invalid-address");
        });
        it('denies an address', async function () {
            await ikkatoken.initialize("100" + wad, deployer.address);
            await ikkatoken.rely(signer1.address);
            expect(await ikkatoken.wards(signer1.address)).to.be.equal("1");
            await ikkatoken.deny(signer1.address);
            expect(await ikkatoken.wards(signer1.address)).to.be.equal("0");
        });
    });
    describe('--- mint()', function () {
        it('reverts: IkkaToken/rewards-oversupply', async function () {
            await ikkatoken.initialize("100" + wad, deployer.address);
            await expect(ikkatoken.mint(deployer.address, "1000" + wad)).to.be.revertedWith("IkkaToken/rewards-oversupply");
        });
        it('mints sikka to an address', async function () {
            await ikkatoken.initialize("100" + wad, deployer.address);
            await ikkatoken.mint(signer1.address, "1" + wad);
            expect(await ikkatoken.balanceOf(signer1.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- burn()', function () {
        it('burns from address', async function () {
            await ikkatoken.initialize("100" + wad, deployer.address);
            await ikkatoken.mint(signer1.address, "1" + wad);
            await ikkatoken.connect(signer1).burn("1" + wad);
            expect(await ikkatoken.balanceOf(signer1.address)).to.be.equal(0);
        });
    });
    describe('--- pause()', function () {
        it('pauses transfers', async function () {
            await ikkatoken.initialize("100" + wad, deployer.address);
            await ikkatoken.pause();
            expect(await ikkatoken.paused()).to.be.equal(true);
        });
    });
    describe('--- unpause()', function () {
        it('unpauses transfers', async function () {
            await ikkatoken.initialize("100" + wad, deployer.address);
            await ikkatoken.pause();
            expect(await ikkatoken.paused()).to.be.equal(true);

            await ikkatoken.unpause();
            expect(await ikkatoken.paused()).to.be.equal(false);
        });
    });
});