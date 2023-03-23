let hre = require("hardhat");
let {ethers} = require("hardhat");

async function main() {

    // Signer
    [deployer] = await ethers.getSigners();
        
    // Fetching
    this.MasterVault = await hre.ethers.getContractFactory("MasterVault");
    this.Strat = await hre.ethers.getContractFactory("CerosYieldConverterStrategy");

    // Deployment
    let mv = await this.MasterVault.deploy();
    await mv.deployed();
    console.log("MasterVault: " + mv.address);
    let s = await this.MasterVault.deploy();
    await s.deployed();
    console.log("Strategy:    " + s.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
});