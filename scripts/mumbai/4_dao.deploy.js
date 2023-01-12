const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");

async function main() {

    // Variables Declaration
    let [deployer] = await ethers.getSigners();
    let ilkCeaMATICc = ethers.utils.formatBytes32String("ceaMATICc");
    let _vat = "",
        _spot = "",
        _davos = "",
        _davosJoin = "",
        _jug = "",
        _dog = "",
        _rewards = "";

    // Contracts Fetching
    this.Rewards = await hre.ethers.getContractFactory("DgtRewards");
    let rewards = this.Rewards.attach(_rewards);
    this.AuctionProxy = await hre.ethers.getContractFactory("AuctionProxy");
    const auctionProxy = await this.AuctionProxy.deploy();
    await auctionProxy.deployed();
    console.log("AuctionProxy.lib          : ", auctionProxy.address);
    this.Interaction = await hre.ethers.getContractFactory("Interaction", {
        unsafeAllow: ['external-library-linking'],
        libraries: {
            AuctionProxy: auctionProxy.address
        }
    });
    const interaction = await upgrades.deployProxy(this.Interaction, [
        _vat,
        _spot,
        _davos,
        _davosJoin,
        _jug,
        _dog,
        rewards.address
    ], {
        initializer: "initialize",
        unsafeAllowLinkedLibraries: true,
    });
    await interaction.deployed();
    console.log("interaction               : ", interaction.address);
    
    this.Vat = await hre.ethers.getContractFactory("Vat");
    let vat = this.Vat.attach(_vat);
    await vat.rely(interaction.address);
    await rewards.rely(interaction.address);

    let interactionImplAddress = await upgrades.erc1967.getImplementationAddress(interaction.address);
    console.log("Interaction implementation: ", interactionImplAddress);

    console.log("Verifying DAO...");

    // Verify implementations
    await hre.run("verify:verify", {
        address: interactionImplAddress,
    });

    // Verify proxies
    await hre.run("verify:verify", {
        address: interaction.address,
        constructorArguments: [
            _vat,
            _spot,
            _davos,
            _davosJoin,
            _jug,
            _dog,
            rewards.address,
        ],
    });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
