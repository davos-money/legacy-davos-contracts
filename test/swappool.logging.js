const ether = require('@openzeppelin/test-helpers/src/ether');
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { joinSignature } = require('ethers/lib/utils');
const { ethers, network } = require('hardhat');
const Web3 = require('web3');  

let swappool;

describe('===ForkPolygon===', function () {
    before(async function () {
        await network.provider.request({
            method: "hardhat_reset",
            params: [
            {
                forking: {
                jsonRpcUrl: "https://rpc.ankr.com/polygon",
                blockNumber: 39060940,
                },
            },
            ],
        });//0x262C485757a7DE2a1080E40D5Ae7aA5A47714B93

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0xe8e648e69df5386a053caa1ad2c6a8d460f70ee3"],
        });
        signer = await ethers.getSigner("0xe8e648e69df5386a053caa1ad2c6a8d460f70ee3")
        await network.provider.send("hardhat_setBalance", [
            "0xe8e648e69df5386a053caa1ad2c6a8d460f70ee3",
            "0x1000000000000000000000",
        ]);

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0x262C485757a7DE2a1080E40D5Ae7aA5A47714B93"],
        });
        signer1 = await ethers.getSigner("0x262C485757a7DE2a1080E40D5Ae7aA5A47714B93")
        await network.provider.send("hardhat_setBalance", [
            "0x262C485757a7DE2a1080E40D5Ae7aA5A47714B93",
            "0x1000000000000000000000",
        ]);
        
        // Load factories
        this.SwapPool = await hre.ethers.getContractFactory("SwapPool");

        // Attach contracts to addresses
        const PROXY_ADMIN_ABI = ["function upgrade(address a, address b) public"]
        let proxyAdmin = await ethers.getContractAt(PROXY_ADMIN_ABI, "0x2304CE6B42D505141A286B7382d4D515950b1890");
        sp = await this.SwapPool.deploy();
        await proxyAdmin.connect(signer).upgrade("0x62A509BA95c75Cabc7190469025E5aBeE4eDdb2a", sp.address);
        swappool = await ethers.getContractAt("SwapPool", "0x62A509BA95c75Cabc7190469025E5aBeE4eDdb2a");

        // Initialize
        await swappool.connect(signer).setFee(500 , 3); // stake. 500 = 0.5%
        await swappool.connect(signer).setFee(500, 4); // unstake
    });
    describe('===Logging', function () {
        it('tests getAmountOut/getAmountIn', async function () {
            this.timeout(1500000000);
            
            // console.log("---Liquidity");
            // console.log(await swappool.cerosTokenAmount());
            // console.log(await swappool.nativeTokenAmount());

            let amountIn = "5000000000000000003";

            console.log("--->getAmountOut");
            console.log("-without stake fee");
            console.log("use amountIn " + amountIn + " wei MATIC, will get " + await (await swappool.getAmountOut(true, amountIn, true)).amountOut);
            console.log("use amountIn " + amountIn + " wei aMATICc, will get " + await (await swappool.getAmountOut(false, amountIn, true)).amountOut);
            console.log("-with unstake fee");
            console.log("use amountIn " + amountIn + " wei MATIC, will get " + await (await swappool.getAmountOut(true, amountIn, false)).amountOut);
            console.log("use amountIn " + amountIn + " wei aMATICc, will get " + await (await swappool.getAmountOut(false, amountIn, false)).amountOut);

            let amountOut = "4515060374060494807";

            console.log("--->getAmountIn");
            console.log("-without unstake fee");
            console.log("want amountOut " + amountOut + " wei aMATICc, will need " + await (await swappool.getAmountIn(true, amountOut, true)).amountIn);
            console.log("want amountOut " + amountOut + " wei MATIC, will need " + await (await swappool.getAmountIn(false, amountOut, true)).amountIn);
            console.log("-with unstake fee");
            console.log("want amountOut " + amountOut + " wei aMATICc, will need " + await (await swappool.getAmountIn(true, amountOut, false)).amountIn);
            console.log("want amountOut " + amountOut + " wei MATIC, will need " + await (await swappool.getAmountIn(false, amountOut, false)).amountIn);
        });
    });
});