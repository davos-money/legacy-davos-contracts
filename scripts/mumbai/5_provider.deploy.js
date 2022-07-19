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
        _wMatic = "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
        _masterVault = "",  // masterVault
        _dao = "";          // Interaction

    // Contracts Fetching
    this.SikkaProvider = await hre.ethers.getContractFactory("SikkaProvider");
    this.SMatic = await hre.ethers.getContractFactory("sMATIC");
    this.CerosRouter = await hre.ethers.getContractFactory("CerosRouter");
    this.MasterVault = await hre.ethers.getContractFactory("MasterVault");

    sikkaProvider = await upgrades.deployProxy(this.SikkaProvider, [_sMatic, _masterVault, _dao], {initializer: "initialize"});
    await sikkaProvider.deployed();
    let sikkaProviderImplementation = await upgrades.erc1967.getImplementationAddress(sikkaProvider.address);
    console.log("sikkaProvider  : " + sikkaProvider.address);
    console.log("imp           : " + sikkaProviderImplementation);

    masterVault = this.MasterVault.attach(_masterVault);
    sMatic = await this.SMatic.attach(_sMatic);
    await sMatic.changeMinter(sikkaProvider.address);
    await masterVault.changeProvider(sikkaProvider.address)

    console.log("Verifying Provider...");

    // Verify implementations
    await hre.run("verify:verify", {
        address: sikkaProviderImplementation,
    });

    // Verify proxies
    await hre.run("verify:verify", {
        address: sikkaProvider.address,
        constructorArguments: [
            _sMatic, _masterVault, _dao
        ],
    });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
