const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");
const {BN, ether} = require("@openzeppelin/test-helpers");

async function main() {
        
    // Variables Declaration
    let [deployer] = await ethers.getSigners();
    let ilkCeMatic = ethers.utils.formatBytes32String("ceMATIC");
    let vat = "",
        masterVault = "";

    // Contracts Fetching
    this.DgtToken = await hre.ethers.getContractFactory("DgtToken");
    this.DgtRewards = await hre.ethers.getContractFactory("DgtRewards");
    this.DgtOracle = await hre.ethers.getContractFactory("DgtOracle");

    // Contracts deployment
    const rewards = await upgrades.deployProxy(this.DgtRewards, [vat, ether("100000000").toString()], {initializer: "initialize"});
    await rewards.deployed();
    let rewardsImplementation = await upgrades.erc1967.getImplementationAddress(rewards.address);
    console.log("Rewards             :", rewards.address);
    console.log("Imp                 :", rewardsImplementation);

    const dgtToken = await this.DgtToken.deploy(ether("100000000").toString(), rewards.address);
    await dgtToken.deployed();
    console.log("dgtToken           :", dgtToken.address);
    
    const dgtOracle = await upgrades.deployProxy(this.DgtOracle, ["100000000000000000"], {initializer: "initialize"}); // 0.1
    await dgtOracle.deployed();
    let dgtOracleImplementation = await upgrades.erc1967.getImplementationAddress(dgtOracle.address);
    console.log("dgtOracle          :", dgtOracle.address);
    console.log("Imp                 :", dgtOracleImplementation);

    await dgtToken.rely(rewards.address);
    await rewards.setDgtToken(dgtToken.address);
    await rewards.initPool(masterVault, ilkCeMatic, "1000000001847694957439350500", {gasLimit: 2000000}); //6%
    await rewards.setOracle(dgtOracle.address);

    console.log("Verifying Rewards...");

    // Verify implementations
    await hre.run("verify:verify", {
        address: dgtToken.address,
        constructorArguments: ["200000000000000000000", rewards.address]
    });
    await hre.run("verify:verify", {
        address: rewardsImplementation,
    });
    await hre.run("verify:verify", {
        address: dgtOracleImplementation,
    });

    // Verify proxies
    await hre.run("verify:verify", {
        address: rewards.address,
        constructorArguments: [
            vat, "100000000000000000000"
        ],
    });
    await hre.run("verify:verify", {
        address: dgtOracle.address,
        constructorArguments: [
            "100000000000000000"
        ],
    });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
