const hre = require("hardhat");
const {ethers} = require("hardhat");


const aMATICc = "0xaC32206a73C8406D74eB21cF7bd060bf841e64aD";
const wMatic = "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889";

const main = async () => {
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
    swapPool = await upgrades.deployProxy(SwapPool, [wMatic, aMATICc, lp.address, false, false], {initializer: "initialize"});
    await swapPool.deployed();
    let swapPoolImplementation = await upgrades.erc1967.getImplementationAddress(swapPool.address);
    console.log("swapPool: " + swapPool.address);
    console.log("imp        : " + swapPoolImplementation);

    // configure lp
    await lp.setSwapPool(swapPool.address);

    console.log("Verifying SwapPool...");
    // Verify implementations
    await hre.run("verify:verify", {
        address: swapPoolImplementation,
    });
    // Verify proxies
    await hre.run("verify:verify", {
        address: swapPool.address,
        constructorArguments: [
            wMatic, aMATICc, lp.address, false, false
        ],
    });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
