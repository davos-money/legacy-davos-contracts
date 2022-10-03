const { expect, assert } = require("chai");
const { ethers, waffle } = require("hardhat");
const web3 = require('web3');
const ethUtils = ethers.utils;

const toBN = web3.utils.toBN;
const { constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");

let owner, staker_1, staker_2,
    amount_1, amount_2, ratio, available_yields, profit,
    aMaticc, amaticb, wmatic, ce_Amaticc_join, collateral, clip,
    ce_vault, ce_token, ce_dao, pool, ce_rot, auctionProxy;


describe('Ceros Router', () => {
    before(async function () {
        await init();
    });
    describe('Basic functionality', async () => {
        it('staker_1 deposits wMatic', async () => {
            console.log(`------- initial balances and supplies -------`);
            await printBalances();
            await aMaticc.connect(staker_1).approve(ce_rot.address, amount_1.toString());
            await wmatic.connect(staker_1).approve(ce_rot.address, amount_1.toString());
            await expect(
                ce_rot.connect(staker_1).depositWMatic("0")
            ).to.be.revertedWith("invalid deposit amount");
            await ce_token.changeVault(staker_1.address);
            await expect(
                ce_rot.connect(staker_1).depositWMatic(amount_1.toString())
                ).to.be.revertedWith("Minter: not allowed");
            await ce_token.changeVault(ce_vault.address);
            await ce_rot.connect(staker_1).depositWMatic(amount_1.toString());
            console.log(`------- balances and supplies after deposit 1 aMATICc-------`);
            await printBalances()
            // balance of staker_1 in cetoken should has increased
            assert.equal((await ce_token.balanceOf(staker_1.address)).toString(), amount_1.toString());
            // supply in vault
            assert.equal((await ce_token.totalSupply()).toString(), amount_1.toString());
        });
        it('claim yields for staker_1', async () => {
            // try to claim 0 rewards
            await expect(
                ce_rot.connect(staker_2).claim(staker_2.address)
            ).to.be.revertedWith("has not got yields to claim");
            // change ratio to have some yield
            await aMaticc.setRatio(ratio_2.toString());
            console.log(`------- balances after ratio has been changed -------`);
            await printBalances();
            // available_yields = (amount_1/ratio_2 - amount_1) in MATIC
            // available_yields * ratio_2 -> convert to aMATICc
            available_yields = amount_1.sub(amount_1.mul(ratio_2).div(toBN(1e18)));
            // claim to third address
            const yield = await ce_rot.getYieldFor(staker_1.address);
            assert.equal(
                yield.toString(),
                available_yields.toString()
            );
            await expect(
                ce_rot.connect(staker_1).claimProfit(intermediary.address)
            ).to.be.revertedWith("has not got a profit");
            await expect(
                ce_rot.connect(staker_1).claim(intermediary.address)
            ).to.emit(ce_rot, "Claim")
                .withArgs(intermediary.address, aMaticc.address, available_yields.toString());
            // check balance of the third address in certToken(aMATICc)
            assert.equal(
                (await aMaticc.balanceOf(intermediary.address)).toString(),
                available_yields.toString()
            );
            // amount of certToken in Vault should has been reduced
            assert.equal(
                (await aMaticc.balanceOf(ce_vault.address)).toString(),
                amount_1.sub(available_yields).toString()
            );
            console.log(`------- balance after yields have been claimed -------`);
            await printBalances();
        });
        it('staker_1 deposits 1 MATIC(via Staking Pool)', async () => {
            ratio = await aMaticc.ratio();
            const realAmount = (amount_1).mul(toBN(ratio)).div(toBN(1e18));

            await expect(
                ce_rot.connect(staker_1).deposit({ value: amount_1.toString() })
            ).to.emit(ce_rot, "Deposit")
                .withArgs(
                    staker_1.address,
                    wmatic.address,
                    realAmount.toString(),
                    '0'
                );

            // staker_1 receives amount in MATIC therefore:
            // to_receive = realAmount * 1e18 / ratio;
            assert.equal(
                (await ce_token.balanceOf(staker_1.address)).toString(),
                amount_1.add(realAmount.mul(toBN(1e18)).div(toBN(ratio))).toString()
            );
            console.log(`------- balance after staker_1 deposited 1 MATIC(Staking Pool) -------`);
            await printBalances();
        });
        it('staker_1 withdraws MATIC', async () => {

            await ce_rot.connect(staker_1).deposit({ value: amount_1.toString() })
            const balanceOfStaker_1_before = toBN(await ce_token.balanceOf(staker_1.address));
            const vaultSupply_before = toBN(await aMaticc.balanceOf(ce_vault.address));

            ratio = toBN(await aMaticc.ratio());
            const minAmount = (amount_1.div(toBN(2))).mul(ratio).div(toBN(1e18));
            
            await expect(
                await ce_rot.connect(staker_1).withdrawWithSlippage(staker_1.address, (amount_1.div(toBN(2))).toString(), minAmount.toString())
            ).to.emit(ce_rot, "Withdrawal")
                .withArgs(
                    staker_1.address,
                    staker_1.address,
                    wmatic.address,
                    amount_1.div(toBN(2)).toString()
                );
            
            // check supply in the CeVault
            assert.equal(
                (await aMaticc.balanceOf(ce_vault.address)).toString(),
                vaultSupply_before.sub(amount_1.div(toBN(2)).mul(ratio).div(toBN(1e18))).toString()
            );
            // check balance of staker_1 in MATIC and CeToken
            assert.equal(
                (await ce_token.balanceOf(staker_1.address)).toString(),
                balanceOfStaker_1_before.sub(amount_1.div(toBN(2))).toString()
            );
            console.log(`------- balance after staker_1 withdrawn MATIC(${amount_1.div(toBN(2)).toString()}) -------`);
            await printBalances();
        });
    });
    describe("Updating functionality", async () => {
        let example_address = "0xF92Ff9DBda8B780a9C7BC2d2b37db9D74D1BAcd6";
        it("change Provider", async () => {
            // try to update from not owner and waiting for a revert
            await expect(
                ce_rot.connect(staker_1).changeProvider(example_address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
            // update
            await ce_rot.connect(owner).changeProvider(example_address);
        });
        it('change Pool and verify allowances', async () => {
            // try to update from not owner and waiting for a revert
            await expect(
                ce_rot.connect(staker_1).changeSwapPool(example_address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
            // update
            await ce_rot.connect(owner).changeSwapPool(example_address);
            // check allowances for new Dao
            expect(
                await aMaticc.allowance(ce_rot.address, example_address)
            ).to.be.equal(constants.MAX_UINT256.toString());
            
            expect(await ce_rot.getPoolAddress()).to.be.equal(example_address);
            expect(await ce_rot.getWMaticAddress()).to.be.equal(wmatic.address);
            expect(await ce_rot.getCertToken()).to.be.equal(aMaticc.address);
        });
        it("change Dex and verify allowances", async () => {
            example_address = "0x66bea595aefd5a65799a920974b377ed20071118";
            // try to update from not owner and waiting for a revert
            await expect(
                ce_rot.connect(staker_1).changeDex(example_address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
            // update
            await ce_rot.connect(owner).changeDex(example_address);
            // check allowances for new Dao
            expect(
                await aMaticc.allowance(ce_rot.address, example_address)
            ).to.be.equal(constants.MAX_UINT256.toString());
            expect(
                await wmatic.allowance(ce_rot.address, example_address)
            ).to.be.equal(constants.MAX_UINT256.toString());
            assert.equal((await ce_rot.getDexAddress()), ethers.utils.getAddress(example_address))            
        });
        it("change vault and verify allowancesken", async () => {
            example_address = "0xcb0006b31e6b403feeec257a8abee0817bed7eba";
            // try to update from not owner and waiting for a revert
            await expect(
                ce_rot.connect(staker_1).changeVault(example_address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
            // update
            await ce_rot.connect(owner).changeVault(example_address);
            // check allowances for new vault
            expect(
                await aMaticc.allowance(ce_rot.address, example_address)
            ).to.be.equal(constants.MAX_UINT256.toString());
            // previous vault allowances should be rolled back to zero
            expect(
                await wmatic.allowance(ce_rot.address, ce_vault.address)
            ).to.be.equal('0');

            assert.equal((await ce_rot.getVaultAddress()), ethers.utils.getAddress(example_address))            
            assert.equal((await ce_rot.getCeToken()), ethers.utils.getAddress(ce_token.address))            
        });

        it("change price getter contract address", async () => {
            example_address = "0xcb0006b31e6b403feeec257a8abee0817bed7eba";
            // try to update from not owner and waiting for a revert
            await expect(
                ce_rot.connect(staker_1).changePriceGetter(example_address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
            // update
            await ce_rot.connect(owner).changePriceGetter(example_address);
        });

        it("change price getter contract address", async () => {
            example_fee = "3000";
            // try to update from not owner and waiting for a revert
            await expect(
                ce_rot.connect(staker_1).changePairFee(example_fee)
            ).to.be.revertedWith("Ownable: caller is not the owner");
            // update
            await ce_rot.connect(owner).changePairFee(example_fee);
        });

        
    });
});

async function deploySwapPool() {
    const { MaxUint256 } = ethers.constants;
    const mintAmount = ethUtils.parseEther("10000000");
    amount_1 = toBN('10000000020000000000');
    amount_2 = toBN('20000000020000000000');
    const addAmount = ethUtils.parseEther("30000");
  
    [deployer, user0, bc_operator, staker_1, staker_2, operator, user1] = await ethers.getSigners();
  
    const LPFactory = await ethers.getContractFactory("LP");
    const SwapPoolFactory = await ethers.getContractFactory("SwapPool");
    const WNativeFactory = await ethers.getContractFactory("WNative");
    const CerosTokenFactory = await ethers.getContractFactory("CerosToken");
  
    lp = await LPFactory.connect(deployer).deploy();
    await lp.deployed();
    wNative = await WNativeFactory.connect(deployer).deploy();
    await wNative.deployed();
    cerosToken = await CerosTokenFactory.connect(deployer).deploy();
    await cerosToken.deployed();
  
    swapPool = await upgrades.deployProxy(
      SwapPoolFactory,
      [wNative.address,
      cerosToken.address,
      lp.address,
      false,
      false],
      {initializer: "initialize"}
    );
    await swapPool.deployed();

    await cerosToken.setRatio(ratio_1.toString());
  
    await wNative.connect(user1).deposit({ value: mintAmount });
    await wNative.connect(user0).deposit({ value: mintAmount });
    await cerosToken.connect(user1).mintMe(mintAmount);

    await wNative.connect(user1).approve(swapPool.address, MaxUint256);
    await cerosToken.connect(user1).approve(swapPool.address, MaxUint256);

    await wNative.connect(staker_1).deposit({ value: mintAmount });
    await cerosToken.connect(staker_1).mintMe(mintAmount);

    await wNative.connect(staker_2).deposit({ value: mintAmount });
    await cerosToken.connect(staker_2).mintMe(mintAmount);

    // await swapPool.setFee(100, 3);
    // await swapPool.setFee(100, 4);

    // Initialize Contracts
    await lp.setSwapPool(swapPool.address);
    await swapPool.connect(user1).addLiquidity(addAmount, addAmount);
    return [swapPool, wNative, cerosToken];
  } 

async function init() {
    [owner, intermediary, bc_operator, staker_1, staker_2, operator] = await ethers.getSigners();

        // INIT
        ratio_1 = toBN(1e18);
        ratio_2 = toBN(1e17);
        ratio_3 = toBN(1e15);
    
        amount_1 = toBN('10000000020000000000');
        amount_2 = toBN('20000000020000000000');

    let [pool, wNative, cerosToken] = await deploySwapPool();
    /* ceToken */
    const CeToken = await ethers.getContractFactory("CeToken");
    ce_token = await CeToken.deploy();
    await ce_token.initialize("Ceros token", "ceAmaticc");

    const aMATICc = await ethers.getContractFactory("aMATICc");
    aMaticc = await aMATICc.deploy();

    /* wMATIC */
    wmatic = wNative;
    aMaticc = cerosToken;

    await aMaticc.setRatio(ratio_1.toString());

    /* ceVault */
    const ceVault = await ethers.getContractFactory("CeVault");
    ce_vault = await ceVault.deploy();
    await ce_vault.initialize("CeVault", ce_token.address, aMaticc.address);
    // set vault for ceAMATICc
    await ce_token.changeVault(ce_vault.address);
    /* CeRot */
    const CeRot = await ethers.getContractFactory("CerosRouter");
    ce_rot = await upgrades.deployProxy(CeRot, [aMaticc.address, wmatic.address, ce_token.address, ce_vault.address, owner.address, 3000, pool.address, ZERO_ADDRESS], {initializer: "initialize"}, {gasLimit: 2000000});

    await ce_vault.changeRouter(ce_rot.address);
}

async function printBalances() {
    matic_balance = await waffle.provider.getBalance(staker_1.address);
    console.log(`MATIC balance(staker_1): ${matic_balance.toString()}`);
    // aMATICc balance of staker_1
    console.log(`balance of staker_1 in aMATICc: ${(await aMaticc.balanceOf(staker_1.address)).toString()}`);
    // aMATICc balance of ce_vault
    console.log(`balance of CeVault in aMATICc: ${(await aMaticc.balanceOf(ce_vault.address)).toString()}`);
    // ceToken balance of staker_1
    console.log(`balance of staker_1 in ceToken: ${(await ce_token.balanceOf(staker_1.address)).toString()}`);
    // ceToken supply
    console.log(`supply ceToken: ${(await ce_token.totalSupply()).toString()} `);
    // Available rewards
    console.log(`yield for staker_1: ${(await ce_vault.getYieldFor(staker_1.address)).toString()}`);
    console.log(`current ratio: ${(await aMaticc.ratio()).toString()}`);
}
