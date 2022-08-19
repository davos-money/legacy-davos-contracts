const hre = require("hardhat");
const {ethers} = require("hardhat");

const main = async () => {
    let { _aMATICc , _wMatic , _swapPoolManager , _swapPool_stakeFee, _swapPool_unstakeFee , _maticPool } = require(`./${hre.network.name}_config.json`);
    let lp, swapPool;
    const SwapPool = await ethers.getContractFactory("SwapPool");
    const LP = await ethers.getContractFactory("LP");

    // deploy LP
    lp = await upgrades.deployProxy(LP, ["aMATICcLP", "aMATICcLP"], {initializer: "initialize"});
    await lp.deployed();
    let lpImplementation = await upgrades.erc1967.getImplementationAddress(lp.address);
    console.log("lp  : " + lp.address);
    console.log("imp        : " + lpImplementation);

    // deploy swap pool
    swapPool = await upgrades.deployProxy(SwapPool, [_wMatic, _aMATICc, lp.address, false, false], {initializer: "initialize"});
    await swapPool.deployed();
    let swapPoolImplementation = await upgrades.erc1967.getImplementationAddress(swapPool.address);
    console.log("swapPool: " + swapPool.address);
    console.log("imp        : " + swapPoolImplementation);

    // configure lp
    await (await lp.setSwapPool(swapPool.address)).wait();
    await (await swapPool.add(_swapPoolManager, 0)).wait();
    await (await swapPool.setFee(_swapPool_stakeFee , 3)).wait();
    await (await swapPool.setFee(_swapPool_unstakeFee, 4)).wait();
    await (await swapPool.setMaticPool(_maticPool)).wait();

    console.log("Verifying SwapPool...");
    // Verify implementations
    await hre.run("verify:verify", {
        address: swapPoolImplementation,
    });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
