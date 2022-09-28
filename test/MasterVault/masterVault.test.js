const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const ethUtils = ethers.utils;
const NetworkSnapshotter = require("../helpers/NetworkSnapshotter");

async function deploySwapPool() {
  const { MaxUint256 } = ethers.constants;
  const mintAmount = ethUtils.parseEther("10000000");
  const addAmount = ethUtils.parseEther("30");

  [deployer, user1] = await ethers.getSigners();

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

  await wNative.connect(user1).deposit({ value: mintAmount });
  await cerosToken.connect(user1).mintMe(mintAmount);

  await wNative.connect(user1).approve(swapPool.address, MaxUint256);
  await cerosToken.connect(user1).approve(swapPool.address, MaxUint256);
  
  await cerosToken.setRatio(ethUtils.parseEther("0.6"));
  
  await swapPool.setFee(100, 3);
  await swapPool.setFee(100, 4);
  // Initialize Contracts
  await lp.setSwapPool(swapPool.address);
  await swapPool.connect(user1).addLiquidity(addAmount, addAmount);
  return [swapPool, wNative, cerosToken];
} 

describe("MasterVault", function () {

  // Variables
  let masterVault, cerosStrategy, wMatic, aMaticc, swapPool,
      destination, feeRecipient , underlyingToken , certToekn, wNative, cerosToken;

  let wMaticAddress = "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
      aMATICcAddress = "0xaC32206a73C8406D74eB21cF7bd060bf841e64aD",
      swapPoolAddress = "0x149372728fC852E6A724C59CDfB41dF0799fe042",
      ceRouterAddress = "0x5E990e6aA10d224bF45def8A55E41c39Ea087682",
      dex = "0xE592427A0AEce92De3Edee1F18E0157C05861564", 
      dexPairFee = 3000,
      // priceGetterAddress = "0xc82e5792F393a1D90681773B75d7a408010ade2c",
      priceGetterAddress = ethers.constants.AddressZero,
      maxDepositFee = 500000, 
      maxWithdrawalFee = 500000,
      maxStrategies = 10,
      waitingPoolCapLimit = 10;

  async function getTokenBalance(account, token) {
    const tokenContract = await ethers.getContractAt("ERC20Upgradeable", token);
    return await tokenContract.balanceOf(account);
  }

  async function depositAndAllocate(masterVault, signer, depositAmount) {
    tx = await masterVault.connect(signer).depositETH({value: depositAmount});  
    await masterVault.allocate();
  }

  async function impersonateAccount(address) {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [address],
    });
    let signer = await ethers.provider.getSigner(address);
    signer.address = signer._address;
    return signer;
  };

  const networkSnapshotter = new NetworkSnapshotter();

  // Deploy and Initialize contracts
  before(async function () {

    accounts = await ethers.getSigners();
    deployer = accounts[0];
    signer1 =  accounts[1];
    // deployer = await impersonateAccount("0x57f9672ba603251c9c03b36cabdbbca7ca8cfcf4");
    // signer1 = await impersonateAccount("0x57f9672ba603251c9c03b36cabdbbca7ca8cfcf4");
    signer2 =  accounts[2];
    signer3 =  accounts[3];

    [swapPool, wNative, cerosToken] = await deploySwapPool();
    wMaticAddress = wNative.address
    aMATICcAddress = cerosToken.address
    swapPoolAddress = swapPool.address

    // Get Contracts
    MasterVault = await ethers.getContractFactory("MasterVault");
    CerosStrategy = await ethers.getContractFactory("CerosYieldConverterStrategy");
    WaitingPool = await ethers.getContractFactory("WaitingPool");
    CeRouter = await ethers.getContractFactory("CerosRouter");
    Token = await ethers.getContractFactory("Token");
    CeaMATICc = await hre.ethers.getContractFactory("CeToken");
    CeVault = await hre.ethers.getContractFactory("CeVault");
    PriceGetter = await hre.ethers.getContractFactory("PriceGetter");
    
    // Deploy Contracts
    wMatic = await Token.attach(wMaticAddress);
    aMaticc = await Token.attach(aMATICcAddress);
    swapPool = await ethers.getContractAt("SwapPool", swapPoolAddress);
    // ceRouter = await CeRouter.attach(ceRouterAddress);
    
    priceGetter = await PriceGetter.deploy(dex);
    await priceGetter.deployed();

    ceaMATICc = await upgrades.deployProxy(CeaMATICc, ["CEROS aMATICc Vault Token", "ceaMATICc"], {initializer: "initialize"});
    await ceaMATICc.deployed();

    ceVault = await upgrades.deployProxy(CeVault, ["CEROS aMATICc Vault", ceaMATICc.address, aMATICcAddress], {initializer: "initialize"});
    await ceVault.deployed();
    ceVaultImp = await upgrades.erc1967.getImplementationAddress(ceVault.address);

    cerosRouter = await upgrades.deployProxy(CeRouter, [aMATICcAddress, wMaticAddress, ceaMATICc.address, ceVault.address, dex, dexPairFee, swapPool.address, priceGetterAddress], {initializer: "initialize"}, {gasLimit: 2000000});
    await cerosRouter.deployed();
    cerosRouterImp = await upgrades.erc1967.getImplementationAddress(cerosRouter.address);

    await ceaMATICc.changeVault(ceVault.address);
    await ceVault.changeRouter(cerosRouter.address);

    masterVault = await upgrades.deployProxy(
      MasterVault,
      ["CEROS MATIC Vault Token", "ceMATIC", maxDepositFee, maxWithdrawalFee, wMaticAddress, maxStrategies, swapPoolAddress]
    );
    await masterVault.deployed();
    waitingPool = await upgrades.deployProxy(WaitingPool,
      [masterVault.address, waitingPoolCapLimit]
      );
    await waitingPool.deployed();
    await masterVault.setWaitingPool(waitingPool.address);
    await masterVault.changeProvider(signer1.address)
      destination = cerosRouter.address,
      feeRecipient = deployer.address,
      underlyingToken = wMaticAddress,
      certToekn = aMATICcAddress;
      // rewardsPool = deployer.address;
    cerosStrategy = await upgrades.deployProxy(CerosStrategy,
      [destination, feeRecipient, underlyingToken, certToekn, masterVault.address, swapPoolAddress]
    );
    await cerosStrategy.deployed();
    await networkSnapshotter.firstSnapshot();
  });

  afterEach("revert", async () => await networkSnapshotter.revert());

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
      swapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - swapFee);
    });

    it("Deposit: valid amount(when swapFee is set in swapPool)", async function () {
      depositAmount = ethUtils.parseEther("1");
      await swapPool.setFee(0, 3);
      await swapPool.setFee(0, 4);
      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      receipt = await tx.wait(1);
      txFee = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      swapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - swapFee);
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
      swapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - swapFee);
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
      swapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - swapFee);
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
      totalSupplyAfter = await masterVault.totalSupply();
      swapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();


      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - swapFee);
      assert.equal(wMaticTokenBalanceAfter.toString(), Number(wMaticTokenBalanceBefore) + Number(depositAmount));
      assert.equal(totalSupplyAfter.toString(), Number(totalSupplyBefore) + Number(depositAmount) - swapFee);
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
      swapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(wMaticTokenBalanceAfter.toString(), Number(wMaticTokenBalanceBefore) + Number(depositAmount));
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - swapFee - Number(((Number(depositAmount) - swapFee) * fee) / 1e6));
      assert.equal(totalSupplyAfter.toString(), Number(totalSupplyBefore) + Number(depositAmount) - swapFee - Number(((Number(depositAmount) - swapFee) * fee) / 1e6));
      assert.equal(feeEarned.toString(), Number(((depositAmount - swapFee) * fee) / 1e6));
    });

    it("Allocate: wMatic balance should match allocation ratios", async function () {
      let depositAmount = ethUtils.parseEther("1");
          allocation = 80 * 10000   // 80%
      availableToWithdrawBefore = await masterVault.availableToWithdraw();
      tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      receipt = await tx.wait(1);
      
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await masterVault.allocate();
      availableToWithdrawAfter = await masterVault.availableToWithdraw();
      strategyDebt = await masterVault.strategyParams(cerosStrategy.address);
      swapFee = (((depositAmount * allocation) / 1e6 ) * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(depositAmount.toString(), Number(availableToWithdrawAfter) + Number(strategyDebt.debt) + swapFee);
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
      swapFee = ((((Number(depositAmount) + Number(depositAmount)) * allocation) / 1000000 ) * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(Number(depositAmount) + Number(depositAmount), Number(availableToWithdrawAfter) + Number(strategyDebt.debt) + swapFee);
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

      let swapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      let depositFee = (Number(depositAmount - swapFee) * fee) / 1e6;
      let depositedAmount = Number(depositAmount) - swapFee -depositFee;
      assert.equal(Number(totalSupplyAfter), depositedAmount);

      swapFee = ((((depositAmount - depositFee) * allocation) / 1000000) * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(Number(depositAmount), Number(availableToWithdrawAfter) + Number(strategyDebt.debt) + swapFee + depositFee);
    });

    it("revert:: withdraw: should revert if withdrawal amount is more than vault-token balance(depositAmount)", async function () {
      depositAmount = ethUtils.parseEther("1");
      withdrawAmount = ethUtils.parseEther("1.1");
      await masterVault.connect(signer1).depositETH({value: depositAmount});
      await expect(masterVault.connect(signer1).withdrawETH(signer1.address, withdrawAmount)).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("withdraw: should let user withdraw (withdrawal fee: 0)", async function () {
      depositAmount = ethUtils.parseEther("1");

      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      receipt = await tx.wait(1);
      txFee = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      swapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - swapFee);
      await masterVault.connect(signer1).withdrawETH(signer1.address, (depositAmount - swapFee).toString());
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);

      assert.equal(Number(vaultTokenBalanceAfter), 0);
    });

    it("withdrawFromStrategy(): should let owner withdraw from strategy", async function () {
      depositAmount = ethUtils.parseEther("1");
      allocation = 80 * 10000   // 80%
      availableToWithdrawBefore = await masterVault.availableToWithdraw();
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await masterVault.connect(signer1).depositETH({value: depositAmount});
      await depositAndAllocate(masterVault, signer1, depositAmount);
      availableToWithdrawAfter = await masterVault.availableToWithdraw();
      strategyDebt = await masterVault.strategyParams(cerosStrategy.address);
      swapFee = ((((Number(depositAmount) + Number(depositAmount)) * allocation) / 1000000 ) * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(Number(depositAmount) + Number(depositAmount), Number(availableToWithdrawAfter) + Number(strategyDebt.debt) + swapFee);

      await masterVault.withdrawFromStrategy(cerosStrategy.address, strategyDebt.debt);
      strategyDebt = await masterVault.strategyParams(cerosStrategy.address);
      assert.equal(Number(strategyDebt.debt), 0);
    });

    it("revert:: withdrawFromStrategy(): only owner can withdraw from strategy", async function () {
      depositAmount = ethUtils.parseEther("1");
      allocation = 80 * 10000   // 80%
      availableToWithdrawBefore = await masterVault.availableToWithdraw();
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await masterVault.connect(signer1).depositETH({value: depositAmount});
      await depositAndAllocate(masterVault, signer1, depositAmount);
      availableToWithdrawAfter = await masterVault.availableToWithdraw();
      strategyDebt = await masterVault.strategyParams(cerosStrategy.address);
      swapFee = ((((Number(depositAmount) + Number(depositAmount)) * allocation) / 1000000 ) * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(Number(depositAmount) + Number(depositAmount), Number(availableToWithdrawAfter) + Number(strategyDebt.debt) + swapFee);
      
      await expect(
        masterVault
        .connect(signer1)
        .withdrawFromStrategy(cerosStrategy.address, strategyDebt.debt)
        ).to.be.revertedWith("Manager: not allowed");
    });

    it("revert:: withdrawFromStrategy(): only owner can withdraw from strategy", async function () {
      depositAmount = ethUtils.parseEther("1");
      allocation = 80 * 10000   // 80%
      availableToWithdrawBefore = await masterVault.availableToWithdraw();
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await masterVault.connect(signer1).depositETH({value: depositAmount});
      await depositAndAllocate(masterVault, signer1, depositAmount);
      availableToWithdrawAfter = await masterVault.availableToWithdraw();
      strategyDebt = await masterVault.strategyParams(cerosStrategy.address);
      swapFee = ((((Number(depositAmount) + Number(depositAmount)) * allocation) / 1000000 ) * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(Number(depositAmount) + Number(depositAmount), Number(availableToWithdrawAfter) + Number(strategyDebt.debt) + swapFee);
      
      await expect(
        masterVault
        .withdrawFromStrategy(cerosStrategy.address, 0)
        ).to.be.revertedWith("invalid withdrawal amount");
    });

    it("revert:: withdrawFromStrategy(): only owner can withdraw from strategy", async function () {
      depositAmount = ethUtils.parseEther("1");
      allocation = 80 * 10000   // 80%
      availableToWithdrawBefore = await masterVault.availableToWithdraw();
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await masterVault.connect(signer1).depositETH({value: depositAmount});
      await depositAndAllocate(masterVault, signer1, depositAmount);
      availableToWithdrawAfter = await masterVault.availableToWithdraw();
      strategyDebt = await masterVault.strategyParams(cerosStrategy.address);
      swapFee = ((((Number(depositAmount) + Number(depositAmount)) * allocation) / 1000000 ) * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(Number(depositAmount) + Number(depositAmount), Number(availableToWithdrawAfter) + Number(strategyDebt.debt) + swapFee);
      
      await expect(
        masterVault
        .withdrawFromStrategy(cerosStrategy.address, strategyDebt.debt + 1000)
        ).to.be.revertedWith("insufficient assets in strategy");
    });

    it("withdrawAllFromStrategy(): should let owner withdraw all from strategy", async function () {
      depositAmount = ethUtils.parseEther("1");
      allocation = 80 * 10000   // 80%
      availableToWithdrawBefore = await masterVault.availableToWithdraw();
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await masterVault.connect(signer1).depositETH({value: depositAmount});
      await depositAndAllocate(masterVault, signer1, depositAmount);
      availableToWithdrawAfter = await masterVault.availableToWithdraw();
      strategyDebt = await masterVault.strategyParams(cerosStrategy.address);
      swapFee = ((((Number(depositAmount) + Number(depositAmount)) * allocation) / 1000000 ) * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(Number(depositAmount) + Number(depositAmount), Number(availableToWithdrawAfter) + Number(strategyDebt.debt) + swapFee);

      await masterVault.withdrawAllFromStrategy(cerosStrategy.address);
      strategyDebt = await masterVault.strategyParams(cerosStrategy.address);
      assert.equal(Number(strategyDebt.debt), 0);
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
      swapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - swapFee);

      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      let withdrawAmount = depositAmount - swapFee;
      tx = await masterVault.connect(signer1).withdrawETH(signer1.address, (withdrawAmount).toString());
      receipt = await tx.wait(1);
      txFee2 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);

      swapFee = (withdrawAmount * await swapPool.unstakeFee()) / await swapPool.FEE_MAX();
      
      let event = (receipt.events?.filter((x) => {return x.event == "Withdraw"}));
      assert.equal(event[0].args.shares, withdrawAmount - swapFee - (Number(withdrawAmount - swapFee) * fee / 1e6));
      // assert.equal(Number(maticBalanceAfter), Number(maticBalanceBefore) + Number(event[0].args.shares) - txFee2);
      expect(maticBalanceAfter.eq(maticBalanceBefore.add(event[0].args.shares).sub(txFee2)));

    });

    it("withdraw: should let user withdraw when funds are allocated to strategy (withdrawal fee: 0.1%)", async function () {
      let fee = 1000, // 0.1%
          allocation = 80 * 10000,   // 80%
          depositAmount = ethUtils.parseEther("1");
          // withdrawalAmount = ethUtils.parseEther("1");
      await masterVault.connect(deployer).setWithdrawalFee(fee);
      
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      // tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await depositAndAllocate(masterVault, signer1, depositAmount);

      // receipt = await tx.wait(1);
      // txFee1 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      swapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - swapFee);

      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      let withdrawAmount = depositAmount - swapFee;
      let wethBal = await masterVault.totalAssetInVault();
      
      tx = await masterVault.connect(signer1).withdrawETH(signer1.address, withdrawAmount.toString());
      let receipt = await tx.wait(1);
      txFee2 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);

      swapFee = (withdrawAmount * await swapPool.unstakeFee()) / await swapPool.FEE_MAX();
      
      let event = (receipt.events?.filter((x) => {return x.event == "Withdraw"}));
      assert.equal(Number(event[0].args.shares), withdrawAmount - swapFee - (Number(withdrawAmount - swapFee) * fee / 1e6));
      assert.equal(Number(vaultTokenBalanceAfter), 0);
      // assert.equal(Number(maticBalanceAfter), Number(maticBalanceBefore) + Number(event[0].args.shares) - txFee2);
      expect(maticBalanceAfter, maticBalanceBefore.add(event[0].args.shares).sub(txFee2));
    });

    it("withdrawFee: should let user withdraw when funds are allocated to strategy (withdrawal fee: 0.1%)", async function () {
      let fee = 1000, // 0.1%
          allocation = 80 * 10000,   // 80%
          depositAmount = ethUtils.parseEther("1");
          // withdrawalAmount = ethUtils.parseEther("1");
      await masterVault.connect(deployer).setWithdrawalFee(fee);
      
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      // tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await depositAndAllocate(masterVault, signer1, depositAmount);

      // receipt = await tx.wait(1);
      // txFee1 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      swapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - swapFee);

      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      let withdrawAmount = depositAmount - swapFee;
      let wethBal = await masterVault.totalAssetInVault();
      
      tx = await masterVault.connect(signer1).withdrawETH(signer1.address, withdrawAmount.toString());
      let receipt = await tx.wait(1);
      txFee2 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);

      swapFee = (withdrawAmount * await swapPool.unstakeFee()) / await swapPool.FEE_MAX();
      
      let event = (receipt.events?.filter((x) => {return x.event == "Withdraw"}));
      assert.equal(Number(event[0].args.shares), withdrawAmount - swapFee - (Number(withdrawAmount - swapFee) * fee / 1e6));
      assert.equal(Number(vaultTokenBalanceAfter), 0);
      assert.equal(Number(maticBalanceAfter), Number(maticBalanceBefore) + Number(event[0].args.shares) - txFee2);

      maticBalanceBefore = await ethers.provider.getBalance(deployer.address);
      feeEarned = await masterVault.feeEarned();
      assert.equal(feeEarned, (Number(withdrawAmount - swapFee) * fee / 1e6))
      
      tx = await masterVault.withdrawFee();
      receipt = await tx.wait(1);
      txFee3 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      
      maticBalanceAfter = await ethers.provider.getBalance(deployer.address);
      assert.equal(Number(maticBalanceAfter), Number(maticBalanceBefore.add(feeEarned).sub(txFee3)));
    });


    it("withdraw: should let user withdraw (withdrawal fee: 0.1%)", async function () {
      let fee = 1000, // 0.1%
          allocation = 80 * 10000,   // 80%
          depositAmount = ethUtils.parseEther("1");
      await masterVault.connect(deployer).setWithdrawalFee(fee);
      
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      // tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await depositAndAllocate(masterVault, signer1, depositAmount);

      // receipt = await tx.wait(1);
      // txFee1 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);
      swapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      let withdrawalAmount = depositAmount - swapFee;
      assert.equal(vaultTokenBalanceAfter.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - swapFee);

      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      tx = await masterVault.connect(signer1).withdrawETH(signer1.address, withdrawalAmount.toString());
      receipt = await tx.wait(1);
      txFee2 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);

      swapFee = (depositAmount * await swapPool.unstakeFee()) / await swapPool.FEE_MAX();

      assert.equal(Number(vaultTokenBalanceAfter), 0);
      // assert.equal(Number(maticBalanceAfter), Number(maticBalanceBefore) + Number(depositAmount) - Number(swapFee) - (Number(depositAmount) * fee / 1e6) - txFee2);
      expect(maticBalanceAfter.eq(maticBalanceBefore.add(depositAmount).sub(swapFee).sub(depositAmount.mul(fee).div(ethers.BigNumber.from("1000000"))).sub(txFee2)));
    });

    it("withdraw: withdrawal request should go to the waiting pool(withdrawal fee: 0)", async function () {
      let allocation = 80 * 10000,   // 80%
          depositAmount = ethUtils.parseEther("6");
          withdrawalAmount = ethUtils.parseEther("5");
      
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      // tx = await masterVault.connect(signer1).depositETH({value: depositAmount});
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await depositAndAllocate(masterVault, signer1, depositAmount);

      // receipt = await tx.wait(1);
      // txFee1 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      vaultTokenBalanceAfterDeposit = await getTokenBalance(signer1.address, masterVault.address);
      swapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(vaultTokenBalanceAfterDeposit.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - swapFee);

      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      await swapPool.connect(signer1).swap(false, ethUtils.parseEther("20"), signer1.address);
      await masterVault.connect(signer1).withdrawETH(signer1.address, withdrawalAmount);
      // receipt = await tx.wait(1);
      // txFee2 = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);

      waitingPoolBalance = await ethers.provider.getBalance(waitingPool.address);
      pendingWithdrawal = await waitingPool.people(0);
      unstakeSwapFee = (withdrawalAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();

      assert.equal(Number(vaultTokenBalanceAfter), Number(depositAmount) - Number(withdrawalAmount) - swapFee);
      assert.equal(Number(pendingWithdrawal[1]), Number(withdrawalAmount) - unstakeSwapFee);
      assert.equal(Number(waitingPoolBalance), Number(depositAmount) / 5 );
    });

    it("payDebt: should pay the pending withdrawal (withdrawal fee: 0)", async function () {
      let allocation = 80 * 10000,   // 80%
          depositAmount = ethUtils.parseEther("6");
          withdrawalAmount = ethUtils.parseEther("5");
      
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await depositAndAllocate(masterVault, signer1, depositAmount);

      vaultTokenBalanceAfterDeposit = await getTokenBalance(signer1.address, masterVault.address);
      depositSwapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(vaultTokenBalanceAfterDeposit.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - depositSwapFee);

      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      await swapPool.connect(signer1).swap(false, ethUtils.parseEther("20"), signer1.address);
      await masterVault.connect(signer1).withdrawETH(signer1.address, withdrawalAmount);
      
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);

      withdrawSwapFee = (withdrawalAmount * await swapPool.unstakeFee()) / await swapPool.FEE_MAX();
      pendingWithdrawal = await waitingPool.people(0);
     
      assert.equal(pendingWithdrawal[0], signer1.address);
      assert.equal(Number(pendingWithdrawal[1]), Number(withdrawalAmount) - withdrawSwapFee);
      assert.equal(Number(vaultTokenBalanceAfter), Number(depositAmount) - Number(withdrawalAmount) - depositSwapFee);
      poolBalanceBefore = await waitingPool.getPoolBalance()
      await masterVault.connect(signer1).depositETH({value: withdrawalAmount});
      poolBalanceAfter = await waitingPool.getPoolBalance()
      expect(poolBalanceAfter.gt(poolBalanceBefore));
      balanceOfWithdrawerBefore = await ethers.provider.getBalance(signer1.address)
      await masterVault.connect(signer2).payDebt();
      balanceOfWithdrawerAfter = await ethers.provider.getBalance(signer1.address)

      assert(Number(balanceOfWithdrawerAfter) > Number(balanceOfWithdrawerBefore));
    });

    it("payDebt: should pay the pending withdrawal (withdrawal fee: 0)", async function () {
      let allocation = 80 * 10000,   // 80%
          depositAmount = ethUtils.parseEther("6");
          withdrawalAmount = ethUtils.parseEther("5");
      
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await depositAndAllocate(masterVault, signer1, depositAmount);

      vaultTokenBalanceAfterDeposit = await getTokenBalance(signer1.address, masterVault.address);
      depositSwapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(vaultTokenBalanceAfterDeposit.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - depositSwapFee);

      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      await swapPool.connect(signer1).swap(false, ethUtils.parseEther("20"), signer1.address);
      await masterVault.connect(signer1).withdrawETH(signer1.address, withdrawalAmount);
      
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);

      withdrawSwapFee = (withdrawalAmount * await swapPool.unstakeFee()) / await swapPool.FEE_MAX();
      pendingWithdrawal = await waitingPool.people(0);
     
      assert.equal(pendingWithdrawal[0], signer1.address);
      assert.equal(Number(pendingWithdrawal[1]), Number(withdrawalAmount) - withdrawSwapFee);
      assert.equal(Number(vaultTokenBalanceAfter), Number(depositAmount) - Number(withdrawalAmount) - depositSwapFee);
      // poolBalanceBefore = await waitingPool.getPoolBalance()
      // await masterVault.connect(signer1).payDebt({value: withdrawalAmount});
      // poolBalanceAfter = await waitingPool.getPoolBalance()
      // expect(poolBalanceAfter.gt(poolBalanceBefore));
      await swapPool.connect(user1).addLiquidity(ethUtils.parseEther("30"), ethUtils.parseEther("30"));
      balanceOfWithdrawerBefore = await ethers.provider.getBalance(signer1.address)
      await expect(masterVault.connect(signer2).payDebt())
        .to.emit(waitingPool, "WithdrawCompleted")
        .withArgs(signer1.address, withdrawalAmount.sub(ethers.BigNumber.from(withdrawSwapFee)))

      balanceOfWithdrawerAfter = await ethers.provider.getBalance(signer1.address)

      expect(balanceOfWithdrawerAfter.gt(balanceOfWithdrawerBefore));
    });

    it("revert:: waitingPool: withdrawUnsettled(): cannot withdraw already settled debt", async function () {
      let allocation = 80 * 10000,   // 80%
          depositAmount = ethUtils.parseEther("6");
          withdrawalAmount = ethUtils.parseEther("5");
      
      vaultTokenBalanceBefore = await getTokenBalance(signer1.address, masterVault.address);
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await depositAndAllocate(masterVault, signer1, depositAmount);

      vaultTokenBalanceAfterDeposit = await getTokenBalance(signer1.address, masterVault.address);
      depositSwapFee = (depositAmount * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(vaultTokenBalanceAfterDeposit.toString(), Number(vaultTokenBalanceBefore) + Number(depositAmount) - depositSwapFee);

      maticBalanceBefore = await ethers.provider.getBalance(signer1.address);
      await swapPool.connect(signer1).swap(false, ethUtils.parseEther("20"), signer1.address);
      await masterVault.connect(signer1).withdrawETH(signer1.address, withdrawalAmount);
      
      maticBalanceAfter = await ethers.provider.getBalance(signer1.address);
      vaultTokenBalanceAfter = await getTokenBalance(signer1.address, masterVault.address);

      withdrawSwapFee = (withdrawalAmount * await swapPool.unstakeFee()) / await swapPool.FEE_MAX();
      pendingWithdrawal = await waitingPool.people(0);
     
      assert.equal(pendingWithdrawal[0], signer1.address);
      assert.equal(Number(pendingWithdrawal[1]), Number(withdrawalAmount) - withdrawSwapFee);
      assert.equal(Number(vaultTokenBalanceAfter), Number(depositAmount) - depositSwapFee - Number(withdrawalAmount));

      await masterVault.connect(signer1).depositETH({value: withdrawalAmount});
      balanceOfWithdrawerBefore = await ethers.provider.getBalance(signer1.address)
      await masterVault.connect(signer2).payDebt();
      balanceOfWithdrawerAfter = await ethers.provider.getBalance(signer1.address)

      assert(Number(balanceOfWithdrawerAfter) > Number(balanceOfWithdrawerBefore));

      await expect(
        waitingPool
          .connect(signer1)
          .withdrawUnsettled(0)
      ).to.be.revertedWith("already settled");
    });

    it("retireStrat(): should withdraw all the assets from given strategy", async function () {
      let depositAmount = ethUtils.parseEther("1"),
          allocation = 80 * 10000;
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await depositAndAllocate(masterVault, signer1, depositAmount);

      totalDebtBefore = await masterVault.totalDebt();
      await masterVault.retireStrat(cerosStrategy.address);
      totalDebtAfter = await masterVault.totalDebt();
      strategyParams = await masterVault.strategyParams(cerosStrategy.address);

      assert.equal(Number(totalDebtAfter), 0)
      assert.equal(strategyParams[0], false)
    });

    it("retireStrat(): should mark strategy inactive if debt is less than 10", async function () {
      let depositAmount = ethUtils.parseEther("1"),
          allocation = 80 * 10000;
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await depositAndAllocate(masterVault, signer1, depositAmount);

      await masterVault.withdrawAllFromStrategy(cerosStrategy.address);

      totalDebtBefore = await masterVault.totalDebt();
      assert.equal(Number(totalDebtBefore), 0)

      await masterVault.retireStrat(cerosStrategy.address);
      totalDebtAfter = await masterVault.totalDebt();
      strategyParams = await masterVault.strategyParams(cerosStrategy.address);

      assert.equal(Number(totalDebtAfter), 0)
      assert.equal(strategyParams[0], false)
    });

    it("migrateStrategy(): should withdraw all the assets from given strategy", async function () {
      let depositAmount = ethUtils.parseEther("1"),
          allocation = 80 * 10000,
          newAllocation = 50 * 10000;

      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await depositAndAllocate(masterVault, signer1, depositAmount);

      newStrategy = await upgrades.deployProxy(CerosStrategy,
        [destination, feeRecipient, underlyingToken, certToekn, masterVault.address, swapPoolAddress]
      );
      await newStrategy.deployed();

      totalDebtBefore = await masterVault.totalDebt();
      swapFee = ((totalDebtBefore)* await swapPool.unstakeFee()) / await swapPool.FEE_MAX();
      await masterVault.migrateStrategy(cerosStrategy.address, newStrategy.address, newAllocation);
      totalDebtAfter = await masterVault.totalDebt();
      assert.equal(Number(totalDebtAfter), 0);
      let assetInVault = await masterVault.totalAssetInVault();
      await masterVault.allocate();
      totalDebtAfter = await masterVault.totalDebt();
      stakeSwapFee = ((assetInVault/2) * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
      assert.equal(Number(totalDebtAfter), (assetInVault / 2) - stakeSwapFee);
    });

    it("depositAllToStrategy(): should deposit all the assets to given strategy", async function () {
      let depositAmount = ethUtils.parseEther("1"),
          allocation = 80 * 10000;
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      await masterVault.connect(signer1).depositETH({value: depositAmount});
      wMaticBalanceBefore = await getTokenBalance(masterVault.address, wMaticAddress);
      assert.equal(Number(wMaticBalanceBefore), Number(depositAmount))
      
      await masterVault.depositAllToStrategy(cerosStrategy.address);
      wMaticBalanceAfter = await getTokenBalance(masterVault.address, wMaticAddress);
      assert.equal(Number(wMaticBalanceAfter), 0);
    });

    it("depositToStrategy(): should deposit given amount of assets to given strategy", async function () {
      let depositAmount = ethUtils.parseEther("1");
          allocation = 80 * 10000;
      await masterVault.connect(signer1).depositETH({value: depositAmount});
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      wMaticBalanceBefore = await getTokenBalance(masterVault.address, wMaticAddress);
      assert.equal(Number(wMaticBalanceBefore), Number(depositAmount))
      
      await masterVault.depositToStrategy(cerosStrategy.address, depositAmount.div(ethers.BigNumber.from("2")));
      wMaticBalanceAfter = await getTokenBalance(masterVault.address, wMaticAddress);
      assert.equal(Number(wMaticBalanceAfter), Number(wMaticBalanceBefore) / 2);
    });

    it("depositAllToStrategy(): should deposit all the assets to given strategy", async function () {
      let depositAmount = ethUtils.parseEther("1");
          allocation = 80 * 10000;
      await masterVault.connect(signer1).depositETH({value: depositAmount});
      await masterVault.setStrategy(cerosStrategy.address, allocation);
      wMaticBalanceBefore = await getTokenBalance(masterVault.address, wMaticAddress);
      assert.equal(Number(wMaticBalanceBefore), Number(depositAmount))
      
      await masterVault.depositAllToStrategy(cerosStrategy.address);
      wMaticBalanceAfter = await getTokenBalance(masterVault.address, wMaticAddress);
      assert.equal(Number(wMaticBalanceAfter), 0);
    });

    it("revert:: deposit(): should revert", async function () {
      await expect(
        masterVault
          .connect(deployer)
          .deposit(1, deployer.address)
      ).to.be.revertedWith("");
    });

    it("revert:: mint(): should revert", async function () {
      await expect(
        masterVault
          .connect(deployer)
          .mint(1, deployer.address)
      ).to.be.revertedWith("");
    });

    it("revert:: withdraw(): should revert", async function () {
      await expect(
        masterVault
          .connect(deployer)
          .withdraw(1, deployer.address, deployer.address)
      ).to.be.revertedWith("");
    });

    it("revert:: redeem(): should revert", async function () {
      await expect(
        masterVault
          .connect(deployer)
          .redeem(1, deployer.address, deployer.address)
      ).to.be.revertedWith("");
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

      it("revert:: removeManager(): cannot set zero address", async function () {
        await expect(
          masterVault
            .connect(deployer)
            .removeManager(ethers.constants.AddressZero)
        ).to.be.revertedWith("");
      });

      it("removeManager(): should let owner remove manager", async function () {
        await masterVault
          .connect(deployer)
          .removeManager(deployer.address)
        assert.equal(await masterVault.manager(deployer.address), false)
      });

      it("revert:: changeProvider(): cannot set zero address", async function () {
        await expect(
          masterVault
            .connect(deployer)
            .changeProvider(ethers.constants.AddressZero)
        ).to.be.revertedWith("");
      });

      it("changeProvider(): should let owner change provider address", async function () {
        await expect(masterVault.changeProvider(signer2.address))
          .to.emit(masterVault, "ProviderChanged")
          .withArgs(signer2.address);
      });

      it("revert:: changeStrategyAllocation(): cannot change allocation of zero address", async function () {
        await expect(
          masterVault
            .connect(deployer)
            .changeStrategyAllocation(ethers.constants.AddressZero, 0)
        ).to.be.revertedWith("");
      });

      it("changeStrategyAllocation(): should let owner change allocation", async function () {
        await masterVault
          .connect(deployer)
          .changeStrategyAllocation(cerosStrategy.address, 50 * 10000) // 50%
      });

      it("revert:: changeStrategyAllocation(): cannot change allocation to more than 100%", async function () {
        let allocation = 80 * 10000;   // 80%
        await masterVault.setStrategy(cerosStrategy.address, allocation);
        await expect(
          masterVault
            .connect(deployer)
            .changeStrategyAllocation(cerosStrategy.address, 101 * 10000)
        ).to.be.revertedWith("allocations cannot be more than 100%");         
      });

      it("revert:: setStrategy(): cannot set already existing strategy", async function () {
        let allocation = 80 * 10000;   // 80%
        await masterVault.setStrategy(cerosStrategy.address, allocation);
        await expect(
          masterVault
            .connect(deployer)
            .setStrategy(cerosStrategy.address, allocation)
        ).to.be.revertedWith("strategy already exists");         
      });

      it("revert:: setStrategy(): cannot set already existing strategy", async function () {
        let allocation = 80 * 10000;   // 80%
        await masterVault.setStrategy(cerosStrategy.address, allocation);
        await expect(
          masterVault
            .connect(deployer)
            .setStrategy(signer1.address, 101 * 10000)
        ).to.be.revertedWith("allocations cannot be more than 100%");         
      });

      it("revert:: setWaitingPoolCap(): onlyOwner can call", async function() {
        await expect(
          masterVault
            .connect(signer1)
            .setWaitingPoolCap(12)
        ).to.be.revertedWith("Ownable: caller is not the owner"); 
      });

      it("revert:: setWaitingPoolCap(): should let owner set waiting pool cap limit", async function() {
        let capLimit = 12
        await masterVault.connect(deployer).setWaitingPoolCap(capLimit);
        let waitingPoolCapLimit = await waitingPool.capLimit();
        assert.equal(waitingPoolCapLimit, capLimit)
      });

      it("revert:: setCapLimit(): onlyMasterVault can call", async function() {
        await expect(
          masterVault
            .connect(signer1)
            .setWaitingPoolCap(12)
        ).to.be.revertedWith(""); 
      });

      it("revert:: setCapLimit(): cannot be zero", async function() {
        await expect(
          masterVault
            .connect(deployer)
            .setWaitingPoolCap(0)
        ).to.be.revertedWith("invalid cap"); 
      });

      it("revert:: setCapLimit(): onlyMasterVault can call", async function() {
        await expect(
          waitingPool
            .connect(signer1)
            .setCapLimit(12)
        ).to.be.revertedWith(""); 
      });
      
      it("revert:: changeSwapPool(): onlyOwner can call", async function() {
        await expect(
          masterVault
            .connect(signer1)
            .changeSwapPool(signer2.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");  
      });

      it("changeSwapPool(): should let owner change swapPool", async function() {
        expect(await masterVault.connect(deployer).changeSwapPool(signer2.address))
          .to.emit(masterVault, "SwapPoolChanged")
          .withArgs(signer2.address);
      });

      it("revert:: changeFeeReceiver(): onlyOwner can call", async function() {
        await expect(
          masterVault
            .connect(signer1)
            .changeFeeReceiver(signer2.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");  
      });

      it("changeFeeReceiver(): should let owner change swapPool", async function() {
        expect(await masterVault.connect(deployer).changeFeeReceiver(signer2.address))
          .to.emit(masterVault, "FeeReceiverChanged")
          .withArgs(signer2.address);
      });
      
    });

    describe("CerosYieldConverterStrategy: setters", async () => {

      it("revert:: changeSwapPool(): onlyOwner can call", async function() {
        await expect(
          cerosStrategy
            .connect(signer1)
            .changeSwapPool(signer2.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");  
      });

      it("revert:: changeCeRouter(): onlyOwner can call", async function() {
        await expect(
          cerosStrategy
            .connect(signer1)
            .changeCeRouter(signer2.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");  
      });

      it("changeCeRouter(): should let owner change ceRouter", async function() {
        expect(await cerosStrategy.connect(deployer).changeCeRouter(signer2.address))
          .to.emit(cerosStrategy, "CeRouterChanged")
          .withArgs(signer2.address);
      });

      it("changeSwapPool(): should let owner change swapPool", async function() {
        expect(await cerosStrategy.connect(deployer).changeSwapPool(signer2.address))
          .to.emit(cerosStrategy, "SwapPoolChanged")
          .withArgs(signer2.address);
      });

      it("revert:: setStrategist(): onlyOwner can call", async function() {
        await expect(
          cerosStrategy
            .connect(signer1)
            .setStrategist(signer2.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");  
      });

      it("setStrategist(): should let owner change Strategist", async function() {
        expect(await cerosStrategy.connect(deployer).setStrategist(signer2.address))
          .to.emit(cerosStrategy, "UpdatedStrategist")
          .withArgs(signer2.address);
      });

      it("revert:: setStrategist(): onlyOwner can call", async function() {
        await expect(
          cerosStrategy
            .connect(signer1)
            .setStrategist(signer2.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");  
      });

      it("setFeeRecipient(): should let owner change feeRecipient", async function() {
        expect(await cerosStrategy.connect(deployer).setFeeRecipient(signer2.address))
          .to.emit(cerosStrategy, "UpdatedFeeRecipient")
          .withArgs(signer2.address);
      });

      it("revert:: pause(): onlyStrategist can call", async function() {
        await expect(
          cerosStrategy
            .connect(signer1)
            .pause()
        ).to.be.revertedWith("");  
      });

      it("pause(): should let Strategist pause deposits", async function() {
        await cerosStrategy.connect(deployer).pause()
        let depositPaused = await cerosStrategy.depositPaused();
        assert.equal(depositPaused, true);
      });

      it("unpause(): should let Strategist unpause deposits", async function() {
        await cerosStrategy.connect(deployer).unpause()
        let depositPaused = await cerosStrategy.depositPaused();
        assert.equal(depositPaused, false);
      });

      it("harvest(): should let strategiest harvest(claim yeild)", async function() {

        let depositAmount = ethUtils.parseEther("1"),
            allocation = 80 * 10000   // 80%
            availableToWithdrawBefore = await masterVault.availableToWithdraw();
        await masterVault.setStrategy(cerosStrategy.address, allocation);
        await masterVault.connect(signer1).depositETH({value: depositAmount});
        await depositAndAllocate(masterVault, signer1, depositAmount);
        availableToWithdrawAfter = await masterVault.availableToWithdraw();
        strategyDebt = await masterVault.strategyParams(cerosStrategy.address);
        swapFee = ((((Number(depositAmount) + Number(depositAmount)) * allocation) / 1000000 ) * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
        assert.equal(Number(depositAmount) + Number(depositAmount), Number(availableToWithdrawAfter) + Number(strategyDebt.debt) + swapFee);

        await cerosToken.setRatio(ethUtils.parseEther("0.5"));

        certTokenBalanceBefore = await cerosToken.balanceOf(deployer.address);
        await cerosStrategy.connect(deployer).harvest();
        certTokenBalanceAfter = await cerosToken.balanceOf(deployer.address);
        assert(certTokenBalanceBefore < certTokenBalanceAfter)
      });

      it("harvestAndSwap(): should let strategiest harvest(claim yeild in wMatic)", async function() {

        let depositAmount = ethUtils.parseEther("1"),
            allocation = 80 * 10000   // 80%
            availableToWithdrawBefore = await masterVault.availableToWithdraw();
        await masterVault.setStrategy(cerosStrategy.address, allocation);
        await masterVault.connect(signer1).depositETH({value: depositAmount});
        await depositAndAllocate(masterVault, signer1, depositAmount);
        availableToWithdrawAfter = await masterVault.availableToWithdraw();
        strategyDebt = await masterVault.strategyParams(cerosStrategy.address);
        swapFee = ((((Number(depositAmount) + Number(depositAmount)) * allocation) / 1000000 ) * await swapPool.stakeFee()) / await swapPool.FEE_MAX();
        assert.equal(Number(depositAmount) + Number(depositAmount), Number(availableToWithdrawAfter) + Number(strategyDebt.debt) + swapFee);

        await cerosToken.setRatio(ethUtils.parseEther("0.5"));

        wMaticBalanceBefore = await wMatic.balanceOf(deployer.address);
        await cerosStrategy.connect(deployer).harvestAndSwap();
        wMaticBalanceAfter = await wMatic.balanceOf(deployer.address);
        assert(wMaticBalanceBefore < wMaticBalanceAfter)
      });
    });
  });
});
