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
  let _nonce = await ethers.provider.getTransactionCount(deployer.address);

  console.log("--All relies to multisig");
  await (await vat.rely(_multisig, {nonce: _nonce})).wait();
  console.log("vat relied to            : " + _multisig);
  await (await spot.rely(_multisig, {nonce: _nonce})).wait();
  console.log("spot relied to           : " + _multisig);
  await (await davos.rely(_multisig, {nonce: _nonce})).wait();
  console.log("davos relied to          : " + _multisig);
  await (await gemjoin.rely(_multisig, {nonce: _nonce})).wait();
  console.log("gemjoin relied to        : " + _multisig);
  await (await davosjoin.rely(_multisig, {nonce: _nonce})).wait();
  console.log("davosjoin relied to      : " + _multisig);
  await (await jug.rely(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("jug relied to            : " + _multisig);
  await (await vow.rely(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("vow relied to            : " + _multisig);
  await (await dog.rely(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("dog relied to            : " + _multisig);
  await (await clip.rely(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("clip relied to           : " + _multisig);
  await (await abaci.rely(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("abaci relied to          : " + _multisig);
  await (await dgtrewards.rely(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("dgtrewards relied to     : " + _multisig);
  await (await interaction.rely(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("interaction relied to    : " + _multisig);
  await (await jar.rely(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("jar relied to            : " + _multisig);

  console.log("--All transferOwnership to multisig");
  await (await ceamaticc.transferOwnership(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("ceamaticc transfered to  : " + _multisig);
  await (await cevault.transferOwnership(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("cevault transfered to    : " + _multisig);
  await (await dmatic.transferOwnership(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("dmatic transfered to     : " + _multisig);
  await (await cerosrouter.transferOwnership(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("cerosrouter transfered to: " + _multisig);
  await (await davosprovider.transferOwnership(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("davosprovider transfer to: " + _multisig);
  await (await mastervault.transferOwnership(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("mastervault transfered to: " + _multisig);
  await (await cerosyieldconverterstrategy.transferOwnership(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("cerosyieldconverterstrategy transfered to: " + _multisig);
  await (await swappool.transferOwnership(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("swappool transfered to   : " + _multisig);
  await (await proxyadmin.transferOwnership(_multisig, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("proxyadmin transfered to : " + _multisig);

  console.log("---------------------------");
  console.log("Ownerships transfer complete...");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });