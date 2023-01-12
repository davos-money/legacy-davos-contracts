const hre = require("hardhat");
const fs = require("fs");
const {ethers, upgrades} = require("hardhat");
const {ether} = require("@openzeppelin/test-helpers");

const network_file_name = `${network.name}_addresses.json`;

const {
    ceaMATICc,
    ceaMATICcImp,
    ceVault,
    ceVaultImp,
    dMatic,
    dMaticImp,
    cerosRouter,
    cerosRouterImp,
    masterVault,
    masterVaultImp,
    waitingPool,
    waitingPoolImp,
    cerosYieldStr,
    cerosYieldConverterStrategyImp,
    vat,
    vatImp,
    spot,
    spotImp,
    davos,
    davosImp,
    davosJoin,
    davosJoinImp,
    gemJoin,
    gemJoinImp,
    jug,
    jugImp,
    vow,
    vowImp,
    dog,
    dogImp,
    clip,
    clipImp,
    oracle,
    abacus,
    abacusImp,
    rewards,
    rewardsImp,
    dgtToken,
    dgtTokenImp,
    auctionProxy,
    davosProviderImp
} = require('./' + network_file_name);

async function main() {

    // // Verify all implementations
    await hre.run("verify:verify", {address: ceaMATICcImp});
    await hre.run("verify:verify", {address: ceVaultImp});
    await hre.run("verify:verify", {address: dMaticImp});
    await hre.run("verify:verify", {address: cerosRouterImp});
    await hre.run("verify:verify", {address: masterVaultImp});
    await hre.run("verify:verify", {address: waitingPoolImp});
    await hre.run("verify:verify", {address: cerosYieldConverterStrategyImp});
    await hre.run("verify:verify", {address: vatImp});
    await hre.run("verify:verify", {address: spotImp});
    await hre.run("verify:verify", {address: davosImp});
    await hre.run("verify:verify", {address: davosJoinImp});
    await hre.run("verify:verify", {address: gemJoinImp});
    await hre.run("verify:verify", {address: jugImp});
    await hre.run("verify:verify", {address: vowImp});
    await hre.run("verify:verify", {address: dogImp});
    await hre.run("verify:verify", {address: clipImp});
    await hre.run("verify:verify", {address: oracle});
    await hre.run("verify:verify", {address: abacusImp});
    await hre.run("verify:verify", {address: rewardsImp});
    await hre.run("verify:verify", {address: interactionImp});
    await hre.run("verify:verify", {address: auctionProxy});
    await hre.run("verify:verify", {address: davosProviderImp});
    await hre.run("verify:verify", {address: priceGetter});
    await hre.run("verify:verify", {address: LPImp});
    await hre.run("verify:verify", {address: swapPoolImplementation});
    // await hre.run("verify:verify", {address: dgtTokenImp});   
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });