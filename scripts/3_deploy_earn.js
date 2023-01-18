let hre = require("hardhat");
let {ethers, upgrades} = require("hardhat");
const {BN, ether} = require("@openzeppelin/test-helpers");
const fs = require("fs");
const { poll } = require("ethers/lib/utils");

async function main() {

    // Constant Addresses
    let davos = "0xEC38621e72D86775a89C7422746de1f52bbA5320",
    operator = "0x57F9672bA603251C9C03B36cabdBBcA7Ca8Cfcf4",
    exitDelay = "0", // 0 Days
    spread = "604800", // 7 Days
    flashLoanDelay = "5"; // 5 Seconds

    // Script variables
    let jar;

    // Contracts Fetching
    this.Jar = await hre.ethers.getContractFactory("Jar");

    // Jar Deployment
    console.log("Jar...") 

    jar = await upgrades.deployProxy(this.Jar, ["StakedDavos", "sDAVOS", davos, spread, exitDelay, flashLoanDelay], {initializer: "initialize"});
    await jar.deployed();
    let jarImplementation = await upgrades.erc1967.getImplementationAddress(jar.address);
    console.log("Deployed: jar        : " + jar.address);
    console.log("Imp                  : " + jarImplementation);

    // Jar Init
    await jar.addOperator(operator);

    // Verify
    await hre.run("verify:verify", {address: jarImplementation});

}
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
});