let hre = require("hardhat");
let {ethers, upgrades} = require("hardhat");
const {BN, ether} = require("@openzeppelin/test-helpers");
const fs = require("fs");
const { poll } = require("ethers/lib/utils");

async function main() {

    // Signer
    [deployer] = await ethers.getSigners();
        
    // External Addresses
    let { _aMATICc, _wMatic} = require(`../${hre.network.name}_config.json`);

    this.PriceGetter = await hre.ethers.getContractFactory("PriceGetter");

    this.SwapPool = await ethers.getContractFactory("SwapPool");
    this.LP = await ethers.getContractFactory("LP");

    // PriceGetter Deployment
    console.log("PriceGetter...")
    
    let { _dexFactory } = require(`../${hre.network.name}_config.json`);    
    let priceGetter = await this.PriceGetter.deploy(_dexFactory);
    await priceGetter.deployed();
    console.log("PriceGetter     : " + priceGetter.address);

    // SwapPool Deployment
    console.log("SwapPool...");

    let lp = await upgrades.deployProxy(this.LP, ["aMATICcLP", "aMATICcLP"], {initializer: "initialize"});
    await lp.deployed();
    let lpImplementation = await upgrades.erc1967.getImplementationAddress(lp.address);
    console.log("lp              : " + lp.address);
    console.log("imp             : " + lpImplementation);

    let swapPool = await upgrades.deployProxy(this.SwapPool, [_wMatic, _aMATICc, lp.address, false, false], {initializer: "initialize"});
    await swapPool.deployed();
    let swapPoolImplementation = await upgrades.erc1967.getImplementationAddress(swapPool.address);
    console.log("swapPool        : " + swapPool.address);
    console.log("imp             : " + swapPoolImplementation);


    // Store deployed addresses
    const addresses = {
        priceGetter     : priceGetter.address,
        LP              : lp.address,
        LPImp           : lpImplementation,
        swapPool        : swapPool.address,
        swapPoolImp     : swapPoolImplementation,
    }

    const json_addresses = JSON.stringify(addresses);
    fs.writeFileSync(`./scripts/steps/${network.name}_1addresses.json`, json_addresses);
    console.log("1 Addresses Recorded to: " + `./scripts/steps/${network.name}_1addresses.json`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
});