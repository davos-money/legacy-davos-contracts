const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");

async function main() {

    // Variables Declaration
    let [deployer] = await ethers.getSigners();
    let sikkaProvider,
        sMatic,
        cerosRouter;
    let _sMatic = "",
        _aMATICc = "0xaC32206a73C8406D74eB21cF7bd060bf841e64aD",
        _ceaMATICc = "",
        _cerosRouter = "",
        _dao = "",  // Interaction
        _pool = "";

    // Contracts Fetching
    this.SikkaProvider = await hre.ethers.getContractFactory("SikkaProvider");
    this.SMatic = await hre.ethers.getContractFactory("sMATIC");
    this.CerosRouter = await hre.ethers.getContractFactory("CerosRouter");    
    
    sikkaProvider = await upgrades.deployProxy(this.SikkaProvider, [_sMatic, _aMATICc, _ceaMATICc, _cerosRouter, _dao, _pool], {initializer: "initialize"});
    await sikkaProvider.deployed();
    let sikkaProviderImplementation = await upgrades.erc1967.getImplementationAddress(sikkaProvider.address);
    console.log("sikkaProvider  : " + sikkaProvider.address);
    console.log("imp           : " + sikkaProviderImplementation);

    sMatic = await this.SMatic.attach(_sMatic);
    cerosRouter = await this.CerosRouter.attach(_cerosRouter);
    await sMatic.changeMinter(sikkaProvider.address);
    await cerosRouter.changeProvider(sikkaProvider.address);
    
    const Interaction = await hre.ethers.getContractFactory("Interaction", {
        unsafeAllow: ['external-library-linking'],
        libraries: {
            AuctionProxy: _auctionProxy
        }
    });
    const interaction = await Interaction.attach(_dao);
    await interaction.setIkkaProvider(_ceaMATICc, sikkaProvider.address)

    console.log("Verifying Provider...");

    // Verify implementations
    await hre.run("verify:verify", {
        address: sikkaProviderImplementation,
    });

    // Verify proxies
    await hre.run("verify:verify", {
        address: sikkaProvider.address,
        constructorArguments: [
            _sMatic, _aMATICc, _ceaMATICc, _cerosRouter, _dao
        ],
    });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
