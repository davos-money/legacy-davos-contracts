const { ethers, network } = require('hardhat');
const { expect } = require("chai");

describe('===Spot===', function () {
    let deployer, signer1, signer2;

    let wad = "000000000000000000", // 18 Decimals
        ray = "000000000000000000000000000", // 27 Decimals
        rad = "000000000000000000000000000000000000000000000"; // 45 Decimals

    let collateral = ethers.utils.formatBytes32String("TEST");

    const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

    beforeEach(async function () {

        [deployer, signer1, signer2] = await ethers.getSigners();

        // Contract factory
        this.Davos = await ethers.getContractFactory("Davos");

        // Contract deployment
        davos = await this.Davos.connect(deployer).deploy();
        await davos.deployed();
    });

    describe('--- initialize()', function () {
        it('initialize', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            expect(await davos.symbol()).to.be.equal("DAVOS");
        });
    });
    describe('--- rely()', function () {
        it('reverts: Davos/not-authorized', async function () {
            await expect(davos.rely(signer1.address)).to.be.revertedWith("Davos/not-authorized");
            expect(await davos.wards(signer1.address)).to.be.equal("0");
        });
        it('relies on address', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.rely(signer1.address);
            expect(await davos.wards(signer1.address)).to.be.equal("1");
        });
    });
    describe('--- deny()', function () {
        it('reverts: Davos/not-authorized', async function () {
            await expect(davos.deny(signer1.address)).to.be.revertedWith("Davos/not-authorized");
        });
        it('denies an address', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.rely(signer1.address);
            expect(await davos.wards(signer1.address)).to.be.equal("1");
            await davos.deny(signer1.address);
            expect(await davos.wards(signer1.address)).to.be.equal("0");
        });
    });
    describe('--- mint()', function () {
        it('reverts: Davos/mint-to-zero-address', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await expect(davos.mint(NULL_ADDRESS, "1" + wad)).to.be.revertedWith("Davos/mint-to-zero-address");
        });
        it('reverts: Davos/cap-reached', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await expect(davos.mint(deployer.address, "101" + wad)).to.be.revertedWith("Davos/cap-reached");
        });
        it('mints davos to an address', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.mint(deployer.address, "1" + wad);
            expect(await davos.balanceOf(deployer.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- burn()', function () {
        it('reverts: Davos/burn-from-zero-address', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await expect(davos.burn(NULL_ADDRESS, "1" + wad)).to.be.revertedWith("Davos/burn-from-zero-address");
        });
        it('reverts: Davos/insufficient-balance', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await expect(davos.burn(deployer.address, "1" + wad)).to.be.revertedWith("Davos/insufficient-balance");
        });
        it('reverts: Davos/insufficient-allowance', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.mint(signer1.address, "1" + wad);
            await expect(davos.burn(signer1.address, "1" + wad)).to.be.revertedWith("Davos/insufficient-allowance");
        });
        it('burns with allowance', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.mint(signer1.address, "1" + wad);
            await davos.connect(signer1).approve(deployer.address, "1" + wad);
            await davos.burn(signer1.address, "1" + wad);
            expect(await davos.balanceOf(signer1.address)).to.be.equal(0);
        });
        it('burns from address', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.mint(signer1.address, "1" + wad);
            await davos.connect(signer1).burn(signer1.address, "1" + wad);
            expect(await davos.balanceOf(signer1.address)).to.be.equal(0);
        });
    });
    describe('--- transferFrom()', function () {
        it('reverts: Davos/transfer-from-zero-address', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await expect(davos.transferFrom(NULL_ADDRESS, deployer.address, "1" + wad)).to.be.revertedWith("Davos/transfer-from-zero-address");
        });
        it('reverts: Davos/transfer-to-zero-address', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await expect(davos.transferFrom(deployer.address, NULL_ADDRESS, "1" + wad)).to.be.revertedWith("Davos/transfer-to-zero-address");
        });
        it('reverts: Davos/insufficient-balance', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await expect(davos.transferFrom(deployer.address, signer1.address, "1" + wad)).to.be.revertedWith("Davos/insufficient-balance");
        });
        it('reverts: Davos/insufficient-allowance', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.mint(deployer.address, "1" + wad);
            await expect(davos.connect(signer1).transferFrom(deployer.address, signer1.address, "1" + wad)).to.be.revertedWith("Davos/insufficient-allowance");
        });
        it('transferFrom with allowance', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.mint(deployer.address, "1" + wad);
            await davos.approve(signer1.address, "1" + wad);
            await davos.connect(signer1).transferFrom(deployer.address, signer1.address, "1" + wad);
            expect(await davos.balanceOf(signer1.address)).to.be.equal("1" + wad);
        });
        it('transferFrom an address', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.mint(deployer.address, "1" + wad);
            await davos.connect(deployer).transferFrom(deployer.address, signer1.address, "1" + wad);
            expect(await davos.balanceOf(signer1.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- transfer()', function () {
        it('transfers to an address', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.mint(deployer.address, "1" + wad);
            await davos.transfer(signer1.address, "1" + wad);
            expect(await davos.balanceOf(signer1.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- push()', function () {
        it('pushes to an address', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.mint(deployer.address, "1" + wad);
            await davos.push(signer1.address, "1" + wad);
            expect(await davos.balanceOf(signer1.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- pull()', function () {
        it('pulls from an address', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.mint(signer1.address, "1" + wad);
            await davos.connect(signer1).approve(deployer.address, "1" + wad);
            await davos.pull(signer1.address, "1" + wad);
            expect(await davos.balanceOf(deployer.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- move()', function () {
        it('move between addresses', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.mint(deployer.address, "1" + wad);
            await davos.move(deployer.address, signer1.address, "1" + wad);
            expect(await davos.balanceOf(signer1.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- increaseAllowance()', function () {
        it('increases allowance', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.increaseAllowance(signer1.address, "1" + wad);
            expect(await davos.allowance(deployer.address, signer1.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- decreaseAllowance()', function () {
        it('reverts: Davos/decreased-allowance-below-zero', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.increaseAllowance(signer1.address, "1" + wad);
            await expect(davos.decreaseAllowance(signer1.address, "2" + wad)).to.be.revertedWith("Davos/decreased-allowance-below-zero");
        });
        it('decreases allowance', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.increaseAllowance(signer1.address, "1" + wad);
            await davos.decreaseAllowance(signer1.address, "1" + wad);
            expect(await davos.allowance(deployer.address, signer1.address)).to.be.equal("0");
        });
    });
    describe('--- setSupplyCap()', function () {
        it('reverts: Davos/more-supply-than-cap', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.mint(deployer.address, "1" + wad);
            await expect(davos.setSupplyCap("0")).to.be.revertedWith("Davos/more-supply-than-cap");
        });
        it('sets the cap', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.setSupplyCap("5" + wad);
            expect(await davos.supplyCap()).to.be.equal("5" + wad);
        });
    });
    describe('--- updateDomainSeparator()', function () {
        it('sets domain separator', async function () {
            await davos.initialize(97, "DAVOS", "100" + wad);
            await davos.updateDomainSeparator(1);
            let DS1 = await davos.DOMAIN_SEPARATOR;
            let DS2 =await davos.updateDomainSeparator(2);
            expect(DS1).to.not.be.equal(DS2);
        });
    });
});