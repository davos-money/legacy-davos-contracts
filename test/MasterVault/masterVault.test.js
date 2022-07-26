const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const ethUtils = ethers.utils;

describe("MasterVault", function () {

  // Variables
  let masterVault, cerosStrategy, wMatic, aMaticc, swapPool ;

  let wMaticAddress = "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
      aMATICcAddress = "0xaC32206a73C8406D74eB21cF7bd060bf841e64aD",
      swapPoolAddress = "0xFCC0937847030e91567c78a147e6e36F719Dc46b",
      ceRouterAddress = "0xF42A1411197a4C09EDB9105461cAd3326A4181dA",
      maxDepositFee = 500000, 
      maxWithdrawalFee = 500000,
      maxStrategies = 10;

  async function getTokenBalance(account, token) {
    const tokenContract = await ethers.getContractAt("ERC20Upgradeable", token);
    return await tokenContract.balanceOf(account);
  }

  async function depositAndAllocate(masterVault, signer, depositAmount) {
    tx = await masterVault.connect(signer).depositETH({value: depositAmount});  
    await masterVault.allocate();
  }

  // Deploy and Initialize contracts
  beforeEach(async function () {
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

    accounts = await ethers.getSigners();
    deployer = accounts[0] //await getImpersonateSigner(unlockDeployer);
    signer1 =  accounts[1] //await getImpersonateSigner(unlockAccuont1);
    signer2 =  accounts[2] //await getImpersonateSigner(unlockAccount2);
    signer3 =  accounts[3] //await getImpersonateSigner(unlockAccount3);

    // Get Contracts
    MasterVault = await ethers.getContractFactory("MasterVault");
    CerosStrategy = await ethers.getContractFactory("CerosYieldConverterStrategy");
    WaitingPool = await ethers.getContractFactory("WaitingPool");
    CeRouter = await ethers.getContractFactory("CerosRouter");
    Token = await ethers.getContractFactory("Token");
    
    // Deploy Contracts
    wMatic = await Token.attach(wMaticAddress);
    aMaticc = await Token.attach(aMATICcAddress);
    ceRouter = await CeRouter.attach(ceRouterAddress);
    swapPool = await ethers.getContractAt("ISwapPool", swapPoolAddress);

    masterVault = await upgrades.deployProxy(
      MasterVault,
      ["CEROS MATIC Vault Token", "ceMATIC", maxDepositFee, maxWithdrawalFee, wMaticAddress, maxStrategies, swapPoolAddress]
    );
    await masterVault.deployed();
    
    waitingPool = await upgrades.deployProxy(WaitingPool,
      [masterVault.address]
      );
    await waitingPool.deployed();
    await masterVault.setWaitingPool(waitingPool.address);
    await masterVault.changeProvider(signer1.address)
    let destination = ceRouter.address,
        feeRecipient = deployer.address,
        underlyingToken = wMaticAddress,
        certToekn = aMATICcAddress,
        rewardsPool = deployer.address;
    cerosStrategy = await upgrades.deployProxy(CerosStrategy,
      [destination, feeRecipient, underlyingToken, ceRouter.address, certToekn, masterVault.address, rewardsPool, swapPoolAddress]
    );
    await cerosStrategy.deployed();
  });

  describe('Basic functionality', async () => {
    it("reverts:: Deposit 0 amount", async function () {
      await expect(
        masterVault
          .connect(signer1)
          .depositETH()
      ).to.be.revertedWith("invalid amount");
    });

    it("Deposit: valid amount", async function () {
      depositAmount = ethUtils.parseEther("1");
      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      receipt = await tx.wait(1);
      txFee = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount));
    });

    it("Deposit: wMatic balance of master vault should increase by deposit amount", async function () {
      depositAmount = ethUtils.parseEther("1");
      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address)
      wMaticTokenBalanceBefore = await getTokenBalance(masterVault.address, wMaticAddress)
      tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      receipt = await tx.wait(1);
      txFee = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      wMaticTokenBalanceAfter = await getTokenBalance(masterVault.address, wMaticAddress);
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount));
      assert.equal(wMaticTokenBalanceAfter.toString(), Number(wMaticTokenBalanceBefore) + Number(depositAmount));
    });

    it("Deposit: wMatic balance of master vault should increase by deposit amount(deposit fee: 0)", async function () {
      depositAmount = ethUtils.parseEther("1");
      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address)
      wMaticTokenBalanceBefore = await getTokenBalance(masterVault.address, wMaticAddress);
      tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      receipt = await tx.wait(1);
      txFee = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      wMaticTokenBalanceAfter = await getTokenBalance(masterVault.address, wMaticAddress);
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount));
      assert.equal(wMaticTokenBalanceAfter.toString(), Number(wMaticTokenBalanceBefore) + Number(depositAmount));
    });

    it("Deposit: totalsupply of master vault should increase by amount(deposit fee: 0)", async function () {
      depositAmount = ethUtils.parseEther("1");
      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address)
      wMaticTokenBalanceBefore = await getTokenBalance(masterVault.address, wMaticAddress);
      totalSupplyBefore = await masterVault.totalSupply()
      tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      receipt = await tx.wait(1);
      txFee = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      wMaticTokenBalanceAfter = await getTokenBalance(masterVault.address, wMaticAddress);
      totalSupplyAfter = await masterVault.totalSupply()

      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount));
      assert.equal(wMaticTokenBalanceAfter.toString(), Number(wMaticTokenBalanceBefore) + Number(depositAmount));
      assert.equal(totalSupplyAfter.toString(), Number(totalSupplyBefore) + Number(depositAmount));
    });

    it("Deposit: totalsupply of master vault should increase by amount(deposit fee: 0.1%)", async function () {
      let fee = 1000 // 0.1%
      depositAmount = ethUtils.parseEther("1");
      await masterVault
        .connect(deployer)
        .setDepositFee(fee);
      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address)
      wMaticTokenBalanceBefore = await getTokenBalance(masterVault.address, wMaticAddress)
      totalSupplyBefore = await masterVault.totalSupply()
      tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      receipt = await tx.wait(1);
      txFee = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      wMaticTokenBalanceAfter = await getTokenBalance(masterVault.address, wMaticAddress);
      totalSupplyAfter = await masterVault.totalSupply();
      feeEarned = await masterVault.feeEarned();

      assert.equal(wMaticTokenBalanceAfter.toString(), Number(wMaticTokenBalanceBefore) + Number(depositAmount));
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - Number((depositAmount * fee) / 1e6));
      assert.equal(totalSupplyAfter.toString(), Number(totalSupplyBefore) + Number(depositAmount) - Number((depositAmount * fee) / 1e6));
      assert.equal(feeEarned.toString(), Number((depositAmount * fee) / 1e6));
    });

    it("Allocate: wMatic balance should match allocation ratios", async function () {
      let depositAmount = ethUtils.parseEther("1");
          allocation = 80 * 10000   // 80%
      availableToWithdrawBefore = await masterVault.availableToWithdraw();
      tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      receipt = await tx.wait(1);
      
      await masterVault.setStrategy(cerosStrategy.address, allocation)
      await masterVault.allocate();
      availableToWithdrawAfter = await masterVault.availableToWithdraw();
      strategyDebt = await masterVault.strategyParams(cerosStrategy.address);

      assert.equal(depositAmount.toString(), Number(availableToWithdrawAfter) + Number(strategyDebt.debt));
    });

    it("Allocate: wMatic balance should match allocation ratios", async function () {
      depositAmount = ethUtils.parseEther("1");
      allocation = 80 * 10000   // 80%
      availableToWithdrawBefore = await masterVault.availableToWithdraw();
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await masterVault.connect(signer1).depositETH({value: depositAmount});
      await depositAndAllocate(masterVault, signer1, depositAmount);
      availableToWithdrawAfter = await masterVault.availableToWithdraw();
      strategyDebt = await masterVault.strategyParams(cerosStrategy.address);
      
      assert.equal(Number(depositAmount) + Number(depositAmount), Number(availableToWithdrawAfter) + Number(strategyDebt.debt));
    });

    it("Allocate: wMatic balance should match allocation ratios(deposit fee: 0.1%)", async function () {
      let fee = 1000 // 0.1%
      allocation = 80 * 10000   // 80%
      depositAmount = ethUtils.parseEther("1");
      await masterVault.connect(deployer).setDepositFee(fee);
      
      availableToWithdrawBefore = await masterVault.availableToWithdraw();
      
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await depositAndAllocate(masterVault, signer1, depositAmount);
      
      availableToWithdrawAfter = await masterVault.availableToWithdraw();
      strategyDebt = await masterVault.strategyParams(cerosStrategy.address);

      totalSupplyAfter = await masterVault.totalSupply();
      assert.equal(Number(depositAmount), Number(availableToWithdrawAfter) + Number(strategyDebt.debt) + Number((depositAmount * fee) / 1e6));
    });

    it("revert:: withdraw: should revert if withdrawal amount is more than vault-token balance(depositAmount)", async function () {
      depositAmount = ethUtils.parseEther("1");
      withdrawAmount = ethUtils.parseEther("1.1");
      await masterVault.connect(signer1).depositETH({value: depositAmount});
      await expect(masterVault.connect(signer1).withdrawETH(signer1.address, withdrawAmount)).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("withdraw: should let user withdraw (withdrawal fee: 0", async function () {
      depositAmount = ethUtils.parseEther("1");

      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      receipt = await tx.wait(1);
      txFee = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount));

      await masterVault.connect(signer1).withdrawETH(signer1.address, depositAmount);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);

      assert.equal(Number(vaultTokenBalanceAfter), 0);
    });
    
    it("withdraw: should let user withdraw (withdrawal fee: 0.1%)", async function () {
      let fee = 1000 // 0.1%
          depositAmount = ethUtils.parseEther("1");
      await masterVault.connect(deployer).setWithdrawalFee(fee);
      
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      receipt = await tx.wait(1);
      txFee1 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount));

      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      tx = await masterVault.connect(signer1).withdrawETH(signer1.address, depositAmount);
      receipt = await tx.wait(1);
      txFee2 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);

      swapFee = (depositAmount * await swapPool.unstakeFee()) / await swapPool.FEE_MAX();

      assert.equal(Number(vaultTokenBalanceAfter), 0);
      assert.equal(Number(maticBalanceAfter), Number(maticBalanceBefore) + Number(depositAmount) - Number(swapFee) - (Number(depositAmount) * fee / 1e16));
    });

    it("withdraw: should let user withdraw when funds are allocated to strategy (withdrawal fee: 0.1%)", async function () {
      let fee = 1000, // 0.1%
          allocation = 80 * 10000,   // 80%
          depositAmount = ethUtils.parseEther("1");
          withdrawalAmount = ethUtils.parseEther("0.99999");
      await masterVault.connect(deployer).setWithdrawalFee(fee);
      
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      // tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await depositAndAllocate(masterVault, signer1, depositAmount);

      // receipt = await tx.wait(1);
      // txFee1 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount));

      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      tx = await masterVault.connect(signer1).withdrawETH(signer1.address, withdrawalAmount);
      // receipt = await tx.wait(1);
      // txFee2 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);

      swapFee = (depositAmount * await swapPool.unstakeFee()) / await swapPool.FEE_MAX();

      assert.equal(Number(vaultTokenBalanceAfter), 0);
      assert.equal(Number(maticBalanceAfter), Number(maticBalanceBefore) + Number(depositAmount) - Number(swapFee) - (Number(depositAmount) * fee / 1e16));
    });


    it("withdraw: should let user withdraw (withdrawal fee: 0.1%)", async function () {
      let fee = 1000, // 0.1%
          allocation = 80 * 10000,   // 80%
          depositAmount = ethUtils.parseEther("1");
          withdrawalAmount = ethUtils.parseEther("0.99999");
      await masterVault.connect(deployer).setWithdrawalFee(fee);
      
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      // tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await depositAndAllocate(masterVault, signer1, depositAmount);

      // receipt = await tx.wait(1);
      // txFee1 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount));

      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      tx = await masterVault.connect(signer1).withdrawETH(signer1.address, withdrawalAmount);
      // receipt = await tx.wait(1);
      // txFee2 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);

      swapFee = (depositAmount * await swapPool.unstakeFee()) / await swapPool.FEE_MAX();

      assert.equal(Number(vaultTokenBalanceAfter), 0);
      assert.equal(Number(maticBalanceAfter), Number(maticBalanceBefore) + Number(depositAmount) - Number(swapFee) - (Number(depositAmount) * fee / 1e16));
    });

    describe("setters", async () => {
      it("revert:: setDepositFee(): cannot set more than max", async function () {
        let fee = 51 * 10000;
        await expect(
          masterVault
            .connect(deployer)
            .setDepositFee(fee)
        ).to.be.revertedWith("more than maxDepositFee");
      });

      it("revert:: setMaxDepositFee(): only owner can set", async function () {
        let fee = 51 * 10000;
        await expect(
          masterVault
            .connect(signer1)
            .setDepositFee(fee)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("setMaxDepositFee(): should let owner set new fee", async function () {
        let fee = 51 * 10000;
        await masterVault
            .connect(deployer)
            .setMaxDepositFee(fee);
        assert.equal(fee, await masterVault.maxDepositFee())
      });

      it("setDepositFee(): should let owner set new fee", async function () {
        let fee = 20 * 10000;
        await masterVault
            .connect(deployer)
            .setDepositFee(fee);
        assert.equal(fee, await masterVault.depositFee())
      });

      it("revert:: setWithdrawalFee(): cannot set more than max", async function () {
        let fee = 51 * 10000;
        await expect(
          masterVault
            .connect(deployer)
            .setWithdrawalFee(fee)
        ).to.be.revertedWith("more than maxWithdrawalFee");
      });

      it("revert:: setMaxWithdrawalFee(): only owner can set", async function () {
        let fee = 51 * 10000;
        await expect(
          masterVault
            .connect(signer1)
            .setMaxWithdrawalFee(fee)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("setMaxWithdrawalFee(): should let owner set new max fee", async function () {
        let fee = 51 * 10000;
        await masterVault
            .connect(deployer)
            .setMaxWithdrawalFee(fee);
        assert.equal(fee, await masterVault.maxWithdrawalFee())
      });

      it("setWithdrawalFee(): should let owner set new fee", async function () {
        let fee = 40 * 10000;
        await masterVault
            .connect(deployer)
            .setWithdrawalFee(fee);
        assert.equal(fee, await masterVault.withdrawalFee())
      });

      it("revert:: setWaitingPool(): cannot set zero address", async function () {
        await expect(
          masterVault
            .connect(deployer)
            .setWaitingPool(ethers.constants.AddressZero)
        ).to.be.revertedWith("");
      });

      it("revert:: setWaitingPool(): onlyOwner can call", async function () {
        await expect(
          masterVault
            .connect(signer1)
            .setWaitingPool(ethers.constants.AddressZero)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("setWaitingPool(): should let set new waiting pool", async function () {
        await masterVault
            .connect(deployer)
            .setWaitingPool(signer2.address)
        assert.equal(signer2.address, await masterVault.waitingPool())
      });

      it("revert:: addManager(): onlyOwner can call", async function () {
        await expect(
          masterVault
            .connect(signer1)
            .addManager(ethers.constants.AddressZero)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("revert:: addManager(): cannot set zero address", async function () {
        await expect(
          masterVault
            .connect(deployer)
            .addManager(ethers.constants.AddressZero)
        ).to.be.revertedWith("");
      });

      it("addManager(): should let add new manager", async function () {
        await masterVault
            .connect(deployer)
            .addManager(signer2.address)
        assert.equal(await masterVault.manager(signer2.address), true)
      });

      // it("revert:: removeManager(): cannot set zero address", async function () {
      //   await masterVault.setDepositFee(51* 10000)
      // });

      // it("revert:: changeProvider(): cannot set zero address", async function () {
      //   await masterVault.setDepositFee(51* 10000)
      // });

      // it("revert:: changeFeeReceiver(): cannot set zero address", async function () {
      //   await masterVault.setDepositFee(51* 10000)
      // });

      // it("revert:: changeStrategyAllocation(): cannot set zero address", async function () {
      //   await masterVault.setDepositFee(51* 10000)
      // });
    });
  });
});
