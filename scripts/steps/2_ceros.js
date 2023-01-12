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
    let { _aMATICc, _wMatic, _dex, _dexPairFee} = require(`../${hre.network.name}_config.json`);
    let { swapPool, priceGetter} = require(`./${hre.network.name}_1addresses.json`);

    let ceaMATICc, ceVault, dMatic, cerosRouter;

    // Contracts Fetching
    this.CeaMATICc = await hre.ethers.getContractFactory("CeToken");
    this.CeVault = await hre.ethers.getContractFactory("CeVault");
    this.AMATICb = await hre.ethers.getContractFactory("aMATICb");
    this.AMATICc = await hre.ethers.getContractFactory("aMATICc");
    this.DMatic = await hre.ethers.getContractFactory("dMATIC");
    this.CerosRouter = await hre.ethers.getContractFactory("CerosRouter");

    // Ceros Deployment
    console.log("Ceros...");

    ceaMATICc = await upgrades.deployProxy(this.CeaMATICc, ["CEROS aMATICc Vault Token", "ceaMATICc"], {initializer: "initialize"});
    await ceaMATICc.deployed();
    ceaMATICcImp = await upgrades.erc1967.getImplementationAddress(ceaMATICc.address);
    console.log("ceaMATICc       : " + ceaMATICc.address);
    console.log("imp             : " + ceaMATICcImp);

    ceVault = await upgrades.deployProxy(this.CeVault, ["CEROS aMATICc Vault", ceaMATICc.address, _aMATICc], {initializer: "initialize"});
    await ceVault.deployed();
    ceVaultImp = await upgrades.erc1967.getImplementationAddress(ceVault.address);
    console.log("ceVault         : " + ceVault.address);
    console.log("imp             : " + ceVaultImp);

    dMatic = await upgrades.deployProxy(this.DMatic, [], {initializer: "initialize"});
    await dMatic.deployed();
    dMaticImp = await upgrades.erc1967.getImplementationAddress(dMatic.address);
    console.log("dMatic          : " + dMatic.address);
    console.log("imp             : " + dMaticImp);

    cerosRouter = await upgrades.deployProxy(this.CerosRouter, [_aMATICc, _wMatic, ceaMATICc.address, ceVault.address, _dex, _dexPairFee, swapPool, priceGetter], {initializer: "initialize"}, {gasLimit: 2000000});
    await cerosRouter.deployed();
    cerosRouterImp = await upgrades.erc1967.getImplementationAddress(cerosRouter.address);
    console.log("cerosRouter     : " + cerosRouter.address);
    console.log("imp             : " + cerosRouterImp);

    // Store deployed addresses
    const addresses = {
        ceaMATICc      : ceaMATICc.address,
        ceaMATICcImp   : ceaMATICcImp,
        ceVault        : ceVault.address,
        ceVaultImp     : ceVaultImp,
        dMatic         : dMatic.address,
        dMaticImp      : dMaticImp,
        cerosRouter    : cerosRouter.address,
        cerosRouterImp : cerosRouterImp,
    }

    const json_addresses = JSON.stringify(addresses);
    fs.writeFileSync(`./scripts/steps/${network.name}_2addresses.json`, json_addresses);
    console.log("2 Addresses Recorded to: " + `./scripts/steps/${network.name}_2addresses.json`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
});