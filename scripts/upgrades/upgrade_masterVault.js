const {ethers, upgrades} = require("hardhat");

const main = async () => {

  const admin_slot = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
  const masterVaultProxy = "0x764Ae6682DEB212a66f754dEe176901663C46554";
  const cerosStrategyProxy = "0x55C9dd38733fd168d27F1ca68118515B2c6A29aE";

  const proxyAddress = await ethers.provider.getStorageAt(masterVaultProxy, admin_slot);
  const PROXY_ADMIN_ABI = ["function upgrade(address proxy, address implementation) public"]
  
  // this.MasterVault = await hre.ethers.getContractFactory("MasterVault");
  // let masterVaultImp = await this.MasterVault.deploy();
  // await masterVaultImp.deployed();
  // console.log("Master Vault Imp     : " + masterVaultImp.address);

  // this.CerosYieldConverterStrategy = await hre.ethers.getContractFactory("CerosYieldConverterStrategy");
  // let cerosStrImp = await this.CerosYieldConverterStrategy.deploy();
  // await cerosStrImp.deployed();
  // console.log("Master Vault Imp     : " + cerosStrImp.address);

  let proxyAdmin = await ethers.getContractAt(PROXY_ADMIN_ABI, parseAddress(proxyAddress));
  await (await proxyAdmin.upgrade(masterVaultProxy, "0x99a5bc1524e1ceb75a205c3f02be9ac3ed042e63")).wait();
  await (await proxyAdmin.upgrade(cerosStrategyProxy, "0x6DeF4570251E1f435E121b3Ee47174496D851C99")).wait();
  console.log("Upgraded Successfully...")
  
  // console.log("Verifying MasterVaultImp...")
  // await hre.run("verify:verify", {address: masterVaultImp.address});
  
  // console.log("Verifying CerosStrategyImp...")
  // await hre.run("verify:verify", {address: cerosStrImp.address});
};

function parseAddress(addressString){
  const buf = Buffer.from(addressString.replace(/^0x/, ''), 'hex');
  if (!buf.slice(0, 12).equals(Buffer.alloc(12, 0))) {
    return undefined;
  }
  const address = '0x' + buf.toString('hex', 12, 32); // grab the last 20 bytes
  return ethers.utils.getAddress(address);
}

main()
  .then(() => {
    console.log("Success");
  })
  .catch((err) => {
    console.log(err);
  });