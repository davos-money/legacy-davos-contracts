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
        this.Sikka = await ethers.getContractFactory("Sikka");

        // Contract deployment
        sikka = await this.Sikka.connect(deployer).deploy();
        await sikka.deployed();
    });

    describe('--- initialize()', function () {
        it('initialize', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            expect(await sikka.symbol()).to.be.equal("SIKKA");
        });
    });
    describe('--- rely()', function () {
        it('reverts: Sikka/not-authorized', async function () {
            await expect(sikka.rely(signer1.address)).to.be.revertedWith("Sikka/not-authorized");
            expect(await sikka.wards(signer1.address)).to.be.equal("0");
        });
        it('relies on address', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.rely(signer1.address);
            expect(await sikka.wards(signer1.address)).to.be.equal("1");
        });
    });
    describe('--- deny()', function () {
        it('reverts: Sikka/not-authorized', async function () {
            await expect(sikka.deny(signer1.address)).to.be.revertedWith("Sikka/not-authorized");
        });
        it('denies an address', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.rely(signer1.address);
            expect(await sikka.wards(signer1.address)).to.be.equal("1");
            await sikka.deny(signer1.address);
            expect(await sikka.wards(signer1.address)).to.be.equal("0");
        });
    });
    describe('--- mint()', function () {
        it('reverts: Sikka/mint-to-zero-address', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await expect(sikka.mint(NULL_ADDRESS, "1" + wad)).to.be.revertedWith("Sikka/mint-to-zero-address");
        });
        it('reverts: Sikka/cap-reached', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await expect(sikka.mint(deployer.address, "101" + wad)).to.be.revertedWith("Sikka/cap-reached");
        });
        it('mints sikka to an address', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.mint(deployer.address, "1" + wad);
            expect(await sikka.balanceOf(deployer.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- burn()', function () {
        it('reverts: Sikka/burn-from-zero-address', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await expect(sikka.burn(NULL_ADDRESS, "1" + wad)).to.be.revertedWith("Sikka/burn-from-zero-address");
        });
        it('reverts: Sikka/insufficient-balance', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await expect(sikka.burn(deployer.address, "1" + wad)).to.be.revertedWith("Sikka/insufficient-balance");
        });
        it('reverts: Sikka/insufficient-allowance', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.mint(signer1.address, "1" + wad);
            await expect(sikka.burn(signer1.address, "1" + wad)).to.be.revertedWith("Sikka/insufficient-allowance");
        });
        it('burns with allowance', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.mint(signer1.address, "1" + wad);
            await sikka.connect(signer1).approve(deployer.address, "1" + wad);
            await sikka.burn(signer1.address, "1" + wad);
            expect(await sikka.balanceOf(signer1.address)).to.be.equal(0);
        });
        it('burns from address', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.mint(signer1.address, "1" + wad);
            await sikka.connect(signer1).burn(signer1.address, "1" + wad);
            expect(await sikka.balanceOf(signer1.address)).to.be.equal(0);
        });
    });
    describe('--- transferFrom()', function () {
        it('reverts: Sikka/transfer-from-zero-address', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await expect(sikka.transferFrom(NULL_ADDRESS, deployer.address, "1" + wad)).to.be.revertedWith("Sikka/transfer-from-zero-address");
        });
        it('reverts: Sikka/transfer-to-zero-address', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await expect(sikka.transferFrom(deployer.address, NULL_ADDRESS, "1" + wad)).to.be.revertedWith("Sikka/transfer-to-zero-address");
        });
        it('reverts: Sikka/insufficient-balance', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await expect(sikka.transferFrom(deployer.address, signer1.address, "1" + wad)).to.be.revertedWith("Sikka/insufficient-balance");
        });
        it('reverts: Sikka/insufficient-allowance', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.mint(deployer.address, "1" + wad);
            await expect(sikka.connect(signer1).transferFrom(deployer.address, signer1.address, "1" + wad)).to.be.revertedWith("Sikka/insufficient-allowance");
        });
        it('transferFrom with allowance', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.mint(deployer.address, "1" + wad);
            await sikka.approve(signer1.address, "1" + wad);
            await sikka.connect(signer1).transferFrom(deployer.address, signer1.address, "1" + wad);
            expect(await sikka.balanceOf(signer1.address)).to.be.equal("1" + wad);
        });
        it('transferFrom an address', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.mint(deployer.address, "1" + wad);
            await sikka.connect(deployer).transferFrom(deployer.address, signer1.address, "1" + wad);
            expect(await sikka.balanceOf(signer1.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- transfer()', function () {
        it('transfers to an address', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.mint(deployer.address, "1" + wad);
            await sikka.transfer(signer1.address, "1" + wad);
            expect(await sikka.balanceOf(signer1.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- push()', function () {
        it('pushes to an address', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.mint(deployer.address, "1" + wad);
            await sikka.push(signer1.address, "1" + wad);
            expect(await sikka.balanceOf(signer1.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- pull()', function () {
        it('pulls from an address', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.mint(signer1.address, "1" + wad);
            await sikka.connect(signer1).approve(deployer.address, "1" + wad);
            await sikka.pull(signer1.address, "1" + wad);
            expect(await sikka.balanceOf(deployer.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- move()', function () {
        it('move between addresses', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.mint(deployer.address, "1" + wad);
            await sikka.move(deployer.address, signer1.address, "1" + wad);
            expect(await sikka.balanceOf(signer1.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- increaseAllowance()', function () {
        it('increases allowance', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.increaseAllowance(signer1.address, "1" + wad);
            expect(await sikka.allowance(deployer.address, signer1.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- decreaseAllowance()', function () {
        it('reverts: Sikka/decreased-allowance-below-zero', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.increaseAllowance(signer1.address, "1" + wad);
            await expect(sikka.decreaseAllowance(signer1.address, "2" + wad)).to.be.revertedWith("Sikka/decreased-allowance-below-zero");
        });
        it('decreases allowance', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.increaseAllowance(signer1.address, "1" + wad);
            await sikka.decreaseAllowance(signer1.address, "1" + wad);
            expect(await sikka.allowance(deployer.address, signer1.address)).to.be.equal("0");
        });
    });
    describe('--- setSupplyCap()', function () {
        it('reverts: Sikka/more-supply-than-cap', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.mint(deployer.address, "1" + wad);
            await expect(sikka.setSupplyCap("0")).to.be.revertedWith("Sikka/more-supply-than-cap");
        });
        it('sets the cap', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.setSupplyCap("5" + wad);
            expect(await sikka.supplyCap()).to.be.equal("5" + wad);
        });
    });
    describe('--- updateDomainSeparator()', function () {
        it('sets domain separator', async function () {
            await sikka.initialize(97, "SIKKA", "100" + wad);
            await sikka.updateDomainSeparator(1);
            let DS1 = await sikka.DOMAIN_SEPARATOR;
            let DS2 =await sikka.updateDomainSeparator(2);
            expect(DS1).to.not.be.equal(DS2);
        });
    });
});