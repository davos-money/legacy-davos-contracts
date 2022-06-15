const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");

async function main() {

    // Variables Declaration
    let [deployer] = await ethers.getSigners();
    let ikkaProvider,
        iMatic,
        cerosRouter;
    let _iMatic = "",
        _aMATICc = "0xaC32206a73C8406D74eB21cF7bd060bf841e64aD",
        _ceaMATICc = "",
        _cerosRouter = "",
        _dao = "",  // Interaction
        _pool = "";

    // Contracts Fetching
    this.IkkaProvider = await hre.ethers.getContractFactory("IkkaProvider");
    this.IMatic = await hre.ethers.getContractFactory("iMATIC");
    this.CerosRouter = await hre.ethers.getContractFactory("CerosRouter");

    // Contracts Deployment and initialization
    ikkaProvider = await upgrades.deployProxy(this.IkkaProvider, [_iMatic, _aMATICc, _ceaMATICc, _cerosRouter, _dao, _pool], {initializer: "initialize"});
    await ikkaProvider.deployed();
    let ikkaProviderImplementation = await upgrades.erc1967.getImplementationAddress(ikkaProvider.address);
    console.log("ikkaProvider  : " + ikkaProvider.address);
    console.log("imp           : " + ikkaProviderImplementation);

    iMatic = await this.IMatic.attach(_iMatic);
    cerosRouter = await this.CerosRouter.attach(_cerosRouter);
    iMatic.changeMinter(ikkaProvider.address);
    cerosRouter.changeProvider(ikkaProvider.address);
    // let interaction = this.Interaction.attach(INTERACTION);

    console.log("Verifying Provider...");

    // Verify implementations
    await hre.run("verify:verify", {
        address: ikkaProviderImplementation,
    });

    // Verify proxies
    await hre.run("verify:verify", {
        address: ikkaProvider.address,
        constructorArguments: [
            _iMatic, _aMATICc, _ceaMATICc, _cerosRouter, _dao, _pool
        ],
    });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
