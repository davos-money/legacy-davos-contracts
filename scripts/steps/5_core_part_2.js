let hre = require("hardhat");
let {ethers, upgrades} = require("hardhat");
const {BN, ether} = require("@openzeppelin/test-helpers");
const fs = require("fs");
const { poll } = require("ethers/lib/utils");

async function main() {

    // Signer
    [deployer] = await ethers.getSigners();
        
    // External Addresses
    let { _chainId, _dgtRewardsPoolLimitInEth, _multisig} = require(`../${hre.network.name}_config.json`);

    let _ilkCeMatic = ethers.utils.formatBytes32String("ceMATIC");

    let { dMatic} = require(`./mumbai_2addresses.json`);
    let { masterVault} = require(`./mumbai_3addresses.json`);
    let { vat, davosJoin, spot, davos} = require(`./mumbai_4addresses.json`);

    // Contracts Fetching
    this.DavosProvider = await hre.ethers.getContractFactory("DavosProvider");

    this.Vat = await hre.ethers.getContractFactory("Vat");
    this.Spot = await hre.ethers.getContractFactory("Spotter");
    this.Davos = await hre.ethers.getContractFactory("Davos");
    this.GemJoin = await hre.ethers.getContractFactory("GemJoin");
    this.DavosJoin = await hre.ethers.getContractFactory("DavosJoin");
    this.Oracle = await hre.ethers.getContractFactory("MaticOracle"); 
    this.Jug = await hre.ethers.getContractFactory("Jug");
    this.Vow = await hre.ethers.getContractFactory("Vow");
    this.Dog = await hre.ethers.getContractFactory("Dog");
    this.Clip = await hre.ethers.getContractFactory("Clipper");
    this.Abacus = await hre.ethers.getContractFactory("LinearDecrease");

    this.DgtToken = await hre.ethers.getContractFactory("DGTToken");
    this.DgtRewards = await hre.ethers.getContractFactory("DGTRewards");
    this.DgtOracle = await hre.ethers.getContractFactory("DGTOracle"); 
    
    this.AuctionProxy = await hre.ethers.getContractFactory("AuctionProxy");

    const auctionProxy = await this.AuctionProxy.deploy();
    await auctionProxy.deployed();
    this.Interaction = await hre.ethers.getContractFactory("Interaction", {
        unsafeAllow: ['external-library-linking'],
        libraries: {
            AuctionProxy: auctionProxy.address
        }
    });

    // Contracts deployment
    console.log("Core 2...");

    let jug = await upgrades.deployProxy(this.Jug, [vat], {initializer: "initialize"});
    await jug.deployed();
    jugImp = await upgrades.erc1967.getImplementationAddress(jug.address);
    console.log("Jug             :", jug.address);
    console.log("JugImp          :", jugImp);

    let vow = await upgrades.deployProxy(this.Vow, [vat, davosJoin, _multisig], {initializer: "initialize"});
    await vow.deployed();
    vowImp = await upgrades.erc1967.getImplementationAddress(vow.address);
    console.log("Vow             :", vow.address);
    console.log("VowImp          :", vowImp);

    let dog = await upgrades.deployProxy(this.Dog, [vat], {initializer: "initialize"});
    await dog.deployed();
    dogImpl = await upgrades.erc1967.getImplementationAddress(dog.address);
    console.log("Dog             :", dog.address);
    console.log("DogImp          :", dogImpl);

    let clip = await upgrades.deployProxy(this.Clip, [vat, spot, dog.address, _ilkCeMatic], {initializer: "initialize"});
    await clip.deployed();
    clipImp = await upgrades.erc1967.getImplementationAddress(clip.address);
    console.log("Clip            :", clip.address);
    console.log("ClipImp         :", clipImp);

    let rewards = await upgrades.deployProxy(this.DgtRewards, [vat, ether(_dgtRewardsPoolLimitInEth).toString(), "5"], {initializer: "initialize"});
    await rewards.deployed();
    rewardsImp = await upgrades.erc1967.getImplementationAddress(rewards.address);
    console.log("Rewards         :", rewards.address);
    console.log("Imp             :", rewardsImp);

    // // No Dgt Token & Oracle at the moment
    // let dgtOracle = await upgrades.deployProxy(this.DgtOracle, [_dgtOracleInitialPriceInWei], {initializer: "initialize"}) // 0.1
    // await dgtOracle.deployed();
    // dgtOracleImplementation = await upgrades.erc1967.getImplementationAddress(dgtOracle.address);
    // console.log("dgtOracle   :", dgtOracle.address);
    // console.log("Imp          :", dgtOracleImplementation);

    // // initial dgt token supply for rewards spending
    // let dgtToken = await upgrades.deployProxy(this.DgtToken, [ether(_dgtTokenRewardsSupplyinEth).toString(), rewards.address], {initializer: "initialize"});
    // await dgtToken.deployed();
    // dgtTokenImp = await upgrades.erc1967.getImplementationAddress(dgtToken.address);
    // console.log("dgtToken    :", dgtToken.address);
    // console.log("Imp          :", dgtTokenImp);
    
    // await dgtToken.rely(rewards.address);
    // await rewards.setDgtToken(dgtToken.address);
    // await rewards.setOracle(dgtOracle.address);
    // await rewards.initPool(masterVault.address, _ilkCeMatic, _rewardsRate, {gasLimit: 2000000}), //6%

    let interaction = await upgrades.deployProxy(this.Interaction, [vat, spot, davos, davosJoin, jug.address, dog.address, rewards.address], 
        {
            initializer: "initialize",
            unsafeAllowLinkedLibraries: true,
        }
    );
    await interaction.deployed();
    interactionImplAddress = await upgrades.erc1967.getImplementationAddress(interaction.address);
    console.log("interaction     : " + interaction.address);
    console.log("Imp             : " + interactionImplAddress);
    console.log("AuctionLib      : " + auctionProxy.address);

    let davosProvider = await upgrades.deployProxy(this.DavosProvider, [dMatic, masterVault, interaction.address], {initializer: "initialize"});
    await davosProvider.deployed();
    davosProviderImplementation = await upgrades.erc1967.getImplementationAddress(davosProvider.address);
    console.log("davosProvider   : " + davosProvider.address);
    console.log("imp             : " + davosProviderImplementation);

    // Store deployed addresses
    const addresses = {
        jug            : jug.address,
        jugImp         : jugImp,
        vow            : vow.address,
        vowImp         : vowImp,
        dog            : dog.address,
        dogImp         : dogImpl,
        clip           : clip.address,
        clipImp        : clipImp,
        rewards        : rewards.address,
        rewardsImp     : rewardsImp,
        interaction    : interaction.address,
        interactionImp : interactionImplAddress,
        auctionProxy   : auctionProxy.address,
        davosProvider  : davosProvider.address,
        davosProviderImp: davosProviderImplementation,
        ilk             : _ilkCeMatic,
    }

    const json_addresses = JSON.stringify(addresses);
    fs.writeFileSync(`./scripts/steps/${network.name}_5addresses.json`, json_addresses);
    console.log("5 Addresses Recorded to: " + `./scripts/steps/${network.name}_5addresses.json`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
});