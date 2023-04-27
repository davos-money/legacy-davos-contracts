let hre = require("hardhat");
let {ethers} = require("hardhat");

async function main() {

    // Signer
    [deployer] = await ethers.getSigners();
        
    // Fetching
    this.CerosRouter = await hre.ethers.getContractFactory("CerosRouter");

    // Deployment
    let cr = await this.CerosRouter.deploy();
    await cr.deployed();
    console.log("CerosRouter: " + cr.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
});