const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");

async function main() {

    // Variables Declaration
    let [deployer] = await ethers.getSigners();
    let davosProvider,
        dMatic,
        cerosRouter;
    let _dMatic = "",
        _aMATICc = "0xaC32206a73C8406D74eB21cF7bd060bf841e64aD",
        _wMatic = "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
        _masterVault = "",  // masterVault
        _dao = "";          // Interaction

    // Contracts Fetching
    this.DavosProvider = await hre.ethers.getContractFactory("DavosProvider");
    this.DMatic = await hre.ethers.getContractFactory("dMATIC");
    this.CerosRouter = await hre.ethers.getContractFactory("CerosRouter");
    this.MasterVault = await hre.ethers.getContractFactory("MasterVault");

    davosProvider = await upgrades.deployProxy(this.DavosProvider, [_dMatic, _masterVault, _dao], {initializer: "initialize"});
    await davosProvider.deployed();
    let davosProviderImplementation = await upgrades.erc1967.getImplementationAddress(davosProvider.address);
    console.log("davosProvider  : " + davosProvider.address);
    console.log("imp           : " + davosProviderImplementation);

    masterVault = this.MasterVault.attach(_masterVault);
    dMatic = await this.DMatic.attach(_dMatic);
    await dMatic.changeMinter(davosProvider.address);
    await masterVault.changeProvider(davosProvider.address)

    console.log("Verifying Provider...");

    // Verify implementations
    await hre.run("verify:verify", {
        address: davosProviderImplementation,
    });

    // Verify proxies
    await hre.run("verify:verify", {
        address: davosProvider.address,
        constructorArguments: [
            _dMatic, _masterVault, _dao
        ],
    });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
