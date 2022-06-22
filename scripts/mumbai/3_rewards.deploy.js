const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");
const {BN, ether} = require("@openzeppelin/test-helpers");

async function main() {
        
    // Variables Declaration
    let [deployer] = await ethers.getSigners();
    let ilkCeaMATICc = ethers.utils.formatBytes32String("ceaMATICc");
    let vat = "",
        sikka = "";

    // Contracts Fetching
    this.IkkaToken = await hre.ethers.getContractFactory("IkkaToken");
    this.IkkaRewards = await hre.ethers.getContractFactory("IkkaRewards");
    this.IkkaOracle = await hre.ethers.getContractFactory("IkkaOracle");

    // Contracts deployment
    const rewards = await upgrades.deployProxy(this.IkkaRewards, [vat, ether("100000000").toString()], {initializer: "initialize"});
    await rewards.deployed();
    let rewardsImplementation = await upgrades.erc1967.getImplementationAddress(rewards.address);
    console.log("Rewards             :", rewards.address);
    console.log("Imp                 :", rewardsImplementation);

    const ikkaToken = await this.IkkaToken.deploy(ether("100000000").toString(), rewards.address);
    await ikkaToken.deployed();
    console.log("ikkaToken           :", ikkaToken.address);
    
    const ikkaOracle = await upgrades.deployProxy(this.IkkaOracle, ["100000000000000000"], {initializer: "initialize"}); // 0.1
    await ikkaOracle.deployed();
    let ikkaOracleImplementation = await upgrades.erc1967.getImplementationAddress(ikkaOracle.address);
    console.log("ikkaOracle          :", ikkaOracle.address);
    console.log("Imp                 :", ikkaOracleImplementation);

    await ikkaToken.rely(rewards.address);
    await rewards.setIkkaToken(ikkaToken.address);
    await rewards.initPool(sikka, ilkCeaMATICc, "1000000001847694957439350500", {gasLimit: 2000000}); //6%
    await rewards.setOracle(ikkaOracle.address);

    console.log("Verifying Rewards...");

    // Verify implementations
    await hre.run("verify:verify", {
        address: ikkaToken.address,
        constructorArguments: ["200000000000000000000", rewards.address]
    });
    await hre.run("verify:verify", {
        address: rewardsImplementation,
    });
    await hre.run("verify:verify", {
        address: ikkaOracleImplementation,
    });

    // Verify proxies
    await hre.run("verify:verify", {
        address: rewards.address,
        constructorArguments: [
            vat, "100000000000000000000"
        ],
    });
    await hre.run("verify:verify", {
        address: ikkaOracle.address,
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
