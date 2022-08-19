const hre = require("hardhat");

async function main() {

    // Variables Declaration
    let priceGetter;
    let { _dexFactory } = require(`./${hre.network.name}_config.json`);    
    // Contracts Fetching
    this.PriceGetter = await hre.ethers.getContractFactory("PriceGetter");

    priceGetter = await this.PriceGetter.deploy(_dexFactory);
    await priceGetter.deployed();
    console.log("priceGetter  : " + priceGetter.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
