let hre = require("hardhat");
let {ethers, upgrades} = require("hardhat");
const {BN, ether} = require("@openzeppelin/test-helpers");
const fs = require("fs");
const { poll } = require("ethers/lib/utils");

let wad = "000000000000000000", // 18 Decimals
    ray = "000000000000000000000000000", // 27 Decimals
    rad = "000000000000000000000000000000000000000000000", // 45 Decimals
    ONE = 10 ** 27;

async function main() {

    // Signer
    [deployer] = await ethers.getSigners();
        
    // External Addresses
    let { _chainId} = require(`../${hre.network.name}_config.json`);

    let { masterVault} = require(`./mumbai_3addresses.json`);

    let _ilkCeMatic = ethers.utils.formatBytes32String("ceMATIC");

    // Contracts Fetching
    this.DavosProvider = await hre.ethers.getContractFactory("DavosProvider");

    this.Vat = await hre.ethers.getContractFactory("Vat");
    this.Spot = await hre.ethers.getContractFactory("Spotter");
    this.Davos = await hre.ethers.getContractFactory("Davos");
    this.GemJoin = await hre.ethers.getContractFactory("GemJoin");
    this.DavosJoin = await hre.ethers.getContractFactory("DavosJoin");
    this.Oracle = await hre.ethers.getContractFactory("MaticOracle"); 
    this.Jug = await hre.ethers.getContractFactory("Jug");
    this.Vow = await hre.ethers.getContractFactory("Vow");
    this.Dog = await hre.ethers.getContractFactory("Dog");
    this.Clip = await hre.ethers.getContractFactory("Clipper");
    this.Abacus = await hre.ethers.getContractFactory("LinearDecrease");

    // Contracts deployment
    console.log("Core 1...");

    let abacus = await upgrades.deployProxy(this.Abacus, [], {initializer: "initialize"});
    await abacus.deployed();
    abacusImp = await upgrades.erc1967.getImplementationAddress(abacus.address);
    console.log("Abacus          :", abacus.address);
    console.log("AbacusImp       :", abacusImp);

    if (hre.network.name == "polygon") {
        aggregatorAddress = "0x97371dF4492605486e23Da797fA68e55Fc38a13f";
    } else if (hre.network.name == "mumbai") {
        aggregatorAddress = "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada";
    }

    let oracle = await upgrades.deployProxy(this.Oracle, [aggregatorAddress], {initializer: "initialize"});
    await oracle.deployed();
    let oracleImplementation = await upgrades.erc1967.getImplementationAddress(oracle.address);
    console.log("Deployed: oracle: " + oracle.address);
    console.log("Imp             : " + oracleImplementation);

    let vat = await upgrades.deployProxy(this.Vat, [], {initializer: "initialize"});
    await vat.deployed();
    vatImp = await upgrades.erc1967.getImplementationAddress(vat.address);
    console.log("Vat             :", vat.address);
    console.log("VatImp          :", vatImp);

    let spot = await upgrades.deployProxy(this.Spot, [vat.address], {initializer: "initialize"});
    await spot.deployed();
    spotImp = await upgrades.erc1967.getImplementationAddress(spot.address);
    console.log("Spot            :", spot.address);
    console.log("SpotImp         :", spotImp)

    let davos = await upgrades.deployProxy(this.Davos, [_chainId, "DAVOS", "5000000" + wad], {initializer: "initialize"});
    await davos.deployed();
    davosImp = await upgrades.erc1967.getImplementationAddress(davos.address);
    console.log("davos           :", davos.address);
    console.log("davosImp        :", davosImp);

    let davosJoin = await upgrades.deployProxy(this.DavosJoin, [vat.address, davos.address], {initializer: "initialize"});
    await davosJoin.deployed();
    davosJoinImp = await upgrades.erc1967.getImplementationAddress(davosJoin.address);
    console.log("DavosJoin       :", davosJoin.address);
    console.log("DavosJoinImp    :", davosJoinImp)

    let gemJoin = await upgrades.deployProxy(this.GemJoin, [vat.address, _ilkCeMatic, masterVault], {initializer: "initialize"});
    await gemJoin.deployed();
    gemJoinImp = await upgrades.erc1967.getImplementationAddress(gemJoin.address);
    console.log("GemJoin         :", gemJoin.address);
    console.log("GemJoinImp      :", gemJoinImp);

    // Store deployed addresses
    const addresses = {
        abacus         : abacus.address,
        abacusImp      : abacusImp,
        oracle         : oracle.address,
        oracleImp      : oracleImplementation,
        vat            : vat.address,
        vatImp         : vatImp,
        spot           : spot.address,
        spotImp        : spotImp,
        davos          : davos.address,
        davosImp       : davosImp,
        davosJoin      : davosJoin.address,
        davosJoinImp   : davosJoinImp,
        gemJoin        : gemJoin.address,
        gemJoinImp     : gemJoinImp
    }

    const json_addresses = JSON.stringify(addresses);
    fs.writeFileSync(`./scripts/steps/${network.name}_4addresses.json`, json_addresses);
    console.log("4 Addresses Recorded to: " + `./scripts/steps/${network.name}_4addresses.json`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
});