const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");

async function main() {

    // Variables Declaration
    let [deployer] = await ethers.getSigners();
    let ilkCeMatic = ethers.utils.formatBytes32String("ceMATIC");
    console.log("Ilk masterVault  :", ilkCeMatic);
    let masterVault = ""; // masterVault address

    // Contracts Fetching
    this.Vat = await hre.ethers.getContractFactory("Vat");
    this.Spot = await hre.ethers.getContractFactory("Spotter");
    this.Sikka = await hre.ethers.getContractFactory("Sikka");
    this.GemJoin = await hre.ethers.getContractFactory("GemJoin");
    this.SikkaJoin = await hre.ethers.getContractFactory("SikkaJoin");
    this.Jug = await hre.ethers.getContractFactory("Jug");
    this.Vow = await hre.ethers.getContractFactory("Vow");
    this.Dog = await hre.ethers.getContractFactory("Dog");
    this.Clip = await hre.ethers.getContractFactory("Clipper");
    this.Oracle = await hre.ethers.getContractFactory("Oracle"); // Mock Oracle
    this.Abacus = await hre.ethers.getContractFactory("LinearDecrease");

    // Contracts deployment
    const vat = await upgrades.deployProxy(this.Vat, [], {initializer: "initialize"});
    await vat.deployed();
    let vatImplementation = await upgrades.erc1967.getImplementationAddress(vat.address);
    console.log("Vat            :", vat.address);
    console.log("VatImp         :", vatImplementation)

    const spot = await this.Spot.deploy(vat.address);
    await spot.deployed();
    console.log("Spot           :", spot.address);

    const sikka = await this.Sikka.deploy(80001, "SIKKA");
    await sikka.deployed();
    console.log("Sikka          :", sikka.address);

    const sikkaJoin = await this.SikkaJoin.deploy(vat.address, sikka.address);
    await sikkaJoin.deployed();
    console.log("SikkaJoin      :", sikkaJoin.address);

    const ceaMATICcJoin = await this.GemJoin.deploy(vat.address, ilkCeMatic, masterVault);
    await ceaMATICcJoin.deployed();
    console.log("ceaMATICcJoin  :", ceaMATICcJoin.address);

    const jug = await this.Jug.deploy(vat.address);
    await jug.deployed();
    console.log("Jug            :", jug.address);

    const vow = await this.Vow.deploy(vat.address, ethers.constants.AddressZero, ethers.constants.AddressZero, deployer.address);
    await vow.deployed();
    console.log("Vow            :", vow.address);

    const dog = await this.Dog.deploy(vat.address);
    await dog.deployed();
    console.log("Dog            :", dog.address);

    const clip = await this.Clip.deploy(vat.address, spot.address, dog.address, ilkCeMatic);
    await clip.deployed();
    console.log("Clip           :", clip.address);

    const oracle = await this.Oracle.deploy();
    await oracle.deployed();
    console.log("Oracle         :", oracle.address);

    const abacus = await this.Abacus.deploy();
    await abacus.deployed();
    console.log("Abacus         :", abacus.address);

    console.log("Verifying Sikka...");

    // Verify implementations
    await hre.run("verify:verify", {
        address: vatImplementation,
    });
    await hre.run("verify:verify", {
        address: spot.address,
        constructorArguments: [vat.address],
    });
    await hre.run("verify:verify", {
        address: sikka.address,
        constructorArguments: [80001, "SIKKA"],
    });
    await hre.run("verify:verify", {
        address: sikkaJoin.address,
        constructorArguments: [vat.address, sikka.address],
    });
    await hre.run("verify:verify", {
        address: ceaMATICcJoin.address,
        constructorArguments: [vat.address, ilkCeMatic, masterVault],
    });
    await hre.run("verify:verify", {
        address: jug.address,
        constructorArguments: [vat.address],
    });
    await hre.run("verify:verify", {
        address: vow.address,
        constructorArguments: [vat.address, ethers.constants.AddressZero, ethers.constants.AddressZero, deployer.address],
    });
    await hre.run("verify:verify", {
        address: dog.address,
        constructorArguments: [vat.address]
    });
    await hre.run("verify:verify", {
        address: clip.address,
        constructorArguments: [vat.address, spot.address, dog.address, ilkCeMatic]
    });
    await hre.run("verify:verify", {
        address: oracle.address,
        constructorArguments: []
    });
    await hre.run("verify:verify", {
        address: abacus.address,
        constructorArguments: []
    });

    // Verify proxies
    await hre.run("verify:verify", {
        address: vat.address,
        constructorArguments: [],
    });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
