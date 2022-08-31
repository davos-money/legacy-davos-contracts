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
    sMatic,
    sMaticImp,
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
    sikka,
    sikkaImp,
    sikkaJoin,
    sikkaJoinImp,
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
    ikkaToken,
    ikkaTokenImp,
    auctionProxy,
    sikkaProviderImp
} = require('./' + network_file_name);

async function main() {

    // // Verify all implementations
    await hre.run("verify:verify", {address: ceaMATICcImp});
    await hre.run("verify:verify", {address: ceVaultImp});
    await hre.run("verify:verify", {address: sMaticImp});
    await hre.run("verify:verify", {address: cerosRouterImp});
    await hre.run("verify:verify", {address: masterVaultImp});
    await hre.run("verify:verify", {address: waitingPoolImp});
    await hre.run("verify:verify", {address: cerosYieldConverterStrategyImp});
    await hre.run("verify:verify", {address: vatImp});
    await hre.run("verify:verify", {address: spotImp});
    await hre.run("verify:verify", {address: sikkaImp});
    await hre.run("verify:verify", {address: sikkaJoinImp});
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
    await hre.run("verify:verify", {address: sikkaProviderImp});
    await hre.run("verify:verify", {address: priceGetter});
    await hre.run("verify:verify", {address: LPImp});
    await hre.run("verify:verify", {address: swapPoolImplementation});
    // await hre.run("verify:verify", {address: ikkaTokenImp});   
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });