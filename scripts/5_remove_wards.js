const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");
const {ether} = require("@openzeppelin/test-helpers");

async function main() {

  [deployer] = await ethers.getSigners();

  /** Load Addresses */ 
  let {
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
    _jar
  } = require('./4_transfer_ownerships.json');

  /** Load factories */
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
  this.Jar = await hre.ethers.getContractFactory("Jar");

  /** Attach contracts to addresses */ 
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
  let jar = await this.Jar.attach(_jar);

  /** Do remove */
  // If the execution fails at some TX, you can safely comment out
  // previous TXs from that point for next execution.
  console.log("---------------------------");
  console.log("Initializing removal of wards...");
  let _nonce = await ethers.provider.getTransactionCount(deployer.address);

  // Risk alert.
  // Make sure, '4_transfer_ownerships.js' is run successfully.
  // Otherwise, a 'deny' before 'rely' can potentially set null ownership.

  console.log("--All denies to old owner");
  await (await vat.deny(deployer.address, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("vat denied to            : " + deployer.address);
  await (await spot.deny(deployer.address, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("spot denied to           : " + deployer.address);
  await (await davos.deny(deployer.address, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("davos denied to          : " + deployer.address);
  await (await gemjoin.deny(deployer.address, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("gemjoin denied to        : " + deployer.address);
  await (await davosjoin.deny(deployer.address, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("davosjoin denied to      : " + deployer.address);
  await (await jug.deny(deployer.address, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("jug denied to            : " + deployer.address);
  await (await vow.deny(deployer.address, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("vow denied to            : " + deployer.address);
  await (await dog.deny(deployer.address, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("dog denied to            : " + deployer.address);
  await (await clip.deny(deployer.address, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("clip denied to           : " + deployer.address);
  await (await abaci.deny(deployer.address, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("abaci denied to          : " + deployer.address);
  await (await dgtrewards.deny(deployer.address, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("dgtrewards denied to     : " + deployer.address);
  await (await interaction.deny(deployer.address, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("interaction denied to    : " + deployer.address);
  await (await jar.deny(deployer.address, {nonce: _nonce})).wait(); _nonce += 1;
  console.log("jar denied to            : " + deployer.address);

  console.log("---------------------------");
  console.log("Wards removal complete...");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });