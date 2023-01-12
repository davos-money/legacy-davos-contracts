const { ethers, network } = require('hardhat');
const { expect } = require("chai");

describe('===Vow===', function () {
    let deployer, signer1, signer2;

    let wad = "000000000000000000", // 18 Decimals
        ray = "000000000000000000000000000", // 27 Decimals
        rad = "000000000000000000000000000000000000000000000"; // 45 Decimals

    let collateral = ethers.utils.formatBytes32String("TEST");

    const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

    beforeEach(async function () {

        [deployer, signer1, signer2] = await ethers.getSigners();

        // Contract factory
        this.Vow = await ethers.getContractFactory("Vow");
        this.Vat = await ethers.getContractFactory("Vat");
        this.DavosJoin = await ethers.getContractFactory("DavosJoin");
        this.Davos = await ethers.getContractFactory("Davos");

        // Contract deployment
        vow = await this.Vow.connect(deployer).deploy();
        await vow.deployed();
        vat = await this.Vat.connect(deployer).deploy();
        await vat.deployed();
        davosJoin = await this.DavosJoin.connect(deployer).deploy();
        await davosJoin.deployed();
        davos = await this.Davos.connect(deployer).deploy();
        await davos.deployed();
    });

    describe('--- initialize()', function () {
        it('initialize', async function () {
            expect(await vow.live()).to.be.equal("0");
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);
            expect(await vow.live()).to.be.equal("1");
        });
    });
    describe('--- rely()', function () {
        it('reverts: Vow/not-authorized', async function () {
            await expect(vow.rely(signer1.address)).to.be.revertedWith("Vow/not-authorized");
            expect(await vow.wards(signer1.address)).to.be.equal("0");
        });
        it('reverts: Vow/not-live', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);
            await vow.cage();
            await expect(vow.rely(signer1.address)).to.be.revertedWith("Vow/not-live");
            expect(await vow.wards(signer1.address)).to.be.equal("0");
        });
        it('relies on address', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);
            await vow.rely(signer1.address);
            expect(await vow.wards(signer1.address)).to.be.equal("1");
        });
    });
    describe('--- deny()', function () {
        it('reverts: Vow/not-authorized', async function () {
            await expect(vow.deny(signer1.address)).to.be.revertedWith("Vow/not-authorized");
        });
        it('denies an address', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);
            await vow.rely(signer1.address);
            expect(await vow.wards(signer1.address)).to.be.equal("1");
            await vow.deny(signer1.address);
            expect(await vow.wards(signer1.address)).to.be.equal("0");
        });
    });
    describe('--- file(2a)', function () {
        it('reverts: Vow/not-authorized', async function () {
            await expect(vow.connect(deployer)["file(bytes32,uint256)"](await ethers.utils.formatBytes32String("humpy"), "100" + rad)).to.be.revertedWith("Vow/not-authorized");
        });
        it('reverts: Vow/file-unrecognized-param', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);
            await expect(vow.connect(deployer)["file(bytes32,uint256)"](await ethers.utils.formatBytes32String("humpy"), "100" + rad)).to.be.revertedWith("Vow/file-unrecognized-param");
        });
        it('sets hump', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);
            await vow.connect(deployer)["file(bytes32,uint256)"](await ethers.utils.formatBytes32String("hump"), "100" + rad);
            expect(await vow.hump()).to.be.equal("100" + rad);
        });
    });
    describe('--- file(2b)', function () {
        it('reverts: Vow/not-authorized', async function () {
            await expect(vow.connect(deployer)["file(bytes32,address)"](await ethers.utils.formatBytes32String("new"), deployer.address)).to.be.revertedWith("Vow/not-authorized");
        });
        it('reverts: Vow/file-unrecognized-param', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);
            await expect(vow.connect(deployer)["file(bytes32,address)"](await ethers.utils.formatBytes32String("new"), deployer.address)).to.be.revertedWith("Vow/file-unrecognized-param");
        });
        it('sets multisig', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);
            await vow.connect(deployer)["file(bytes32,address)"](await ethers.utils.formatBytes32String("multisig"), signer1.address);
            expect(await vow.multisig()).to.be.equal(signer1.address);
        });
        it('sets davosJoin', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);
            await vow.connect(deployer)["file(bytes32,address)"](await ethers.utils.formatBytes32String("davosjoin"), davosJoin.address);
            expect(await vow.davosJoin()).to.be.equal(davosJoin.address);
        });
        it('sets davos', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);
            await vow.connect(deployer)["file(bytes32,address)"](await ethers.utils.formatBytes32String("davos"), davos.address);
            expect(await vow.davos()).to.be.equal(davos.address);
        });
        it('sets vat', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);
            await vow.connect(deployer)["file(bytes32,address)"](await ethers.utils.formatBytes32String("vat"), vat.address);
            expect(await vow.vat()).to.be.equal(vat.address);
        });
    });
    describe('--- heal()', function () {
        it('reverts: Vow/insufficient-surplus', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);

            await expect(vow.heal("1" + rad)).to.be.revertedWith("Vow/insufficient-surplus");
        });
        it('reverts: Vow/insufficient-debt', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);

            await vat.init(collateral);
            await vat.connect(deployer)["file(bytes32,uint256)"](await ethers.utils.formatBytes32String("Line"), "200" + rad);
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("line"), "200" + rad);  
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("dust"), "10" + rad);              
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("spot"), "100" + ray);
            await vat.slip(collateral, deployer.address, "1" + wad);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, deployer.address, "1" + wad, 0);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, vow.address, 0, "15" + wad);

            await expect(vow.heal("1" + rad)).to.be.revertedWith("Vow/insufficient-debt");
        });
        it('reverts: Vow/not-authorized', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);

            await vat.init(collateral);
            await vat.connect(deployer)["file(bytes32,uint256)"](await ethers.utils.formatBytes32String("Line"), "200" + rad);
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("line"), "200" + rad);  
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("dust"), "10" + rad);              
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("spot"), "100" + ray);
            await vat.slip(collateral, deployer.address, "1" + wad);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, deployer.address, "1" + wad, 0);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, vow.address, 0, "15" + wad);
            await vat.rely(signer1.address);
            await vat.connect(signer1).grab(collateral, deployer.address, deployer.address, vow.address, "-1" + wad, "-15" + wad);
            expect(await vat.sin(vow.address)).to.be.equal("15" + rad);
            expect(await vat.davos(vow.address)).to.be.equal("15" + rad);

            await vow.heal("10" + rad);
            expect(await vat.sin(vow.address)).to.be.equal("5" + rad);
            expect(await vat.davos(vow.address)).to.be.equal("5" + rad);
        });
    });
    describe('--- feed()', function () {
        it('feeds surplus davos to vow', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);

            await vat.init(collateral);
            await vat.rely(vow.address);
            await vat.rely(davosJoin.address);
            await vat.hope(davosJoin.address);
            await vat.connect(deployer)["file(bytes32,uint256)"](await ethers.utils.formatBytes32String("Line"), "200" + rad);
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("line"), "200" + rad);  
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("dust"), "10" + rad);              
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("spot"), "100" + ray);
            await vat.slip(collateral, deployer.address, "1" + wad);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, deployer.address, "1" + wad, 0);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, deployer.address, 0, "15" + wad);

            await vow.connect(deployer)["file(bytes32,address)"](await ethers.utils.formatBytes32String("davos"), davos.address);
            await davos.connect(deployer).rely(davosJoin.address);
            await davosJoin.connect(deployer).rely(vow.address);
            await davosJoin.connect(deployer).exit(deployer.address, "10" + wad);
            expect(await davos.balanceOf(deployer.address)).to.be.equal("10" + wad);

            await davos.connect(deployer).approve(vow.address, "10" + wad);
            await vow.connect(deployer).feed("10" + wad);
            expect(await vat.davos(vow.address)).to.be.equal("10" + rad);
        });
    });
    describe('--- flap()', function () {
        it('reverts: Vow/insufficient-surplus', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);

            await vat.init(collateral);
            await vat.rely(vow.address);
            await vat.rely(davosJoin.address);
            await vat.hope(davosJoin.address);
            await vat.connect(deployer)["file(bytes32,uint256)"](await ethers.utils.formatBytes32String("Line"), "200" + rad);
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("line"), "200" + rad);  
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("dust"), "10" + rad);              
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("spot"), "100" + ray);
            await vat.slip(collateral, deployer.address, "1" + wad);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, deployer.address, "1" + wad, 0);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, deployer.address, 0, "15" + wad);
            await vat.connect(deployer).move(deployer.address, vow.address, "10" + rad);
            await vat.rely(signer1.address);
            await vat.connect(signer1).grab(collateral, deployer.address, deployer.address, vow.address, "-1" + wad, "-15" + wad);

            await expect(vow.flap()).to.be.revertedWith("Vow/insufficient-surplus");
        });
        it('flaps davos to multisig', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);

            await vat.init(collateral);
            await vat.rely(vow.address);
            await vat.rely(davosJoin.address);
            await vat.hope(davosJoin.address);
            await vat.connect(deployer)["file(bytes32,uint256)"](await ethers.utils.formatBytes32String("Line"), "200" + rad);
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("line"), "200" + rad);  
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("dust"), "10" + rad);              
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("spot"), "100" + ray);
            await vat.slip(collateral, deployer.address, "1" + wad);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, deployer.address, "1" + wad, 0);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, vow.address, 0, "15" + wad);
            
            await davosJoin.rely(vow.address);
            await davos.rely(davosJoin.address);

            await vow.flap();
            expect(await davos.balanceOf(deployer.address)).to.be.equal("15" + wad);
        });
    });
    describe('--- cage()', function () {
        it('reverts: Vow/not-live', async function () {
            await vat.initialize();
            await davos.initialize("97", "DAVOS", "100" + wad);
            await davosJoin.initialize(vat.address, davos.address);
            await vow.initialize(vat.address, davosJoin.address, deployer.address);
            
            await vow.cage();
            await expect(vow.cage()).to.be.revertedWith("Vow/not-live");
        });
    });
});