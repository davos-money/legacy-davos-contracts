const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");

async function main() {

    // Variables Declaration
    let [deployer] = await ethers.getSigners();
    let masterVault,
        cerosYieldConverterStrategy;
    // External Addresses
    let _aMATICc = "0xaC32206a73C8406D74eB21cF7bd060bf841e64aD",
        _wMatic = "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",

        _ceRouter = "",
        _masterVault = "",
        _swapPool = "0xFCC0937847030e91567c78a147e6e36F719Dc46b",
        _destination = _ceRouter,
        _feeRecipient = deployer.address,
        _underlyingToken = _wMatic,
        _certToekn = _aMATICc,
        _rewardsPool = deployer.address,
        _performanceFees = 0

    // Contracts Fetching
    this.CerosYieldConverterStrategy = await hre.ethers.getContractFactory("CerosYieldConverterStrategy");
    this.MasterVault = await hre.ethers.getContractFactory("MasterVault");
    
    cerosYieldConverterStrategy = await upgrades.deployProxy(this.CerosYieldConverterStrategy, [_destination, _feeRecipient, _underlyingToken, _ceRouter, _certToekn, _masterVault, _rewardsPool, _swapPool], {initializer: "initialize"});
    await cerosYieldConverterStrategy.deployed();
    let cerosYieldConverterStrategyImp = await upgrades.erc1967.getImplementationAddress(cerosYieldConverterStrategy.address);
    console.log("cerosYieldConverterStrategy    : " + cerosYieldConverterStrategy.address);
    console.log("imp        : " + cerosYieldConverterStrategyImp);

    
    masterVault = await this.MasterVault.attach(_masterVault);
    await masterVault.setStrategy(cerosYieldConverterStrategy.address, 80 * 10000)   // 80%

    console.log("Verifying Ceros...");

    // Verify implementations
    await hre.run("verify:verify", {
        address: cerosYieldConverterStrategyImp,
    });

    // Verify proxies
    await hre.run("verify:verify", {
        address: cerosYieldConverterStrategy.address,
        constructorArguments: [
            _destination, _feeRecipient, _underlyingToken, _ceRouter, _certToekn, _masterVault, _rewardsPool, _swapPool
        ],
    });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
