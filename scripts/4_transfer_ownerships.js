const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");
const {ether} = require("@openzeppelin/test-helpers");

async function main() {

  [deployer] = await ethers.getSigners();
  const PROXY_ADMIN_ABI = ["function transferOwnership(address newOwner) public"]

  /** Load Addresses */ 
  let {
    _ceamaticc, 
    _cevault, 
    _dmatic, 
    _cerosrouter,
    _davosprovider,
    _vat,
    _spot,
    _davos,
    _gemjoin,
    _davosjoin,
    _jug,
    _vow,
    _dog,
    _clip,
    _abaci,
    _dgtrewards,
    _auctionproxy,
    _interaction,
    _mastervault, // MasterVault == ceMATIC = Collateral Address
    _cerosyieldconverterstrategy,
    _swappool,
    _jar,
    _proxyadmin,
    _multisig
  } = require('./4_transfer_ownerships.json');

  /** Load factories */
  this.CeaMATICc = await hre.ethers.getContractFactory("CeToken");
  this.CeVault = await hre.ethers.getContractFactory("CeVault");
  this.DMatic = await hre.ethers.getContractFactory("dMATIC");
  this.CerosRouter = await hre.ethers.getContractFactory("CerosRouter");
  this.DavosProvider = await hre.ethers.getContractFactory("DavosProvider");
  this.Vat = await hre.ethers.getContractFactory("Vat");
  this.Spot = await hre.ethers.getContractFactory("Spotter");
  this.Davos = await hre.ethers.getContractFactory("Davos");
  this.GemJoin = await hre.ethers.getContractFactory("GemJoin");
  this.DavosJoin = await hre.ethers.getContractFactory("DavosJoin");
  this.Jug = await hre.ethers.getContractFactory("Jug");
  this.Vow = await hre.ethers.getContractFactory("Vow");
  this.Dog = await hre.ethers.getContractFactory("Dog");
  this.Clip = await hre.ethers.getContractFactory("Clipper");
  this.Abaci = await ethers.getContractFactory("LinearDecrease");
  this.DGTRewards = await hre.ethers.getContractFactory("DGTRewards");
  this.Interaction = await hre.ethers.getContractFactory("Interaction", {libraries: { AuctionProxy: _auctionproxy}});
  this.MasterVault = await hre.ethers.getContractFactory("MasterVault");
  this.CerosYieldConvertStrategy = await hre.ethers.getContractFactory("CerosYieldConverterStrategy");
  this.SwapPool = await hre.ethers.getContractFactory("SwapPool");
  this.Jar = await hre.ethers.getContractFactory("Jar");

  /** Attach contracts to addresses */ 
  let ceamaticc = await this.CeaMATICc.attach(_ceamaticc);
  let cevault = await this.CeVault.attach(_cevault);
  let dmatic = await this.DMatic.attach(_dmatic);
  let cerosrouter = await this.CerosRouter.attach(_cerosrouter);
  let davosprovider = await this.DavosProvider.attach(_davosprovider);
  let vat = await this.Vat.attach(_vat);
  let spot = await this.Spot.attach(_spot);
  let davos = await this.Davos.attach(_davos);
  let gemjoin = await this.GemJoin.attach(_gemjoin);
  let davosjoin = await this.DavosJoin.attach(_davosjoin);
  let jug = await this.Jug.attach(_jug);
  let vow = await this.Vow.attach(_vow);
  let dog = await this.Dog.attach(_dog);
  let clip = await this.Clip.attach(_clip);
  let abaci = await this.Abaci.attach(_abaci);
  let dgtrewards = await this.DGTRewards.attach(_dgtrewards);
  let interaction = await this.Interaction.attach(_interaction);
  let mastervault = await this.MasterVault.attach(_mastervault);
  let cerosyieldconverterstrategy = await this.CerosYieldConvertStrategy.attach(_cerosyieldconverterstrategy);
  let swappool = await this.SwapPool.attach(_swappool);
  let jar = await this.Jar.attach(_jar);
  let proxyadmin = await ethers.getContractAt(PROXY_ADMIN_ABI, _proxyadmin);

  /** Do transfer */
  // If the execution fails at some TX, you can safely comment out
  // previous TXs from that point for next execution.
  console.log("---------------------------");
  console.log("Initializing ownerships transfer...");

  console.log("--All relies to multisig");
  await (await vat.rely(_multisig)).wait();
  console.log("vat relied to            : " + _multisig);
  await (await spot.rely(_multisig)).wait();
  console.log("spot relied to           : " + _multisig);
  await (await davos.rely(_multisig)).wait();
  console.log("davos relied to          : " + _multisig);
  await (await gemjoin.rely(_multisig)).wait();
  console.log("gemjoin relied to        : " + _multisig);
  await (await davosjoin.rely(_multisig)).wait();
  console.log("davosjoin relied to      : " + _multisig);
  await (await jug.rely(_multisig)).wait();
  console.log("jug relied to            : " + _multisig);
  await (await vow.rely(_multisig)).wait();
  console.log("vow relied to            : " + _multisig);
  await (await dog.rely(_multisig)).wait();
  console.log("dog relied to            : " + _multisig);
  await (await clip.rely(_multisig)).wait();
  console.log("clip relied to           : " + _multisig);
  await (await abaci.rely(_multisig)).wait();
  console.log("abaci relied to          : " + _multisig);
  await (await dgtrewards.rely(_multisig)).wait();
  console.log("dgtrewards relied to     : " + _multisig);
  await (await interaction.rely(_multisig)).wait();
  console.log("interaction relied to    : " + _multisig);
  await (await jar.rely(_multisig)).wait();
  console.log("jar relied to            : " + _multisig);

  console.log("--All transferOwnership to multisig");
  await (await ceamaticc.transferOwnership(_multisig)).wait();
  console.log("ceamaticc transfered to  : " + _multisig);
  await (await cevault.transferOwnership(_multisig)).wait();
  console.log("cevault transfered to    : " + _multisig);
  await (await dmatic.transferOwnership(_multisig)).wait();
  console.log("dmatic transfered to     : " + _multisig);
  await (await cerosrouter.transferOwnership(_multisig)).wait();
  console.log("cerosrouter transfered to: " + _multisig);
  await (await davosprovider.transferOwnership(_multisig)).wait();
  console.log("davosprovider transfer to: " + _multisig);
  await (await mastervault.transferOwnership(_multisig)).wait();
  console.log("mastervault transfered to: " + _multisig);
  await (await cerosyieldconverterstrategy.transferOwnership(_multisig)).wait();
  console.log("cerosyieldconverterstrategy transfered to: " + _multisig);
  await (await swappool.transferOwnership(_multisig)).wait();
  console.log("swappool transfered to   : " + _multisig);
  await (await proxyadmin.transferOwnership(_multisig)).wait();
  console.log("proxyadmin transfered to : " + _multisig);

  // Risk alert.
  // We comment part below until we confirm every single 'rely' TX above,
  // Otherwise there is potential loss of ownership if we 'deny' before 'rely'.

  // console.log("--All denies to old owner");
  // await (await vat.deny(deployer.address)).wait();
  // console.log("vat denied to            : " + deployer.address);
  // await (await spot.deny(deployer.address)).wait();
  // console.log("spot denied to           : " + deployer.address);
  // await (await davos.deny(deployer.address)).wait();
  // console.log("davos denied to          : " + deployer.address);
  // await (await gemjoin.deny(deployer.address)).wait();
  // console.log("gemjoin denied to        : " + deployer.address);
  // await (await davosjoin.deny(deployer.address)).wait();
  // console.log("davosjoin denied to      : " + deployer.address);
  // await (await jug.deny(deployer.address)).wait();
  // console.log("jug denied to            : " + deployer.address);
  // await (await vow.deny(deployer.address)).wait();
  // console.log("vow denied to            : " + deployer.address);
  // await (await dog.deny(deployer.address)).wait();
  // console.log("dog denied to            : " + deployer.address);
  // await (await clip.deny(deployer.address)).wait();
  // console.log("clip denied to           : " + deployer.address);
  // await (await abaci.deny(deployer.address)).wait();
  // console.log("abaci denied to          : " + deployer.address);
  // await (await dgtrewards.deny(deployer.address)).wait();
  // console.log("dgtrewards denied to     : " + deployer.address);
  // await (await interaction.deny(deployer.address)).wait();
  // console.log("interaction denied to    : " + deployer.address);
  // await (await jar.deny(deployer.address)).wait();
  // console.log("jar denied to            : " + deployer.address);

  console.log("---------------------------");
  console.log("Ownerships transfer complete...");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });