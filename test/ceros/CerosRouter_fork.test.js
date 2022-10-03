const { expect, assert } = require("chai");
const { ethers, waffle } = require("hardhat");
const web3 = require('web3');

const toBN = web3.utils.toBN;
const NetworkSnapshotter = require("../helpers/NetworkSnapshotter");


let owner, staker_1, staker_2, amount_1, amount_2, aMaticc,
    wmatic,ce_vault, ce_token, pool, ce_rot;


describe.skip('Ceros Router (Mumbai Fork)', () => {
    const networkSnapshotter = new NetworkSnapshotter();

    async function impersonateAccount(address) {
        await hre.network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [address],
        });
        let signer = await ethers.provider.getSigner(address);
        signer.address = signer._address;
        return signer;
    };
    
    before(async function () {
        await network.provider.request({
            method: "hardhat_reset",
            params: [
              {
                forking: {
                  jsonRpcUrl: "https://polygon-mumbai.g.alchemy.com/v2/1GHcSgGKjwi41E-mWkC_WaVood0AsXFV",
                  blockNumber: 27306175,
                },
              },
            ],
        });
        await init();
        staker_1 = await impersonateAccount("0x57f9672ba603251c9c03b36cabdbbca7ca8cfcf4");
        deployer = await impersonateAccount("0x57f9672ba603251c9c03b36cabdbbca7ca8cfcf4");

        await networkSnapshotter.firstSnapshot();
    });

    afterEach("revert", async () => await networkSnapshotter.revert());

    describe('Basic functionality', async () => {
        it.only('staker_1 deposits wMatic and claims profit(swap executed on uniswap-v3)', async () => {
            await aMaticc.connect(staker_1).approve(ce_rot.address, amount_1.toString());
            await wmatic.connect(staker_1).approve(ce_rot.address, amount_1.toString());
            await wmatic.connect(staker_1).deposit({value: amount_1.toString()});
            await ce_rot.connect(staker_1).depositWMatic(amount_1.toString());
            
            // check if swap was executed on Uniswap and staker_1 has earned profit
            const profits = await ce_rot.getProfitFor(staker_1.address);

            //claim profit
            const aMaticcBalanceBefore = await aMaticc.balanceOf(staker_1.address);
            await ce_rot.connect(staker_1).claimProfit(staker_1.address);
            const aMaticcBalanceAfter = await aMaticc.balanceOf(staker_1.address);
            
            // check aMaticc balance
            expect(aMaticcBalanceBefore.add(profits)).to.be.equal(aMaticcBalanceAfter);
        });
    });
});

async function init() {
    [owner, intermediary, bc_operator, staker_1, staker_2, operator] = await ethers.getSigners();
    let _dex=  "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        _dexPairFee=  "3000",
        _swapPool=  "0xFCC0937847030e91567c78a147e6e36F719Dc46b",
        _priceGetter=  "0x081CCd6331b816584F42cBAa09c556798F41fef7";
        // INIT
        ratio_1 = toBN(1e18);
        ratio_2 = toBN(1e17);
        ratio_3 = toBN(1e15);

        amount_1 = toBN('10000000020000000000');
        amount_2 = toBN('20000000020000000000');

    const SwapPoolFactory = await ethers.getContractFactory("SwapPool");
    pool = SwapPoolFactory.attach(_swapPool);
    /* ceToken */
    const CeToken = await ethers.getContractFactory("CeToken");
    ce_token = await CeToken.deploy();
    await ce_token.initialize("Ceros token", "ceAmaticc");

    const aMATICc = await ethers.getContractFactory("aMATICc");
    cerosToken = await aMATICc.attach("0xaC32206a73C8406D74eB21cF7bd060bf841e64aD");
    const WNativeFactory = await ethers.getContractFactory("WNative");
    wNative = await WNativeFactory.attach("0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889");


    /* wMATIC */
    wmatic = wNative;
    aMaticc = cerosToken;

    /* ceVault */
    const ceVault = await ethers.getContractFactory("CeVault");
    ce_vault = await ceVault.deploy();
    await ce_vault.initialize("CeVault", ce_token.address, aMaticc.address);
    // set vault for ceAMATICc
    await ce_token.changeVault(ce_vault.address);
    /* CeRot */
    const CeRot = await ethers.getContractFactory("CerosRouter");
    ce_rot = await upgrades.deployProxy(CeRot, [aMaticc.address, wmatic.address, ce_token.address, ce_vault.address, _dex, _dexPairFee, pool.address, _priceGetter], {initializer: "initialize"}, {gasLimit: 2000000});

    await ce_vault.changeRouter(ce_rot.address);
}
