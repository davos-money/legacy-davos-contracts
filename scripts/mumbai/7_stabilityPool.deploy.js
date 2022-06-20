const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");

async function main() {

    // Variables Declaration
    let [deployer] = await ethers.getSigners();
    let colander, 
        colanderRewards; 
    // External Addresses
    let _stablecoin = "0x261Ad62E384578bEF703982030a135A1bb29B869", 
        _interaction = "0xA95a37bC9302CCD8484e14D2a6EEEeCF552E3165",
        _spotter = "0xdC647cDAaF05eDBAA4e68Ae071AfF7b0aff0A279",
        _dex = "0x709161f832DEB5d3b4DB004bDe851914a0BeA5e8";

    let wad = "000000000000000000", // 18 Decimals
        ray = "000000000000000000000000000"; // 27 Decimals

    // Contracts Fetching
    this.Colander = await hre.ethers.getContractFactory("Colander");
    this.colanderRewards = await hre.ethers.getContractFactory("ColanderRewards");
    
    // Contracts deployment and initialization
    colander = await upgrades.deployProxy(this.Colander, ["Colander Pool Token", "cSIKKA", _stablecoin, _interaction, _spotter, _dex, ethers.constants.AddressZero], {initializer: "initialize"});
    await colander.deployed();
    let colanderImplementation = await upgrades.erc1967.getImplementationAddress(colander.address);
    console.log("Colander   : " + colander.address);
    console.log("imp        : " + colanderImplementation);

    colanderRewards = await upgrades.deployProxy(this.colanderRewards, [_stablecoin, colander.address, "3600", "60"]);
    await colanderRewards.deployed();
    let colanderRewardsImplementation = await upgrades.erc1967.getImplementationAddress(colanderRewards.address);
    console.log("Rewards    : " + colanderRewards.address);
    console.log("imp        : " + colanderRewardsImplementation);

    await colander.connect(deployer).setProfitRange("5" + ray);
    await colander.connect(deployer).setPriceImpact("2" + wad);
    await colander.connect(deployer).setRewards(colanderRewards.address);

    console.log("Verifying Ceros...");

    // Verify implementations
    await hre.run("verify:verify", {
        address: colanderImplementation,
    });
    await hre.run("verify:verify", {
        address: colanderRewardsImplementation,
    });

    // Verify proxies
    await hre.run("verify:verify", {
        address: colander.address,
        constructorArguments: [
            "Colander Pool Token", "cSIKKA", _stablecoin, _interaction, _spotter, _dex, colanderRewards.address
        ],
    });
    await hre.run("verify:verify", {
        address: colanderRewards.address,
        constructorArguments: [
            _stablecoin, colander.address, "3600", "60"
        ],
    });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
