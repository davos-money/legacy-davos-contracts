const { upgradeProxy , deployImplementatoin , verifyImpContract} = require("./utils/upgrade_utils");
let { upgrades } = require("hardhat");

const davosToken = "0x00658FC8ec685727F3F59d381B8Ad8f5E0FeDBc2";
const proxies = [
    // {
    //     name : "MasterVault",
    //     address : "0x764Ae6682DEB212a66f754dEe176901663C46554"
    // },
    // {
    //     name : "CerosYieldConverterStrategy",
    //     address : "0x55C9dd38733fd168d27F1ca68118515B2c6A29aE"
    // },
    // {
    //     name : "CerosRouter",
    //     address : "0xbB4E7E69aA9e918B6Ae51710cB6152E685553B1c"
    // },
    {
        name : "Interaction",
        address : "0x3F5F1B733ad75797962434992EE2F5A6b490DbEf"
    },
    {
        name : "WaitingPool",
        address : "0x1c539E755A1BdaBB168aA9ad60B31548991981F9"
    }
]


const verifyImp = [
    {
        name : "MasterVault",
        address : "0x764Ae6682DEB212a66f754dEe176901663C46554"
    },
    {
        name : "CerosYieldConverterStrategy",
        address : "0x55C9dd38733fd168d27F1ca68118515B2c6A29aE"
    },
    {
        name : "CerosRouter",
        address : "0xbB4E7E69aA9e918B6Ae51710cB6152E685553B1c"
    },
    {
        name : "Interaction",
        address : "0x3F5F1B733ad75797962434992EE2F5A6b490DbEf"
    },
    {
        name : "WaitingPool",
        address : "0x1c539E755A1BdaBB168aA9ad60B31548991981F9"
    },
    {
        name: "Jar",
        address: "0x4A20FE93DEc6e5b2d66c246EB7E8AB228254c03F"
    }
]


const main = async () => {

    // deploy jar
    // this.Jar = await hre.ethers.getContractFactory("Jar");

    // jar = await upgrades.deployProxy(this.Jar, ["Staked Davos", "sDAVOS", davosToken, "604800", "0", "5"], {initializer: "initialize"});
    // await jar.deployed();
    // jarImp = await upgrades.erc1967.getImplementationAddress(jar.address);
    // console.log("jar     : " + jar.address);
    // console.log("imp             : " + jarImp);

    for (const element of proxies) {

        let impAddress;
        // deploy Implementation
        if(element.name == "Interaction") {
            const AuctionProxy = await hre.ethers.getContractFactory("AuctionProxy");
            const auctionProxy = await AuctionProxy.deploy();
            await auctionProxy.deployed();
            const Interaction = await hre.ethers.getContractFactory(element.name, {
                unsafeAllow: ['external-library-linking'],
                libraries: {
                    AuctionProxy: auctionProxy.address
                }
            });
            interaction = await Interaction.deploy();
            await interaction.deployed();
            impAddress = interaction.address;
        } else {
            impAddress = await deployImplementatoin(element.name);
        }

        // upgrade Proxy
        await upgradeProxy(element.address, impAddress);
    }

    for (const element of verifyImp) {
        // verify imp
        console.log(`Verifying ${element.name} contract...`);
        const impAddress = await upgrades.erc1967.getImplementationAddress(element.address);
        await verifyImpContract(impAddress);
    }
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((err) => {
    console.log(err);
  });