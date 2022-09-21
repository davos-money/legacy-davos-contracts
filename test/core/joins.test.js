const { ethers, network } = require('hardhat');
const { expect } = require("chai");

describe('===GemJoin===', function () {
    let deployer, signer1, signer2;

    let wad = "000000000000000000", // 18 Decimals
        ray = "000000000000000000000000000", // 27 Decimals
        rad = "000000000000000000000000000000000000000000000"; // 45 Decimals

    let collateral = ethers.utils.formatBytes32String("TEST");

    const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

    beforeEach(async function () {

        [deployer, signer1, signer2] = await ethers.getSigners();

        // Contract factory
        this.GemJoin = await ethers.getContractFactory("GemJoin");
        this.Vat = await ethers.getContractFactory("Vat");
        this.Sikka = await ethers.getContractFactory("Sikka");

        // Contract deployment
        gemjoin = await this.GemJoin.connect(deployer).deploy();
        await gemjoin.deployed();
        vat = await this.Vat.connect(deployer).deploy();
        await vat.deployed();
        gem = await this.Sikka.connect(deployer).deploy();
        await gem.deployed();
    });

    describe('--- initialize()', function () {
        it('initialize', async function () {
            await gemjoin.initialize(vat.address, collateral, gem.address);
            expect(await gemjoin.vat()).to.be.equal(vat.address);
        });
    });
    describe('--- rely()', function () {
        it('reverts: GemJoin/not-authorized', async function () {
            await expect(gemjoin.rely(signer1.address)).to.be.revertedWith("GemJoin/not-authorized");
            expect(await gemjoin.wards(signer1.address)).to.be.equal("0");
        });
        it('relies on address', async function () {
            await gemjoin.initialize(vat.address, collateral, gem.address);
            await gemjoin.rely(signer1.address);
            expect(await gemjoin.wards(signer1.address)).to.be.equal("1");
        });
    });
    describe('--- deny()', function () {
        it('reverts: GemJoin/not-authorized', async function () {
            await expect(gemjoin.deny(signer1.address)).to.be.revertedWith("GemJoin/not-authorized");
        });
        it('denies an address', async function () {
            await gemjoin.initialize(vat.address, collateral, gem.address);
            await gemjoin.rely(signer1.address);
            expect(await gemjoin.wards(signer1.address)).to.be.equal("1");
            await gemjoin.deny(signer1.address);
            expect(await gemjoin.wards(signer1.address)).to.be.equal("0");
        });
    });
    describe('--- cage()', function () {
        it('cages', async function () {
            await gemjoin.initialize(vat.address, collateral, gem.address);
            await gemjoin.cage();
            expect(await gemjoin.live()).to.be.equal("0");
        });
    });
    describe('--- join()', function () {
        it('reverts: GemJoin/not-live', async function () {
            await gemjoin.initialize(vat.address, collateral, gem.address);
            await gemjoin.cage();
            await expect(gemjoin.join(deployer.address, "1" + wad)).to.be.revertedWith("GemJoin/not-live");
        });
        it('reverts: GemJoin/overflow', async function () {
            await gemjoin.initialize(vat.address, collateral, gem.address);
            await expect(gemjoin.join(deployer.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")).to.be.revertedWith("GemJoin/overflow");
        });
        it('joins sikka erc20', async function () {
            await gemjoin.initialize(vat.address, collateral, gem.address);
            await gem.initialize(97, "GEM", "100" + wad);
            await vat.initialize();

            await gem.mint(deployer.address, "1" + wad);
            await gem.approve(gemjoin.address, "1" + wad);
            await vat.rely(gemjoin.address);
            await gem.rely(gemjoin.address);

            await gemjoin.join(deployer.address, "1" + wad);
            expect(await vat.gem(collateral, deployer.address)).to.be.equal("1" + wad);
        });
    });
    describe('--- exit()', function () {
        it('reverts: GemJoin/overflow', async function () {
            await gemjoin.initialize(vat.address, collateral, gem.address);
            await expect(gemjoin.exit(deployer.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")).to.be.revertedWith("GemJoin/overflow");
        });
        it('exits sikka erc20', async function () {
            await gemjoin.initialize(vat.address, collateral, gem.address);
            await gem.initialize(97, "GEM", "100" + wad);
            await vat.initialize();

            await gem.mint(deployer.address, "1" + wad);
            await gem.approve(gemjoin.address, "1" + wad);
            await vat.rely(gemjoin.address);
            await gem.rely(gemjoin.address);

            await gemjoin.join(deployer.address, "1" + wad);
            expect(await vat.gem(collateral, deployer.address)).to.be.equal("1" + wad);

            await gemjoin.exit(deployer.address, "1" + wad);
            expect(await vat.gem(collateral, deployer.address)).to.be.equal("0");
        });
    });
});
describe('===SikkaJoin===', function () {
    let deployer, signer1, signer2;

    let wad = "000000000000000000", // 18 Decimals
        ray = "000000000000000000000000000", // 27 Decimals
        rad = "000000000000000000000000000000000000000000000"; // 45 Decimals

    let collateral = ethers.utils.formatBytes32String("TEST");

    const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

    beforeEach(async function () {

        [deployer, signer1, signer2] = await ethers.getSigners();

        // Contract factory
        this.SikkaJoin = await ethers.getContractFactory("SikkaJoin");
        this.Vat = await ethers.getContractFactory("Vat");
        this.Sikka = await ethers.getContractFactory("Sikka");

        // Contract deployment
        sikkajoin = await this.SikkaJoin.connect(deployer).deploy();
        await sikkajoin.deployed();
        vat = await this.Vat.connect(deployer).deploy();
        await vat.deployed();
        sikka = await this.Sikka.connect(deployer).deploy();
        await sikka.deployed();
    });

    describe('--- initialize()', function () {
        it('initialize', async function () {
            await sikkajoin.initialize(vat.address, sikka.address);
            expect(await sikkajoin.vat()).to.be.equal(vat.address);
        });
    });
    describe('--- rely()', function () {
        it('reverts: SikkaJoin/not-authorized', async function () {
            await expect(sikkajoin.rely(signer1.address)).to.be.revertedWith("SikkaJoin/not-authorized");
            expect(await sikkajoin.wards(signer1.address)).to.be.equal("0");
        });
        it('relies on address', async function () {
            await sikkajoin.initialize(vat.address, sikka.address);
            await sikkajoin.rely(signer1.address);
            expect(await sikkajoin.wards(signer1.address)).to.be.equal("1");
        });
    });
    describe('--- deny()', function () {
        it('reverts: SikkaJoin/not-authorized', async function () {
            await expect(sikkajoin.deny(signer1.address)).to.be.revertedWith("SikkaJoin/not-authorized");
        });
        it('denies an address', async function () {
            await sikkajoin.initialize(vat.address, sikka.address);
            await sikkajoin.rely(signer1.address);
            expect(await sikkajoin.wards(signer1.address)).to.be.equal("1");
            await sikkajoin.deny(signer1.address);
            expect(await sikkajoin.wards(signer1.address)).to.be.equal("0");
        });
    });
    describe('--- cage()', function () {
        it('cages', async function () {
            await sikkajoin.initialize(vat.address, sikka.address);
            await sikkajoin.cage();
            expect(await sikkajoin.live()).to.be.equal("0");
        });
    });
    describe('--- join()', function () {
        it('joins sikka erc20', async function () {
            await sikkajoin.initialize(vat.address, sikka.address);
            await sikka.initialize(97, "SIKKA", "100" + wad);
            
            await vat.initialize();
            await vat.init(collateral);
            await vat.rely(sikkajoin.address);
            await sikka.rely(sikkajoin.address);
            await vat.hope(sikkajoin.address);

            await vat.connect(deployer)["file(bytes32,uint256)"](await ethers.utils.formatBytes32String("Line"), "200" + rad);
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("line"), "200" + rad);  
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("dust"), "10" + rad);              
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("spot"), "100" + ray);

            await vat.slip(collateral, deployer.address, "1" + wad);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, deployer.address, "1" + wad, 0);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, deployer.address, 0, "15" + wad);
            await sikkajoin.exit(deployer.address, "1" + wad);

            await sikka.approve(sikkajoin.address, "1" + wad);
            
            await sikkajoin.join(deployer.address, "1" + wad);
            expect(await vat.sikka(deployer.address)).to.be.equal("15" + rad);
        });
    });
    describe('--- exit()', function () {
        it('reverts: SikkaJoin/not-live', async function () {
            await sikkajoin.initialize(vat.address, sikka.address);
            await sikkajoin.cage();
            await expect(sikkajoin.exit(deployer.address, "1" + wad)).to.be.revertedWith("SikkaJoin/not-live");
        });
        it('exits sikka erc20', async function () {
            await sikkajoin.initialize(vat.address, sikka.address);
            await sikka.initialize(97, "SIKKA", "100" + wad);
            
            await vat.initialize();
            await vat.init(collateral);
            await vat.rely(sikkajoin.address);
            await sikka.rely(sikkajoin.address);
            await vat.hope(sikkajoin.address);

            await vat.connect(deployer)["file(bytes32,uint256)"](await ethers.utils.formatBytes32String("Line"), "200" + rad);
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("line"), "200" + rad);  
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("dust"), "10" + rad);              
            await vat.connect(deployer)["file(bytes32,bytes32,uint256)"](collateral, await ethers.utils.formatBytes32String("spot"), "100" + ray);

            await vat.slip(collateral, deployer.address, "1" + wad);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, deployer.address, "1" + wad, 0);
            await vat.connect(deployer).frob(collateral, deployer.address, deployer.address, deployer.address, 0, "15" + wad);
            await sikkajoin.exit(signer1.address, "1" + wad);

            expect(await sikka.balanceOf(signer1.address)).to.be.equal("1" + wad);
        });
    });
});