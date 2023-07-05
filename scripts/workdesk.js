let hre = require("hardhat");
let {ethers} = require("hardhat");

async function main() {

    // Signer
    [deployer] = await ethers.getSigners();
        
    // Fetching
    this.DavosProvider = await hre.ethers.getContractFactory("DavosProvider");

    // Deployment
    let dp = await this.DavosProvider.deploy();
    await dp.deployed();
    console.log("DP: " + dp.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
});