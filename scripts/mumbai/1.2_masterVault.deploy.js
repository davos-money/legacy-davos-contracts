const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");

async function main() {

    // Variables Declaration
    let [deployer] = await ethers.getSigners();
    let masterVault,
        waitingPool;
    // External Addresses
    let _wMatic = "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
        _swapPool = "0xFCC0937847030e91567c78a147e6e36F719Dc46b",
        _maxDepositFee = 500000,  // 50%
        _maxWithdrawalFee = 500000,
        _maxStrategies = 10;

    // Contracts Fetching
    this.MasterVault = await hre.ethers.getContractFactory("MasterVault");
    this.WaitingPool = await hre.ethers.getContractFactory("WaitingPool");
    console.log('here')
    masterVault = await upgrades.deployProxy(this.MasterVault, ["CEROS MATIC Vault Token", "ceMATIC", _maxDepositFee, _maxWithdrawalFee, _wMatic, _maxStrategies, _swapPool], {initializer: "initialize"});
    await masterVault.deployed();
    let masterVaultImplementation = await upgrades.erc1967.getImplementationAddress(masterVault.address);
    console.log("masterVault    : " + masterVault.address);
    console.log("imp        : " + masterVaultImplementation);

    waitingPool = await upgrades.deployProxy(this.WaitingPool, [masterVault.address], {initializer: "initialize"});
    await waitingPool.deployed();
    let waitingPoolImplementation = await upgrades.erc1967.getImplementationAddress(waitingPool.address);
    console.log("waitingPool    : " + waitingPool.address);
    console.log("imp        : " + waitingPoolImplementation);

    await masterVault.setWaitingPool(waitingPool.address)
    
    console.log("Verifying MasterVault...");

    // Verify implementations

    await hre.run("verify:verify", {
        address: masterVaultImplementation,
    });

    await hre.run("verify:verify", {
        address: waitingPoolImplementation,
    });

    // Verify proxies

    await hre.run("verify:verify", {
        address: masterVault.address,
        constructorArguments: [
            "CEROS MATIC Vault Token", "ceMATIC", _maxDepositFee, _maxWithdrawalFee, _wMatic, _maxStrategies, _swapPool
        ],
    });

    await hre.run("verify:verify", {
        address: waitingPool.address,
        constructorArguments: [
            masterVault.address
        ],
    });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
