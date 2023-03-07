let hre = require("hardhat");
let {ethers} = require("hardhat");

async function main() {

    // Signer
    [deployer] = await ethers.getSigners();
        
    // Fetching
    this.WaitingPool = await hre.ethers.getContractFactory("WaitingPool");

    // Deployment
    let wp = await this.WaitingPool.deploy();
    await wp.deployed();
    console.log(wp.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
});