let hre = require("hardhat");
let {ethers, upgrades} = require("hardhat");
const {BN, ether} = require("@openzeppelin/test-helpers");
const fs = require("fs");
const { poll } = require("ethers/lib/utils");

async function main() {

    // Signer
    [deployer] = await ethers.getSigners();
        
    // External Addresses
    let { _aMATICc, _wMatic, _maxDepositFee, 
    _maxWithdrawalFee, _maxStrategies, _waitingPoolCap} = require(`../${hre.network.name}_config.json`);

    let { cerosRouter } = require(`./mumbai_2addresses.json`);
    let { swapPool} = require(`./mumbai_1addresses.json`);

    this.MasterVault = await hre.ethers.getContractFactory("MasterVault");
    this.WaitingPool = await hre.ethers.getContractFactory("WaitingPool");
    this.CerosYieldConverterStrategy = await hre.ethers.getContractFactory("CerosYieldConverterStrategy");

    // MasterVault Deployment
    console.log("MasterVault...");

    masterVault = await upgrades.deployProxy(this.MasterVault, ["CEROS MATIC Vault Token", "ceMATIC", _maxDepositFee, _maxWithdrawalFee, _wMatic, _maxStrategies, swapPool], {initializer: "initialize"});
    await masterVault.deployed();
    masterVaultImp = await upgrades.erc1967.getImplementationAddress(masterVault.address);
    console.log("masterVault     : " + masterVault.address);
    console.log("imp             : " + masterVaultImp);

    waitingPool = await upgrades.deployProxy(this.WaitingPool, [masterVault.address, _waitingPoolCap], {initializer: "initialize"});
    await waitingPool.deployed();
    waitingPoolImp = await upgrades.erc1967.getImplementationAddress(waitingPool.address);
    console.log("waitingPool     : " + waitingPool.address);
    console.log("imp             : " + waitingPoolImp);

    cerosYieldConverterStrategy = await upgrades.deployProxy(this.CerosYieldConverterStrategy, [cerosRouter, deployer.address, _wMatic, _aMATICc, masterVault.address, swapPool], {initializer: "initialize"});
    await cerosYieldConverterStrategy.deployed();
    cerosYieldConverterStrategyImp = await upgrades.erc1967.getImplementationAddress(cerosYieldConverterStrategy.address);
    console.log("cerosStrategy   : " + cerosYieldConverterStrategy.address);
    console.log("imp             : " + cerosYieldConverterStrategyImp);

    // Store deployed addresses
    const addresses = {
        masterVault    : masterVault.address,
        masterVaultImp : masterVaultImp,
        waitingPool    : waitingPool.address,
        waitingPoolImp : waitingPoolImp,
        cerosYieldStr  : cerosYieldConverterStrategy.address,
        cerosYieldConverterStrategyImp  : cerosYieldConverterStrategyImp,
    }

    const json_addresses = JSON.stringify(addresses);
    fs.writeFileSync(`./scripts/steps/${network.name}_3addresses.json`, json_addresses);
    console.log("3 Addresses Recorded to: " + `./scripts/steps/${network.name}_3addresses.json`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
});