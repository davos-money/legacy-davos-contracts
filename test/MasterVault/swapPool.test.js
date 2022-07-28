const chai = require("chai");
const {assert, expect} = require("chai");
const chaiAsPromised = require("chai-as-promised");
const {solidity} = require("ethereum-waffle");

const {SignerWithAddress} = require("@nomiclabs/hardhat-ethers/signers");
const {ethers} = require("hardhat");
const NetworkSnapshotter = require("../../helpers/NetworkSnapshotter");
const { BigNumber } = require("ethers");

chai.use(solidity);
chai.use(chaiAsPromised);

const { AddressZero, MaxUint256 } = ethers.constants;

const { parseEther } = ethers.utils;
const ten = BigNumber.from(10);
const tenPow8 = ten.pow(8);
const tenPow18 = ten.pow(18);

const UserType = {
    MANAGER: 0,
    LIQUIDITY_PROVIDER: 1,
    INTEGRATOR: 2
}

const FeeType = {
    OWNER: 0, 
    MANAGER: 1, 
    INTEGRATOR: 2, 
    STAKE: 3, 
    UNSTAKE: 4
}

describe("SwapPool", () => {
    // signers
    let deployer;
    let manager;
    let user1;
    let user2;
    // contracts
    let lp;
    let swapPool;
    // mocks
    let wNative;
    let cerosToken;
  
    const mintAmount = parseEther("10000000");
  
    const networkSnapshotter = new NetworkSnapshotter();
  
    before("Setup", async () => {
      [deployer, manager, user1, user2] = await ethers.getSigners();
  
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
      swapPool = await SwapPoolFactory.connect(deployer).deploy(
        wNative.address,
        cerosToken.address,
        lp.address,
        false,
        false
      );
      await swapPool.deployed();
  
      await wNative.connect(user1).deposit({ value: mintAmount });
      await cerosToken.connect(user1).mintMe(mintAmount);
      await wNative.connect(user2).deposit({ value: mintAmount });
      await cerosToken.connect(user2).mintMe(mintAmount);
  
      await wNative.connect(user1).approve(swapPool.address, MaxUint256);
      await cerosToken.connect(user1).approve(swapPool.address, MaxUint256);
      await wNative.connect(user2).approve(swapPool.address, MaxUint256);
      await cerosToken.connect(user2).approve(swapPool.address, MaxUint256);
  
      // Initialize Contracts
      await lp.setSwapPool(swapPool.address);
  
      await networkSnapshotter.firstSnapshot();
    });
  
    afterEach("revert", async () => await networkSnapshotter.revert());
  
    describe("# add/remove(userType)", () => {
      describe("reverts:", () => {
        it("if want to add zero address", async () => {
          await expect(swapPool.connect(user1).add(AddressZero, UserType.MANAGER)).to.be.revertedWith(
            "cannot add address(0)"
          );
        });
  
        it("if want to add manager from non-owner account", async () => {
          await expect(
            swapPool.connect(user1).add(manager.address, UserType.MANAGER)
          ).to.be.revertedWith("Only owner can add manager");
        });
  
        it("if want to add liquidity provider or integrator from non-manager account", async () => {
          await expect(swapPool.add(manager.address, UserType.LIQUIDITY_PROVIDER)).to.be.revertedWith(
            "Only manager can add liquidity provider"
          );
          await expect(swapPool.add(manager.address, UserType.INTEGRATOR)).to.be.revertedWith(
            "Only manager can add integrator"
          );
        });
  
        it("if want to remove zero address", async () => {
          await expect(
            swapPool.connect(user1).remove(AddressZero, UserType.MANAGER)
          ).to.be.revertedWith("cannot remove address(0)");
        });
  
        it("if want to remove manager from non-owner account", async () => {
          await expect(
            swapPool.connect(user1).remove(manager.address, UserType.MANAGER)
          ).to.be.revertedWith("Only owner can remove manager");
        });
  
        it("if want to add liquidity provider or integrator from non-manager account", async () => {
          await expect(
            swapPool.remove(manager.address, UserType.LIQUIDITY_PROVIDER)
          ).to.be.revertedWith("Only manager can remove liquidity provider");
          await expect(swapPool.remove(manager.address, UserType.INTEGRATOR)).to.be.revertedWith(
            "Only manager can remove integrator"
          );
        });
      });
  
      describe("works:", () => {
        it("add manager", async () => {
          const managersLength = await swapPool.length(UserType.MANAGER);
          expect(managersLength).eq(0);
          expect(await swapPool.add(manager.address, UserType.MANAGER))
            .to.emit(swapPool, "UserTypeChanged")
            .withArgs(manager.address, UserType.MANAGER, true);
  
          assert.isTrue(await swapPool.contains(manager.address, UserType.MANAGER));
          expect(await swapPool.length(UserType.MANAGER)).to.eq(managersLength.add(1));
          expect(await swapPool.at(0, UserType.MANAGER)).to.eq(manager.address);
  
          expect(await swapPool.add(user1.address, UserType.MANAGER))
            .to.emit(swapPool, "UserTypeChanged")
            .withArgs(user1.address, UserType.MANAGER, true);
  
          assert.isTrue(await swapPool.contains(user1.address, UserType.MANAGER));
          expect(await swapPool.length(UserType.MANAGER)).to.eq(managersLength.add(2));
          expect(await swapPool.at(1, UserType.MANAGER)).to.eq(user1.address);
  
          expect(await swapPool.add(manager.address, UserType.MANAGER)).to.not.emit(
            swapPool,
            "UserTypeChanged"
          );
        });
  
        it("add liquidity provider", async () => {
          // add manager
          await swapPool.add(manager.address, UserType.MANAGER);
  
          const providersLength = await swapPool.length(UserType.LIQUIDITY_PROVIDER);
          expect(providersLength).eq(0);
          expect(await swapPool.connect(manager).add(user1.address, UserType.LIQUIDITY_PROVIDER))
            .to.emit(swapPool, "UserTypeChanged")
            .withArgs(user1.address, UserType.LIQUIDITY_PROVIDER, true);
  
          assert.isTrue(await swapPool.contains(user1.address, UserType.LIQUIDITY_PROVIDER));
          expect(await swapPool.length(UserType.LIQUIDITY_PROVIDER)).to.eq(providersLength.add(1));
          expect(await swapPool.at(0, UserType.LIQUIDITY_PROVIDER)).to.eq(user1.address);
  
          expect(await swapPool.connect(manager).add(user2.address, UserType.LIQUIDITY_PROVIDER))
            .to.emit(swapPool, "UserTypeChanged")
            .withArgs(user2.address, UserType.LIQUIDITY_PROVIDER, true);
  
          assert.isTrue(await swapPool.contains(user2.address, UserType.LIQUIDITY_PROVIDER));
          expect(await swapPool.length(UserType.LIQUIDITY_PROVIDER)).to.eq(providersLength.add(2));
          expect(await swapPool.at(1, UserType.LIQUIDITY_PROVIDER)).to.eq(user2.address);
  
          expect(
            await swapPool.connect(manager).add(user1.address, UserType.LIQUIDITY_PROVIDER)
          ).to.not.emit(swapPool, "UserTypeChanged");
        });
  
        it("add integrator", async () => {
          // add manager
          await swapPool.add(manager.address, UserType.MANAGER);
  
          const integratorsLength = await swapPool.length(UserType.INTEGRATOR);
          expect(integratorsLength).eq(0);
          expect(await swapPool.connect(manager).add(user1.address, UserType.INTEGRATOR))
            .to.emit(swapPool, "UserTypeChanged")
            .withArgs(user1.address, UserType.INTEGRATOR, true);
  
          assert.isTrue(await swapPool.contains(user1.address, UserType.INTEGRATOR));
  
          expect(await swapPool.length(UserType.INTEGRATOR)).to.eq(integratorsLength.add(1));
          expect(await swapPool.at(0, UserType.INTEGRATOR)).to.eq(user1.address);
  
          expect(await swapPool.connect(manager).add(user2.address, UserType.INTEGRATOR))
            .to.emit(swapPool, "UserTypeChanged")
            .withArgs(user2.address, UserType.INTEGRATOR, true);
  
          assert.isTrue(await swapPool.contains(user2.address, UserType.INTEGRATOR));
          expect(await swapPool.length(UserType.INTEGRATOR)).eq(integratorsLength.add(2));
          expect(await swapPool.at(1, UserType.INTEGRATOR)).to.eq(user2.address);
  
          expect(await swapPool.connect(manager).add(user1.address, UserType.INTEGRATOR)).to.not.emit(
            swapPool,
            "UserTypeChanged"
          );
        });
  
        it("remove manager", async () => {
          // add managers before
          await swapPool.add(manager.address, UserType.MANAGER);
          await swapPool.add(user1.address, UserType.MANAGER);
  
          const initialManagersLen = await swapPool.length(UserType.MANAGER);
          expect(initialManagersLen).eq(2);
          expect(await swapPool.remove(manager.address, UserType.MANAGER))
            .to.emit(swapPool, "UserTypeChanged")
            .withArgs(manager.address, UserType.MANAGER, false);
  
          assert.isFalse(await swapPool.contains(manager.address, UserType.MANAGER));
          expect(await swapPool.length(UserType.MANAGER)).to.eq(initialManagersLen.sub(1));
  
          expect(await swapPool.remove(user1.address, UserType.MANAGER))
            .to.emit(swapPool, "UserTypeChanged")
            .withArgs(user1.address, UserType.MANAGER, false);
  
          assert.isFalse(await swapPool.contains(user1.address, UserType.MANAGER));
          expect(await swapPool.length(UserType.MANAGER)).to.eq(initialManagersLen.sub(2));
  
          expect(await swapPool.remove(manager.address, UserType.MANAGER)).to.not.emit(
            swapPool,
            "UserTypeChanged"
          );
        });
  
        it("remove liquidity provider", async () => {
          // add manager
          await swapPool.add(manager.address, UserType.MANAGER);
          // add providers before
          await swapPool.connect(manager).add(user1.address, UserType.LIQUIDITY_PROVIDER);
          await swapPool.connect(manager).add(user2.address, UserType.LIQUIDITY_PROVIDER);
  
          const initialProvidersLen = await swapPool.length(UserType.LIQUIDITY_PROVIDER);
          expect(initialProvidersLen).eq(2);
          expect(await swapPool.connect(manager).remove(user1.address, UserType.LIQUIDITY_PROVIDER))
            .to.emit(swapPool, "UserTypeChanged")
            .withArgs(user1.address, UserType.LIQUIDITY_PROVIDER, false);
  
          assert.isFalse(await swapPool.contains(user1.address, UserType.LIQUIDITY_PROVIDER));
          expect(await swapPool.length(UserType.LIQUIDITY_PROVIDER)).to.eq(
            initialProvidersLen.sub(1)
          );
  
          expect(await swapPool.connect(manager).remove(user2.address, UserType.LIQUIDITY_PROVIDER))
            .to.emit(swapPool, "UserTypeChanged")
            .withArgs(user2.address, UserType.LIQUIDITY_PROVIDER, false);
  
          assert.isFalse(await swapPool.contains(user2.address, UserType.LIQUIDITY_PROVIDER));
          expect(await swapPool.length(UserType.LIQUIDITY_PROVIDER)).to.eq(
            initialProvidersLen.sub(2)
          );
  
          expect(
            await swapPool.connect(manager).remove(user1.address, UserType.LIQUIDITY_PROVIDER)
          ).to.not.emit(swapPool, "UserTypeChanged");
        });
  
        it("remove integrator", async () => {
          // add manager
          await swapPool.add(manager.address, UserType.MANAGER);
          // add integrators before
          await swapPool.connect(manager).add(user1.address, UserType.INTEGRATOR);
          await swapPool.connect(manager).add(user2.address, UserType.INTEGRATOR);
  
          const initialIntegratorsLen = await swapPool.length(UserType.INTEGRATOR);
          expect(initialIntegratorsLen).eq(2);
          expect(await swapPool.connect(manager).remove(user1.address, UserType.INTEGRATOR))
            .to.emit(swapPool, "UserTypeChanged")
            .withArgs(user1.address, UserType.INTEGRATOR, false);
  
          assert.isFalse(await swapPool.contains(user1.address, UserType.INTEGRATOR));
  
          expect(await swapPool.length(UserType.INTEGRATOR)).to.eq(initialIntegratorsLen.sub(1));
  
          expect(await swapPool.connect(manager).remove(user2.address, UserType.INTEGRATOR))
            .to.emit(swapPool, "UserTypeChanged")
            .withArgs(user2.address, UserType.INTEGRATOR, false);
  
          assert.isFalse(await swapPool.contains(user2.address, UserType.INTEGRATOR));
          expect(await swapPool.length(UserType.INTEGRATOR)).eq(initialIntegratorsLen.sub(2));
  
          expect(
            await swapPool.connect(manager).remove(user1.address, UserType.INTEGRATOR)
          ).to.not.emit(swapPool, "UserTypeChanged");
        });
      });
    });
  
    describe("# setFee", () => {
      before("add manager", async () => {
        await swapPool.add(manager.address, UserType.MANAGER);
  
        await networkSnapshotter.newSnapshot();
      });
  
      after("revert", async () => await networkSnapshotter.revertLastSnapshot());
  
      describe("reverts:", () => {
        it("only owner or manager can call this function", async () => {
          const newFee = 1000; // 1%
          await expect(swapPool.connect(user1).setFee(newFee, FeeType.MANAGER)).to.revertedWith(
            "only owner or manager can call this function"
          );
        });
  
        it("only owner can add Owner fee", async () => {
          const newFee = 1000; // 1%
          await expect(swapPool.connect(manager).setFee(newFee, FeeType.OWNER)).to.revertedWith(
            "only owner can call this function"
          );
        });
  
        it("fee should be less than FEE_MAX", async () => {
          const FEE_MAX = BigNumber.from(await swapPool.FEE_MAX());
          let newFee = BigNumber.from("1000000"); // > 100%
          assert.isTrue(newFee.gte(FEE_MAX));
          await expect(swapPool.setFee(newFee, FeeType.OWNER)).to.revertedWith(
            "Unsupported size of fee!"
          );
  
          newFee = FEE_MAX; // = 100%
          assert.isTrue(newFee.eq(FEE_MAX));
          await expect(swapPool.setFee(newFee, FeeType.OWNER)).to.revertedWith(
            "Unsupported size of fee!"
          );
        });
  
        it("fee sum is more than 100%", async () => {
          const FEE_MAX = await swapPool.FEE_MAX();
          const fee = 30000; // 30%
  
          await swapPool.setFee(fee, FeeType.OWNER);
          await swapPool.setFee(fee, FeeType.MANAGER);
          await swapPool.setFee(fee, FeeType.INTEGRATOR);
  
          const bigFee = 80000;
          assert.isTrue(bigFee + fee + fee > FEE_MAX);
  
          const errorMessage = "fee sum is more than 100%";
  
          // set owner fee
          await expect(swapPool.setFee(bigFee, FeeType.OWNER)).to.revertedWith(errorMessage);
          // set manager fee
          await expect(swapPool.setFee(bigFee, FeeType.MANAGER)).to.revertedWith(errorMessage);
          // set integrator fee
          await expect(swapPool.setFee(bigFee, FeeType.INTEGRATOR)).to.revertedWith(errorMessage);
        });
      });
  
      describe("works:", () => {
        it("fee changing works", async () => {
          const ownerFee = 10000;
          const managerFee = 20000;
          const integratorFee = 30000;
          const stakeFee = 40000;
          const unstakeFee = 50000;
  
          expect(await swapPool.setFee(ownerFee, FeeType.OWNER))
            .to.emit(swapPool, "FeeChanged")
            .withArgs(FeeType.OWNER, 0, ownerFee);
          expect(await swapPool.setFee(managerFee, FeeType.MANAGER))
            .to.emit(swapPool, "FeeChanged")
            .withArgs(FeeType.MANAGER, 0, managerFee);
          expect(await swapPool.setFee(integratorFee, FeeType.INTEGRATOR))
            .to.emit(swapPool, "FeeChanged")
            .withArgs(FeeType.INTEGRATOR, 0, integratorFee);
          expect(await swapPool.setFee(stakeFee, FeeType.STAKE))
            .to.emit(swapPool, "FeeChanged")
            .withArgs(FeeType.STAKE, 0, stakeFee);
          expect(await swapPool.setFee(unstakeFee, FeeType.UNSTAKE))
            .to.emit(swapPool, "FeeChanged")
            .withArgs(FeeType.UNSTAKE, 0, unstakeFee);
  
          expect(await swapPool.ownerFee()).to.eq(ownerFee);
          expect(await swapPool.managerFee()).to.eq(managerFee);
          expect(await swapPool.integratorFee()).to.eq(integratorFee);
          expect(await swapPool.stakeFee()).to.eq(stakeFee);
          expect(await swapPool.unstakeFee()).to.eq(unstakeFee);
        });
      });
    });
  
    describe("# enableIntegratorLock/enableProviderLock/excludeFromFee", () => {
      describe("reverts:", () => {
        it("when the caller is not owner or manager", async () => {
          const errMessage = "only owner or manager can call this function";
          await expect(swapPool.connect(user1).enableIntegratorLock(true)).to.be.revertedWith(
            errMessage
          );
          await expect(swapPool.connect(user1).enableProviderLock(true)).to.be.revertedWith(
            errMessage
          );
          await expect(
            swapPool.connect(user1).excludeFromFee(user1.address, true)
          ).to.be.revertedWith(errMessage);
        });
      });
      describe("works:", () => {
        it("works as expected", async () => {
          await swapPool.add(manager.address, UserType.MANAGER);
  
          let enable = true;
          expect(await swapPool.connect(manager).enableIntegratorLock(enable))
            .to.emit(swapPool, "IntegratorLockEnabled")
            .withArgs(enable);
          expect(await swapPool.connect(manager).enableProviderLock(enable))
            .to.emit(swapPool, "ProviderLockEnabled")
            .withArgs(enable);
          expect(await swapPool.connect(manager).excludeFromFee(user1.address, enable))
            .to.emit(swapPool, "ExcludedFromFee")
            .withArgs(user1.address, enable);
  
          assert.isTrue(await swapPool.integratorLockEnabled());
          assert.isTrue(await swapPool.providerLockEnabled());
          assert.isTrue(await swapPool.excludedFromFee(user1.address));
  
          enable = false;
          expect(await swapPool.connect(deployer).enableIntegratorLock(enable))
            .to.emit(swapPool, "IntegratorLockEnabled")
            .withArgs(enable);
          expect(await swapPool.connect(deployer).enableProviderLock(enable))
            .to.emit(swapPool, "ProviderLockEnabled")
            .withArgs(enable);
          expect(await swapPool.connect(deployer).excludeFromFee(user1.address, enable))
            .to.emit(swapPool, "ExcludedFromFee")
            .withArgs(user1.address, enable);
  
          assert.isFalse(await swapPool.integratorLockEnabled());
          assert.isFalse(await swapPool.providerLockEnabled());
          assert.isFalse(await swapPool.excludedFromFee(user1.address));
        });
      });
    });
  
    describe("# addLiquidity", () => {
      describe("reverts:", () => {
        it("when add first liquidity less than 1 token", async () => {
          const addAmount = parseEther("0.1");
  
          await expect(swapPool.connect(user1).addLiquidity(addAmount, addAmount)).to.be.revertedWith(
            "cannot add first time less than 1 token"
          );
        });
  
        it("if providerLockEnabled and the caller is not integrator", async () => {
          const addAmount = parseEther("100");
  
          await swapPool.enableProviderLock(true);
  
          await expect(swapPool.connect(user1).addLiquidity(addAmount, addAmount)).to.be.revertedWith(
            "only liquidity providers can call this function"
          );
        });
      });
  
      describe("works:", () => {
        it("add the first liquidity with ratio 1", async () => {
          await cerosToken.setRatio(tenPow18);
  
          const addAmount = parseEther("30");
  
          expect(await swapPool.connect(user1).addLiquidity(addAmount, addAmount))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(user1.address, addAmount, addAmount, addAmount, addAmount, true);
  
          expect(await wNative.balanceOf(user1.address)).eq(mintAmount.sub(addAmount));
          expect(await cerosToken.balanceOf(user1.address)).eq(mintAmount.sub(addAmount));
          expect(await lp.balanceOf(user1.address)).eq(addAmount.mul(2).div(tenPow8));
        });
  
        it("addLiquidityEth works ok too", async () => {
          await cerosToken.setRatio(tenPow18);
  
          const addAmount = parseEther("30");
          const user1BalBefore = await user1.getBalance();
  
          expect(await swapPool.connect(user1).addLiquidityEth(addAmount, { value: addAmount }))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(user1.address, addAmount, addAmount, addAmount, addAmount, true);
  
          expect(await user1.getBalance()).lte(user1BalBefore.sub(addAmount));
          expect(await cerosToken.balanceOf(user1.address)).eq(mintAmount.sub(addAmount));
          expect(await lp.balanceOf(user1.address)).eq(addAmount.mul(2).div(tenPow8));
        });
  
        it("add liquidity when providerLockEnabled and the caller is is provider", async () => {
          await cerosToken.setRatio(tenPow18);
  
          await swapPool.enableProviderLock(true);
  
          const addAmount = parseEther("30");
  
          await swapPool.add(deployer.address, UserType.MANAGER);
          await swapPool.add(user1.address, UserType.LIQUIDITY_PROVIDER);
  
          expect(await swapPool.connect(user1).addLiquidity(addAmount, addAmount))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(user1.address, addAmount, addAmount, addAmount, addAmount, true);
  
          expect(await wNative.balanceOf(user1.address)).eq(mintAmount.sub(addAmount));
          expect(await cerosToken.balanceOf(user1.address)).eq(mintAmount.sub(addAmount));
          expect(await lp.balanceOf(user1.address)).eq(addAmount.mul(2).div(tenPow8));
        });
  
        it("add the first different amounts with ratio 1", async () => {
          // set ratio
          await cerosToken.setRatio(tenPow18);
  
          const addAmount = parseEther("30");
  
          expect(await swapPool.connect(user1).addLiquidity(addAmount, mintAmount))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(user1.address, addAmount, addAmount, addAmount, addAmount, true);
  
          expect(await wNative.balanceOf(user1.address)).eq(mintAmount.sub(addAmount));
          expect(await cerosToken.balanceOf(user1.address)).eq(mintAmount.sub(addAmount));
          expect(await lp.balanceOf(user1.address)).eq(addAmount.mul(2).div(tenPow8));
        });
  
        it("add first liquidity with ratio 0.98", async () => {
          // Set ratio
          const newRatio = parseEther("0.98");
          await cerosToken.connect(deployer).setRatio(newRatio);
  
          const addAmount = parseEther("30");
  
          let amount0 = addAmount;
          let amount1 = addAmount;
          const value = amount0.mul(newRatio).div(tenPow18);
          if (amount1.lt(value)) {
            amount0 = amount1.mul(tenPow18).div(newRatio);
          } else {
            amount1 = value;
          }
  
          expect(await swapPool.connect(user1).addLiquidity(addAmount, addAmount))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(user1.address, amount0, amount1, amount0, amount1, true);
  
          expect(await wNative.balanceOf(user1.address)).eq(mintAmount.sub(amount0));
          expect(await cerosToken.balanceOf(user1.address)).eq(mintAmount.sub(amount1));
          expect(await lp.balanceOf(user1.address)).eq(amount0.mul(2).div(tenPow8));
        });
  
        it("add first liquidity with ratio 0.98 with less ratio token amount", async () => {
          // Set ratio
          const newRatio = parseEther("0.98");
          await cerosToken.connect(deployer).setRatio(newRatio);
  
          const addAmount = parseEther("30");
  
          let amount0 = addAmount;
          let amount1 = addAmount.div(2);
          const value = amount0.mul(newRatio).div(tenPow18);
          if (amount1.lt(value)) {
            amount0 = amount1.mul(tenPow18).div(newRatio);
          } else {
            amount1 = value;
          }
  
          expect(await swapPool.connect(user1).addLiquidity(addAmount, addAmount.div(2)))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(user1.address, amount0, amount1, amount0, amount1, true);
  
          expect(await wNative.balanceOf(user1.address)).eq(mintAmount.sub(amount0));
          expect(await cerosToken.balanceOf(user1.address)).eq(mintAmount.sub(amount1));
          expect(await lp.balanceOf(user1.address)).eq(amount0.mul(2).div(tenPow8));
        });
  
        it("add liquidity second time", async () => {
          // Set ratio
          let newRatio = parseEther("1");
          await cerosToken.connect(deployer).setRatio(newRatio);
  
          const addAmount = parseEther("30");
  
          let amount0 = addAmount;
          let amount1 = addAmount;
          let value = amount0.mul(newRatio).div(tenPow18);
          if (amount1.lt(value)) {
            amount0 = amount1.mul(tenPow18).div(newRatio);
          } else {
            amount1 = value;
          }
  
          expect(await swapPool.connect(user1).addLiquidity(addAmount, addAmount))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(user1.address, amount0, amount1, amount0, amount1, true);
  
          expect(await wNative.balanceOf(user1.address)).eq(mintAmount.sub(amount0));
          expect(await cerosToken.balanceOf(user1.address)).eq(mintAmount.sub(amount1));
          expect(await lp.balanceOf(user1.address)).eq(amount0.mul(2).div(tenPow8));
  
          newRatio = parseEther("0.97");
          await cerosToken.connect(deployer).setRatio(newRatio);
  
          amount0 = addAmount;
          amount1 = addAmount;
          value = amount0.mul(newRatio).div(tenPow18);
          if (amount1.lt(value)) {
            amount0 = amount1.mul(tenPow18).div(newRatio);
          } else {
            amount1 = value;
          }
  
          const nativeTokenAmount = await swapPool.nativeTokenAmount();
          const cerosTokenAmount = await swapPool.cerosTokenAmount();
          const totalLp = await lp.totalSupply();
  
          expect(await swapPool.connect(user2).addLiquidity(addAmount, addAmount))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(
              user2.address,
              amount0,
              amount1,
              nativeTokenAmount.add(amount0),
              cerosTokenAmount.add(amount1),
              true
            );
  
          const allInNative = nativeTokenAmount.add(cerosTokenAmount.mul(tenPow18).div(newRatio));
          const expectedBalance = amount0.mul(2).mul(totalLp).div(allInNative);
          expect(await lp.balanceOf(user2.address)).eq(expectedBalance);
        });
      });
    });
  
    describe("# swap", () => {
      const user1InitialLiqBoth = parseEther("200");
      const user2InitialLiqBoth = parseEther("100");
      const tenPercent = BigNumber.from("10000");
      const ratio = tenPow18.mul(7).div(10);
  
      before("add liquidity and set fee", async () => {
        // set ratio to 0.7
        await cerosToken.setRatio(ratio);
  
        // add liquidity
        await swapPool.connect(user1).addLiquidity(user1InitialLiqBoth, user1InitialLiqBoth);
        await swapPool.connect(user2).addLiquidity(user2InitialLiqBoth, user2InitialLiqBoth);
  
        // set fees
        await swapPool.setFee(tenPercent, FeeType.STAKE);
        await swapPool.setFee(tenPercent, FeeType.UNSTAKE);
        await swapPool.setFee(tenPercent, FeeType.OWNER);
        await swapPool.setFee(tenPercent, FeeType.MANAGER);
        await swapPool.setFee(tenPercent, FeeType.INTEGRATOR);
  
        // be sure that integrator lock is disabled
        assert.isFalse(await swapPool.integratorLockEnabled());
  
        await networkSnapshotter.newSnapshot();
      });
  
      after("revert", async () => await networkSnapshotter.revertLastSnapshot());
  
      describe("reverts:", () => {
        it("when integratorLock is enabled and caller is not integrator", async () => {
          await swapPool.enableIntegratorLock(true);
          await expect(swapPool.swap(true, 0, AddressZero)).to.be.rejectedWith(
            "only integrators can call this function"
          );
        });
        it("when not enough liquidity", async () => {
          const bigAmount = parseEther("500");
          // native to ceros
          await expect(swapPool.connect(user1).swap(true, bigAmount, user1.address)).to.revertedWith(
            "Not enough liquidity"
          );
  
          // ceros to native
          await expect(swapPool.connect(user1).swap(false, bigAmount, user1.address)).to.revertedWith(
            "Not enough liquidity"
          );
        });
      });
  
      describe("works:", () => {
        it("swap: swaps native to ceros and gets the expected amount", async () => {
          const swapAmount = parseEther("50");
          const FEE_MAX = await swapPool.FEE_MAX();
          const nativeToCeros = true;
          const everyoneFee = tenPercent;
  
          const user1NativeBalBefore = await wNative.balanceOf(user1.address);
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
  
          const nativeAmountBefore = await swapPool.nativeTokenAmount();
          const cerosAmountBefore = await swapPool.cerosTokenAmount();
          const { nativeFee: ownerNativeFee, cerosFee: ownerCerosFee } =
            await swapPool.ownerFeeCollected();
  
          const { nativeFee: managerNativeFee, cerosFee: managerCerosFee } =
            await swapPool.managerFeeCollected();
  
          let amountIn = swapAmount;
          const stakeFeeAmt = amountIn.mul(everyoneFee).div(FEE_MAX);
          amountIn = amountIn.sub(stakeFeeAmt);
          const managerFeeAmt = stakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
          const ownerFeeAmt = stakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
  
          const amountOut = amountIn.mul(ratio).div(tenPow18);
          // getAmounts out works correct
          const [expectedAmountOut] = await swapPool.getAmountOut(nativeToCeros, swapAmount, false);
          expect(amountOut).eq(expectedAmountOut);
  
          const expectedNativeAmount = nativeAmountBefore.add(
            amountIn.add(stakeFeeAmt.sub(ownerFeeAmt).sub(managerFeeAmt))
          );
          const expectedCerosAmount = cerosAmountBefore.sub(amountOut);
  
          expect(await swapPool.connect(user1).swap(nativeToCeros, swapAmount, user1.address))
            .to.emit(swapPool, "Swap")
            .withArgs(user1.address, user1.address, nativeToCeros, amountIn, amountOut);
  
          expect(await swapPool.nativeTokenAmount()).eq(expectedNativeAmount);
          expect(await swapPool.cerosTokenAmount()).eq(expectedCerosAmount);
          expect(await wNative.balanceOf(user1.address)).eq(user1NativeBalBefore.sub(swapAmount));
          expect(await cerosToken.balanceOf(user1.address)).eq(user1CerosBalBefore.add(amountOut));
          const ownerFeeCollected = await swapPool.ownerFeeCollected();
          const managerFeeCollected = await swapPool.managerFeeCollected();
          expect(ownerFeeCollected.nativeFee).eq(ownerNativeFee.add(ownerFeeAmt));
          expect(ownerFeeCollected.cerosFee).eq(ownerCerosFee);
          expect(managerFeeCollected.nativeFee).eq(managerNativeFee.add(managerFeeAmt));
          expect(managerFeeCollected.cerosFee).eq(managerCerosFee);
        });
  
        it("swapEth: swaps native to ceros and gets the expected amount", async () => {
          const swapAmount = parseEther("50");
          const FEE_MAX = await swapPool.FEE_MAX();
          const nativeToCeros = true;
          const everyoneFee = tenPercent;
  
          const user1NativeBalBefore = await user1.getBalance();
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
  
          const nativeAmountBefore = await swapPool.nativeTokenAmount();
          const cerosAmountBefore = await swapPool.cerosTokenAmount();
          const { nativeFee: ownerNativeFee, cerosFee: ownerCerosFee } =
            await swapPool.ownerFeeCollected();
  
          const { nativeFee: managerNativeFee, cerosFee: managerCerosFee } =
            await swapPool.managerFeeCollected();
  
          let amountIn = swapAmount;
          const stakeFeeAmt = amountIn.mul(everyoneFee).div(FEE_MAX);
          amountIn = amountIn.sub(stakeFeeAmt);
          const managerFeeAmt = stakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
          const ownerFeeAmt = stakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
  
          const amountOut = amountIn.mul(ratio).div(tenPow18);
  
          const expectedNativeAmount = nativeAmountBefore.add(
            amountIn.add(stakeFeeAmt.sub(ownerFeeAmt).sub(managerFeeAmt))
          );
          const expectedCerosAmount = cerosAmountBefore.sub(amountOut);
  
          expect(
            await swapPool
              .connect(user1)
              .swapEth(nativeToCeros, swapAmount, user1.address, { value: swapAmount })
          )
            .to.emit(swapPool, "Swap")
            .withArgs(user1.address, user1.address, nativeToCeros, amountIn, amountOut);
  
          expect(await swapPool.nativeTokenAmount()).eq(expectedNativeAmount);
          expect(await swapPool.cerosTokenAmount()).eq(expectedCerosAmount);
          expect(await user1.getBalance()).lt(user1NativeBalBefore.sub(swapAmount));
          expect(await cerosToken.balanceOf(user1.address)).eq(user1CerosBalBefore.add(amountOut));
          const ownerFeeCollected = await swapPool.ownerFeeCollected();
          const managerFeeCollected = await swapPool.managerFeeCollected();
          expect(ownerFeeCollected.nativeFee).eq(ownerNativeFee.add(ownerFeeAmt));
          expect(ownerFeeCollected.cerosFee).eq(ownerCerosFee);
          expect(managerFeeCollected.nativeFee).eq(managerNativeFee.add(managerFeeAmt));
          expect(managerFeeCollected.cerosFee).eq(managerCerosFee);
        });
  
        it("swap: swaps ceros to native and gets the expected amount", async () => {
          const swapAmount = parseEther("50");
          const FEE_MAX = await swapPool.FEE_MAX();
          const nativeToCeros = false;
          const everyoneFee = tenPercent;
  
          const user1NativeBalBefore = await wNative.balanceOf(user1.address);
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
  
          const nativeAmountBefore = await swapPool.nativeTokenAmount();
          const cerosAmountBefore = await swapPool.cerosTokenAmount();
          const { nativeFee: ownerNativeFee, cerosFee: ownerCerosFee } =
            await swapPool.ownerFeeCollected();
  
          const { nativeFee: managerNativeFee, cerosFee: managerCerosFee } =
            await swapPool.managerFeeCollected();
  
          let amountIn = swapAmount;
          const unstakeFeeAmt = amountIn.mul(everyoneFee).div(FEE_MAX);
          amountIn = amountIn.sub(unstakeFeeAmt);
          const managerFeeAmt = unstakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
          const ownerFeeAmt = unstakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
  
          const amountOut = amountIn.mul(tenPow18).div(ratio);
          // getAmounts out works correct
          const [expectedAmountOut] = await swapPool.getAmountOut(nativeToCeros, swapAmount, false);
          expect(amountOut).eq(expectedAmountOut);
  
          const expectedNativeAmount = nativeAmountBefore.sub(amountOut);
          const expectedCerosAmount = cerosAmountBefore.add(
            amountIn.add(unstakeFeeAmt.sub(ownerFeeAmt).sub(managerFeeAmt))
          );
  
          expect(await swapPool.connect(user1).swap(nativeToCeros, swapAmount, user1.address))
            .to.emit(swapPool, "Swap")
            .withArgs(user1.address, user1.address, nativeToCeros, amountIn, amountOut);
  
          expect(await swapPool.nativeTokenAmount()).eq(expectedNativeAmount);
          expect(await swapPool.cerosTokenAmount()).eq(expectedCerosAmount);
          expect(await cerosToken.balanceOf(user1.address)).eq(user1CerosBalBefore.sub(swapAmount));
          expect(await wNative.balanceOf(user1.address)).eq(user1NativeBalBefore.add(amountOut));
          const ownerFeeCollected = await swapPool.ownerFeeCollected();
          const managerFeeCollected = await swapPool.managerFeeCollected();
          expect(ownerFeeCollected.cerosFee).eq(ownerCerosFee.add(ownerFeeAmt));
          expect(ownerFeeCollected.nativeFee).eq(ownerNativeFee);
          expect(managerFeeCollected.cerosFee).eq(managerCerosFee.add(managerFeeAmt));
          expect(managerFeeCollected.nativeFee).eq(managerNativeFee);
        });
  
        it("swapEth: swaps ceros to native and gets the expected amount", async () => {
          const swapAmount = parseEther("50");
          const FEE_MAX = await swapPool.FEE_MAX();
          const nativeToCeros = false;
          const everyoneFee = tenPercent;
  
          const user1NativeBalBefore = await user1.getBalance();
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
  
          const nativeAmountBefore = await swapPool.nativeTokenAmount();
          const cerosAmountBefore = await swapPool.cerosTokenAmount();
          const { nativeFee: ownerNativeFee, cerosFee: ownerCerosFee } =
            await swapPool.ownerFeeCollected();
  
          const { nativeFee: managerNativeFee, cerosFee: managerCerosFee } =
            await swapPool.managerFeeCollected();
  
          let amountIn = swapAmount;
          const unstakeFeeAmt = amountIn.mul(everyoneFee).div(FEE_MAX);
          amountIn = amountIn.sub(unstakeFeeAmt);
          const managerFeeAmt = unstakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
          const ownerFeeAmt = unstakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
  
          const amountOut = amountIn.mul(tenPow18).div(ratio);
  
          const expectedNativeAmount = nativeAmountBefore.sub(amountOut);
          const expectedCerosAmount = cerosAmountBefore.add(
            amountIn.add(unstakeFeeAmt.sub(ownerFeeAmt).sub(managerFeeAmt))
          );
  
          expect(await swapPool.connect(user1).swapEth(nativeToCeros, swapAmount, user1.address))
            .to.emit(swapPool, "Swap")
            .withArgs(user1.address, user1.address, nativeToCeros, amountIn, amountOut);
  
          expect(await swapPool.nativeTokenAmount()).eq(expectedNativeAmount);
          expect(await swapPool.cerosTokenAmount()).eq(expectedCerosAmount);
          expect(await cerosToken.balanceOf(user1.address)).eq(user1CerosBalBefore.sub(swapAmount));
          expect(await user1.getBalance()).gt(user1NativeBalBefore);
          expect(await user1.getBalance()).lt(user1NativeBalBefore.add(amountOut));
          const ownerFeeCollected = await swapPool.ownerFeeCollected();
          const managerFeeCollected = await swapPool.managerFeeCollected();
          expect(ownerFeeCollected.cerosFee).eq(ownerCerosFee.add(ownerFeeAmt));
          expect(ownerFeeCollected.nativeFee).eq(ownerNativeFee);
          expect(managerFeeCollected.cerosFee).eq(managerCerosFee.add(managerFeeAmt));
          expect(managerFeeCollected.nativeFee).eq(managerNativeFee);
        });
  
        it("swap to receiver address works(native to ceros)", async () => {
          const swapAmount = parseEther("50");
          const FEE_MAX = await swapPool.FEE_MAX();
          const nativeToCeros = true;
          const everyoneFee = tenPercent;
          const receiver = user2.address;
  
          const user1NativeBalBefore = await wNative.balanceOf(user1.address);
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
          const receiverCerosBalBefore = await cerosToken.balanceOf(receiver);
  
          const nativeAmountBefore = await swapPool.nativeTokenAmount();
          const cerosAmountBefore = await swapPool.cerosTokenAmount();
          const { nativeFee: ownerNativeFee, cerosFee: ownerCerosFee } =
            await swapPool.ownerFeeCollected();
  
          const { nativeFee: managerNativeFee, cerosFee: managerCerosFee } =
            await swapPool.managerFeeCollected();
  
          let amountIn = swapAmount;
          const stakeFeeAmt = amountIn.mul(everyoneFee).div(FEE_MAX);
          amountIn = amountIn.sub(stakeFeeAmt);
          const managerFeeAmt = stakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
          const ownerFeeAmt = stakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
  
          const amountOut = amountIn.mul(ratio).div(tenPow18);
  
          const expectedNativeAmount = nativeAmountBefore.add(
            amountIn.add(stakeFeeAmt.sub(ownerFeeAmt).sub(managerFeeAmt))
          );
          const expectedCerosAmount = cerosAmountBefore.sub(amountOut);
  
          expect(await swapPool.connect(user1).swap(nativeToCeros, swapAmount, receiver))
            .to.emit(swapPool, "Swap")
            .withArgs(user1.address, receiver, nativeToCeros, amountIn, amountOut);
  
          expect(await swapPool.nativeTokenAmount()).eq(expectedNativeAmount);
          expect(await swapPool.cerosTokenAmount()).eq(expectedCerosAmount);
          expect(await wNative.balanceOf(user1.address)).eq(user1NativeBalBefore.sub(swapAmount));
          expect(await cerosToken.balanceOf(user1.address)).eq(user1CerosBalBefore);
          expect(await cerosToken.balanceOf(receiver)).eq(receiverCerosBalBefore.add(amountOut));
          const ownerFeeCollected = await swapPool.ownerFeeCollected();
          const managerFeeCollected = await swapPool.managerFeeCollected();
          expect(ownerFeeCollected.nativeFee).eq(ownerNativeFee.add(ownerFeeAmt));
          expect(ownerFeeCollected.cerosFee).eq(ownerCerosFee);
          expect(managerFeeCollected.nativeFee).eq(managerNativeFee.add(managerFeeAmt));
          expect(managerFeeCollected.cerosFee).eq(managerCerosFee);
        });
  
        it("swap to receiver address works(ceros to native)", async () => {
          const swapAmount = parseEther("50");
          const FEE_MAX = await swapPool.FEE_MAX();
          const nativeToCeros = false;
          const everyoneFee = tenPercent;
          const receiver = user2.address;
  
          const user1NativeBalBefore = await wNative.balanceOf(user1.address);
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
          const receiverNativeBalBefore = await wNative.balanceOf(receiver);
  
          const nativeAmountBefore = await swapPool.nativeTokenAmount();
          const cerosAmountBefore = await swapPool.cerosTokenAmount();
          const { nativeFee: ownerNativeFee, cerosFee: ownerCerosFee } =
            await swapPool.ownerFeeCollected();
  
          const { nativeFee: managerNativeFee, cerosFee: managerCerosFee } =
            await swapPool.managerFeeCollected();
  
          let amountIn = swapAmount;
          const unstakeFeeAmt = amountIn.mul(everyoneFee).div(FEE_MAX);
          amountIn = amountIn.sub(unstakeFeeAmt);
          const managerFeeAmt = unstakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
          const ownerFeeAmt = unstakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
  
          const amountOut = amountIn.mul(tenPow18).div(ratio);
  
          const expectedNativeAmount = nativeAmountBefore.sub(amountOut);
          const expectedCerosAmount = cerosAmountBefore.add(
            amountIn.add(unstakeFeeAmt.sub(ownerFeeAmt).sub(managerFeeAmt))
          );
  
          expect(await swapPool.connect(user1).swap(nativeToCeros, swapAmount, receiver))
            .to.emit(swapPool, "Swap")
            .withArgs(user1.address, receiver, nativeToCeros, amountIn, amountOut);
  
          expect(await swapPool.nativeTokenAmount()).eq(expectedNativeAmount);
          expect(await swapPool.cerosTokenAmount()).eq(expectedCerosAmount);
          expect(await cerosToken.balanceOf(user1.address)).eq(user1CerosBalBefore.sub(swapAmount));
          expect(await wNative.balanceOf(user1.address)).eq(user1NativeBalBefore);
          expect(await wNative.balanceOf(receiver)).eq(receiverNativeBalBefore.add(amountOut));
          const ownerFeeCollected = await swapPool.ownerFeeCollected();
          const managerFeeCollected = await swapPool.managerFeeCollected();
          expect(ownerFeeCollected.cerosFee).eq(ownerCerosFee.add(ownerFeeAmt));
          expect(ownerFeeCollected.nativeFee).eq(ownerNativeFee);
          expect(managerFeeCollected.cerosFee).eq(managerCerosFee.add(managerFeeAmt));
          expect(managerFeeCollected.nativeFee).eq(managerNativeFee);
        });
  
        it("swaps and transfers integrator fee if integratorLock is enabled (native to ceros)", async () => {
          // enable integrator lock
          await swapPool.enableIntegratorLock(true);
          // set user1 as integrator
          await swapPool.add(manager.address, UserType.MANAGER);
          await swapPool.connect(manager).add(user1.address, UserType.INTEGRATOR);
  
          const swapAmount = parseEther("50");
          const FEE_MAX = await swapPool.FEE_MAX();
          const nativeToCeros = true;
          const everyoneFee = tenPercent;
          const receiver = user2.address;
  
          const user1NativeBalBefore = await wNative.balanceOf(user1.address);
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
          const receiverCerosBalBefore = await cerosToken.balanceOf(receiver);
  
          const nativeAmountBefore = await swapPool.nativeTokenAmount();
          const cerosAmountBefore = await swapPool.cerosTokenAmount();
          const { nativeFee: ownerNativeFee, cerosFee: ownerCerosFee } =
            await swapPool.ownerFeeCollected();
  
          const { nativeFee: managerNativeFee, cerosFee: managerCerosFee } =
            await swapPool.managerFeeCollected();
  
          let amountIn = swapAmount;
          const stakeFeeAmt = amountIn.mul(everyoneFee).div(FEE_MAX);
          amountIn = amountIn.sub(stakeFeeAmt);
          const managerFeeAmt = stakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
          const ownerFeeAmt = stakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
          const integratorFee = stakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
  
          const amountOut = amountIn.mul(ratio).div(tenPow18);
  
          const expectedNativeAmount = nativeAmountBefore.add(
            amountIn.add(stakeFeeAmt.sub(ownerFeeAmt).sub(managerFeeAmt).sub(integratorFee))
          );
          const expectedCerosAmount = cerosAmountBefore.sub(amountOut);
  
          expect(await swapPool.connect(user1).swap(nativeToCeros, swapAmount, receiver))
            .to.emit(swapPool, "Swap")
            .withArgs(user1.address, receiver, nativeToCeros, amountIn, amountOut);
  
          expect(await swapPool.nativeTokenAmount()).eq(expectedNativeAmount);
          expect(await swapPool.cerosTokenAmount()).eq(expectedCerosAmount);
          expect(await wNative.balanceOf(user1.address)).eq(
            user1NativeBalBefore.sub(swapAmount).add(integratorFee)
          );
          expect(await cerosToken.balanceOf(user1.address)).eq(user1CerosBalBefore);
          expect(await cerosToken.balanceOf(receiver)).eq(receiverCerosBalBefore.add(amountOut));
          const ownerFeeCollected = await swapPool.ownerFeeCollected();
          const managerFeeCollected = await swapPool.managerFeeCollected();
          expect(ownerFeeCollected.nativeFee).eq(ownerNativeFee.add(ownerFeeAmt));
          expect(ownerFeeCollected.cerosFee).eq(ownerCerosFee);
          expect(managerFeeCollected.nativeFee).eq(managerNativeFee.add(managerFeeAmt));
          expect(managerFeeCollected.cerosFee).eq(managerCerosFee);
        });
  
        it("swaps and transfers integrator fee if integratorLock is enabled (ceros to native)", async () => {
          // enable integrator lock
          await swapPool.enableIntegratorLock(true);
          // set user1 as integrator
          await swapPool.add(manager.address, UserType.MANAGER);
          await swapPool.connect(manager).add(user1.address, UserType.INTEGRATOR);
  
          const swapAmount = parseEther("50");
          const FEE_MAX = await swapPool.FEE_MAX();
          const nativeToCeros = false;
          const everyoneFee = tenPercent;
          const receiver = user2.address;
  
          const user1NativeBalBefore = await wNative.balanceOf(user1.address);
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
          const receiverNativeBalBefore = await wNative.balanceOf(receiver);
  
          const nativeAmountBefore = await swapPool.nativeTokenAmount();
          const cerosAmountBefore = await swapPool.cerosTokenAmount();
          const { nativeFee: ownerNativeFee, cerosFee: ownerCerosFee } =
            await swapPool.ownerFeeCollected();
  
          const { nativeFee: managerNativeFee, cerosFee: managerCerosFee } =
            await swapPool.managerFeeCollected();
  
          let amountIn = swapAmount;
          const unstakeFeeAmt = amountIn.mul(everyoneFee).div(FEE_MAX);
          amountIn = amountIn.sub(unstakeFeeAmt);
          const managerFeeAmt = unstakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
          const ownerFeeAmt = unstakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
          const integratorFee = unstakeFeeAmt.mul(everyoneFee).div(FEE_MAX);
  
          const amountOut = amountIn.mul(tenPow18).div(ratio);
  
          const expectedNativeAmount = nativeAmountBefore.sub(amountOut);
          const expectedCerosAmount = cerosAmountBefore.add(
            amountIn.add(unstakeFeeAmt.sub(ownerFeeAmt).sub(managerFeeAmt).sub(integratorFee))
          );
  
          expect(await swapPool.connect(user1).swap(nativeToCeros, swapAmount, receiver))
            .to.emit(swapPool, "Swap")
            .withArgs(user1.address, receiver, nativeToCeros, amountIn, amountOut);
  
          expect(await swapPool.nativeTokenAmount()).eq(expectedNativeAmount);
          expect(await swapPool.cerosTokenAmount()).eq(expectedCerosAmount);
          expect(await cerosToken.balanceOf(user1.address)).eq(
            user1CerosBalBefore.sub(swapAmount).add(integratorFee)
          );
          expect(await wNative.balanceOf(user1.address)).eq(user1NativeBalBefore);
          expect(await wNative.balanceOf(receiver)).eq(receiverNativeBalBefore.add(amountOut));
          const ownerFeeCollected = await swapPool.ownerFeeCollected();
          const managerFeeCollected = await swapPool.managerFeeCollected();
          expect(ownerFeeCollected.cerosFee).eq(ownerCerosFee.add(ownerFeeAmt));
          expect(ownerFeeCollected.nativeFee).eq(ownerNativeFee);
          expect(managerFeeCollected.cerosFee).eq(managerCerosFee.add(managerFeeAmt));
          expect(managerFeeCollected.nativeFee).eq(managerNativeFee);
        });
  
        it("will not charge a fee if msg.sender is excluded from fee(native to ceros)", async () => {
          // exclude user from fee
          const excludeFromFee = true;
          await swapPool.excludeFromFee(user1.address, excludeFromFee);
  
          const swapAmount = parseEther("50");
          const nativeToCeros = true;
  
          const user1NativeBalBefore = await wNative.balanceOf(user1.address);
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
  
          const nativeAmountBefore = await swapPool.nativeTokenAmount();
          const cerosAmountBefore = await swapPool.cerosTokenAmount();
          const { nativeFee: ownerNativeFee, cerosFee: ownerCerosFee } =
            await swapPool.ownerFeeCollected();
  
          const { nativeFee: managerNativeFee, cerosFee: managerCerosFee } =
            await swapPool.managerFeeCollected();
  
          const amountIn = swapAmount;
          const amountOut = amountIn.mul(ratio).div(tenPow18);
          // getAmounts out works correct
          const [expectedAmountOut] = await swapPool.getAmountOut(
            nativeToCeros,
            swapAmount,
            excludeFromFee
          );
          expect(amountOut).eq(expectedAmountOut);
  
          const expectedNativeAmount = nativeAmountBefore.add(amountIn);
          const expectedCerosAmount = cerosAmountBefore.sub(amountOut);
  
          expect(await swapPool.connect(user1).swap(nativeToCeros, swapAmount, user1.address))
            .to.emit(swapPool, "Swap")
            .withArgs(user1.address, user1.address, nativeToCeros, amountIn, amountOut);
  
          expect(await swapPool.nativeTokenAmount()).eq(expectedNativeAmount);
          expect(await swapPool.cerosTokenAmount()).eq(expectedCerosAmount);
          expect(await wNative.balanceOf(user1.address)).eq(user1NativeBalBefore.sub(swapAmount));
          expect(await cerosToken.balanceOf(user1.address)).eq(user1CerosBalBefore.add(amountOut));
          const ownerFeeCollected = await swapPool.ownerFeeCollected();
          const managerFeeCollected = await swapPool.managerFeeCollected();
          expect(ownerFeeCollected.nativeFee).eq(ownerNativeFee);
          expect(ownerFeeCollected.cerosFee).eq(ownerCerosFee);
          expect(managerFeeCollected.nativeFee).eq(managerNativeFee);
          expect(managerFeeCollected.cerosFee).eq(managerCerosFee);
        });
  
        it("will not charge a fee if msg.sender is excluded from fee(ceros to native)", async () => {
          // exclude user from fee
          const excludeFromFee = true;
          await swapPool.excludeFromFee(user1.address, excludeFromFee);
  
          const swapAmount = parseEther("50");
          const nativeToCeros = false;
  
          const user1NativeBalBefore = await wNative.balanceOf(user1.address);
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
  
          const nativeAmountBefore = await swapPool.nativeTokenAmount();
          const cerosAmountBefore = await swapPool.cerosTokenAmount();
          const { nativeFee: ownerNativeFee, cerosFee: ownerCerosFee } =
            await swapPool.ownerFeeCollected();
  
          const { nativeFee: managerNativeFee, cerosFee: managerCerosFee } =
            await swapPool.managerFeeCollected();
  
          const amountIn = swapAmount;
          const amountOut = amountIn.mul(tenPow18).div(ratio);
  
          // getAmounts out works correct
          const [expectedAmountOut] = await swapPool.getAmountOut(
            nativeToCeros,
            swapAmount,
            excludeFromFee
          );
          expect(amountOut).eq(expectedAmountOut);
  
          const expectedNativeAmount = nativeAmountBefore.sub(amountOut);
          const expectedCerosAmount = cerosAmountBefore.add(amountIn);
  
          expect(await swapPool.connect(user1).swap(nativeToCeros, swapAmount, user1.address))
            .to.emit(swapPool, "Swap")
            .withArgs(user1.address, user1.address, nativeToCeros, amountIn, amountOut);
  
          expect(await swapPool.nativeTokenAmount()).eq(expectedNativeAmount);
          expect(await swapPool.cerosTokenAmount()).eq(expectedCerosAmount);
          expect(await cerosToken.balanceOf(user1.address)).eq(user1CerosBalBefore.sub(swapAmount));
          expect(await wNative.balanceOf(user1.address)).eq(user1NativeBalBefore.add(amountOut));
          const ownerFeeCollected = await swapPool.ownerFeeCollected();
          const managerFeeCollected = await swapPool.managerFeeCollected();
          expect(ownerFeeCollected.cerosFee).eq(ownerCerosFee);
          expect(ownerFeeCollected.nativeFee).eq(ownerNativeFee);
          expect(managerFeeCollected.cerosFee).eq(managerCerosFee);
          expect(managerFeeCollected.nativeFee).eq(managerNativeFee);
        });
      });
    });
  
    describe("# removeLiquidity/removeLiquidityPercent", () => {
      describe("reverts:", () => {
        it("removeLiquidity: if lpAmount is 0", async () => {
          const lpAmount = 0;
          await expect(swapPool.connect(user1).removeLiquidity(lpAmount)).to.be.revertedWith(
            "lp amount should be more than 0"
          );
        });
  
        it("removeLiquidity: if userBalance is less than lpAmount", async () => {
          const lpAmount = 1;
          await expect(swapPool.connect(user1).removeLiquidity(lpAmount)).to.be.revertedWith(
            "you want to remove more than your lp balance"
          );
        });
  
        it("removeLiquidityPercent: if percent is more than 10**18 or it is 0", async () => {
          let percent = parseEther("1.1");
          await expect(swapPool.connect(user1).removeLiquidityPercent(percent)).to.be.revertedWith(
            "percent should be more than 0 and less than 1e18"
          );
          percent = BigNumber.from(0);
          await expect(swapPool.connect(user1).removeLiquidityPercent(percent)).to.be.revertedWith(
            "percent should be more than 0 and less than 1e18"
          );
        });
      });
      describe("works:", () => {
        const user1InitialLiqBoth = parseEther("200");
        const user2InitialLiqBoth = parseEther("100");
  
        before("add liquidity", async () => {
          await cerosToken.setRatio(tenPow18); // set ratio to 1
  
          await swapPool.connect(user1).addLiquidity(user1InitialLiqBoth, user1InitialLiqBoth);
          await swapPool.connect(user2).addLiquidity(user2InitialLiqBoth, user2InitialLiqBoth);
  
          await networkSnapshotter.newSnapshot();
        });
  
        after("revert", async () => await networkSnapshotter.revertLastSnapshot());
  
        it("removeLiquidity: remove liquidity with ratio 1", async () => {
          const user1LpBalance = await lp.balanceOf(user1.address);
          const nativeAmount = await swapPool.nativeTokenAmount();
          const cerosAmount = await swapPool.cerosTokenAmount();
          expect(await swapPool.connect(user1).removeLiquidity(user1LpBalance.div(2)))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(
              user1.address,
              user1InitialLiqBoth.div(2),
              user1InitialLiqBoth.div(2),
              nativeAmount.sub(user1InitialLiqBoth.div(2)),
              cerosAmount.sub(user1InitialLiqBoth.div(2)),
              false
            );
  
          expect(await lp.balanceOf(user1.address)).eq(user1LpBalance.div(2));
        });
  
        it("removeLiquidityEth: remove liquidity with ratio 1", async () => {
          const user1LpBalance = await lp.balanceOf(user1.address);
          const nativeAmount = await swapPool.nativeTokenAmount();
          const cerosAmount = await swapPool.cerosTokenAmount();
          expect(await swapPool.connect(user1).removeLiquidityEth(user1LpBalance.div(2)))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(
              user1.address,
              user1InitialLiqBoth.div(2),
              user1InitialLiqBoth.div(2),
              nativeAmount.sub(user1InitialLiqBoth.div(2)),
              cerosAmount.sub(user1InitialLiqBoth.div(2)),
              false
            );
  
          expect(await lp.balanceOf(user1.address)).eq(user1LpBalance.div(2));
        });
  
        it("removeLiquidityPercent: remove liquidity with ratio 1", async () => {
          const user1LpBalance = await lp.balanceOf(user1.address);
          const percent = parseEther("0.5");
          const nativeAmount = await swapPool.nativeTokenAmount();
          const cerosAmount = await swapPool.cerosTokenAmount();
          expect(await swapPool.connect(user1).removeLiquidityPercent(percent))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(
              user1.address,
              user1InitialLiqBoth.div(2),
              user1InitialLiqBoth.div(2),
              nativeAmount.sub(user1InitialLiqBoth.div(2)),
              cerosAmount.sub(user1InitialLiqBoth.div(2)),
              false
            );
  
          expect(await lp.balanceOf(user1.address)).eq(user1LpBalance.div(2));
        });
  
        it("removeLiquidityPercentEth: remove liquidity with ratio 1", async () => {
          const user1LpBalance = await lp.balanceOf(user1.address);
          const percent = parseEther("0.5");
          const nativeAmount = await swapPool.nativeTokenAmount();
          const cerosAmount = await swapPool.cerosTokenAmount();
          expect(await swapPool.connect(user1).removeLiquidityPercentEth(percent))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(
              user1.address,
              user1InitialLiqBoth.div(2),
              user1InitialLiqBoth.div(2),
              nativeAmount.sub(user1InitialLiqBoth.div(2)),
              cerosAmount.sub(user1InitialLiqBoth.div(2)),
              false
            );
  
          expect(await lp.balanceOf(user1.address)).eq(user1LpBalance.div(2));
        });
  
        it("removeLiquidityPercent: should remove all liquidity", async () => {
          const percent = parseEther("1");
          const nativeAmount = await swapPool.nativeTokenAmount();
          const cerosAmount = await swapPool.cerosTokenAmount();
          const user1NativeBalBefore = await wNative.balanceOf(user1.address);
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
          expect(await swapPool.connect(user1).removeLiquidityPercent(percent))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(
              user1.address,
              user1InitialLiqBoth,
              user1InitialLiqBoth,
              nativeAmount.sub(user1InitialLiqBoth),
              cerosAmount.sub(user1InitialLiqBoth),
              false
            );
  
          expect(await lp.balanceOf(user1.address)).eq(0);
          expect(await wNative.balanceOf(user1.address)).eq(
            user1NativeBalBefore.add(user1InitialLiqBoth)
          );
          expect(await cerosToken.balanceOf(user1.address)).eq(
            user1CerosBalBefore.add(user1InitialLiqBoth)
          );
        });
  
        it("removeLiquidity: should remove all liquidity", async () => {
          const nativeAmount = await swapPool.nativeTokenAmount();
          const cerosAmount = await swapPool.cerosTokenAmount();
          const user1NativeBalBefore = await wNative.balanceOf(user1.address);
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
          expect(await swapPool.connect(user1).removeLiquidity(MaxUint256))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(
              user1.address,
              user1InitialLiqBoth,
              user1InitialLiqBoth,
              nativeAmount.sub(user1InitialLiqBoth),
              cerosAmount.sub(user1InitialLiqBoth),
              false
            );
  
          expect(await lp.balanceOf(user1.address)).eq(0);
          expect(await wNative.balanceOf(user1.address)).eq(
            user1NativeBalBefore.add(user1InitialLiqBoth)
          );
          expect(await cerosToken.balanceOf(user1.address)).eq(
            user1CerosBalBefore.add(user1InitialLiqBoth)
          );
        });
  
        it("removeLiquidity: remove after swapping", async () => {
          // do a swap
          const swapAmount = parseEther("200");
          await swapPool.connect(user1).swap(true, swapAmount, user1.address);
  
          const nativeAmountBefore = await swapPool.nativeTokenAmount();
          const cerosAmountBefore = await swapPool.cerosTokenAmount();
  
          const user1LpBalance = await lp.balanceOf(user1.address);
          const totalSupply = await lp.totalSupply();
          const user1NativeBalBefore = await wNative.balanceOf(user1.address);
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
  
          const expectedTransferredNative = nativeAmountBefore.mul(user1LpBalance).div(totalSupply);
          const expectedTransferredCeros = cerosAmountBefore.mul(user1LpBalance).div(totalSupply);
          expect(await swapPool.connect(user1).removeLiquidity(MaxUint256))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(
              user1.address,
              expectedTransferredNative,
              expectedTransferredCeros,
              nativeAmountBefore.sub(expectedTransferredNative),
              cerosAmountBefore.sub(expectedTransferredCeros),
              false
            );
  
          expect(await lp.balanceOf(user1.address)).eq(0);
          expect(await wNative.balanceOf(user1.address)).eq(
            user1NativeBalBefore.add(expectedTransferredNative)
          );
          expect(await cerosToken.balanceOf(user1.address)).eq(
            user1CerosBalBefore.add(expectedTransferredCeros)
          );
        });
  
        it("removeLiquidityPercent: remove after swapping", async () => {
          // do a swap
          const swapAmount = parseEther("200");
          await swapPool.connect(user1).swap(true, swapAmount, user1.address);
          // percent
          const percent = tenPow18.mul(7).div(10);
  
          const nativeAmountBefore = await swapPool.nativeTokenAmount();
          const cerosAmountBefore = await swapPool.cerosTokenAmount();
          const user1LpBalance = await lp.balanceOf(user1.address);
          const totalSupply = await lp.totalSupply();
          const user1NativeBalBefore = await wNative.balanceOf(user1.address);
          const user1CerosBalBefore = await cerosToken.balanceOf(user1.address);
  
          const expectedTransferredNative = nativeAmountBefore
            .mul(user1LpBalance)
            .mul(percent)
            .div(tenPow18)
            .div(totalSupply);
          const expectedTransferredCeros = cerosAmountBefore
            .mul(user1LpBalance)
            .mul(percent)
            .div(tenPow18)
            .div(totalSupply);
  
          expect(await swapPool.connect(user1).removeLiquidityPercent(percent))
            .to.emit(swapPool, "LiquidityChange")
            .withArgs(
              user1.address,
              expectedTransferredNative,
              expectedTransferredCeros,
              nativeAmountBefore.sub(expectedTransferredNative),
              cerosAmountBefore.sub(expectedTransferredCeros),
              false
            );
  
          expect(await lp.balanceOf(user1.address)).eq(
            user1LpBalance.mul(tenPow18.sub(percent)).div(tenPow18)
          );
          expect(await wNative.balanceOf(user1.address)).eq(
            user1NativeBalBefore.add(expectedTransferredNative)
          );
          expect(await cerosToken.balanceOf(user1.address)).eq(
            user1CerosBalBefore.add(expectedTransferredCeros)
          );
        });
      });
    });
  
    describe("# withdrawOwnerFee", () => {
      const user1InitialLiqBoth = parseEther("200");
      const user2InitialLiqBoth = parseEther("100");
      const tenPercent = BigNumber.from("10000");
      const ratio = tenPow18.mul(7).div(10);
  
      before("add liquidity, set fees and swap", async () => {
        // set ratio to 0.7
        await cerosToken.setRatio(ratio);
  
        // add liquidity
        await swapPool.connect(user1).addLiquidity(user1InitialLiqBoth, user1InitialLiqBoth);
        await swapPool.connect(user2).addLiquidity(user2InitialLiqBoth, user2InitialLiqBoth);
  
        // set fees
        await swapPool.setFee(tenPercent, FeeType.STAKE);
        await swapPool.setFee(tenPercent, FeeType.UNSTAKE);
        await swapPool.setFee(tenPercent, FeeType.OWNER);
        await swapPool.setFee(tenPercent, FeeType.MANAGER);
        await swapPool.setFee(tenPercent, FeeType.INTEGRATOR);
  
        // be sure that integrator lock is disabled
        assert.isFalse(await swapPool.integratorLockEnabled());
  
        // do some swaps to collect the fees
        const swapAmount = parseEther("50");
        await swapPool.connect(user1).swap(true, swapAmount, user1.address);
        await swapPool.connect(user1).swap(false, swapAmount, user1.address);
        await swapPool.connect(user2).swap(true, swapAmount, user2.address);
        await swapPool.connect(user2).swap(false, swapAmount, user2.address);
  
        await networkSnapshotter.newSnapshot();
      });
  
      after("revert", async () => await networkSnapshotter.revertLastSnapshot());
  
      describe("reverts:", () => {
        it("when the caller is not owner", async () => {
          await expect(swapPool.connect(user1).withdrawOwnerFee(0, 0)).to.be.revertedWith(
            "Ownable: caller is not the owner"
          );
        });
  
        it("when owner want to remove more than have(except MaxUint256)", async () => {
          const ownerFeeBefore = await swapPool.ownerFeeCollected();
          expect(ownerFeeBefore.nativeFee).not.eq(0);
          expect(ownerFeeBefore.cerosFee).not.eq(0);
          await expect(swapPool.connect(user1).withdrawOwnerFee(ownerFeeBefore.nativeFee.add(1), 0))
            .to.be.reverted;
          await expect(swapPool.connect(user1).withdrawOwnerFee(0, ownerFeeBefore.cerosFee.add(1))).to
            .be.reverted;
        });
      });
  
      describe("works", () => {
        it("withdrawOwnerFee full amount works", async () => {
          const ownerFeeBefore = await swapPool.ownerFeeCollected();
          expect(ownerFeeBefore.nativeFee).not.eq(0);
          expect(ownerFeeBefore.cerosFee).not.eq(0);
  
          const ownerNativeBalBefore = await wNative.balanceOf(deployer.address);
          const ownerCerosBalBefore = await cerosToken.balanceOf(deployer.address);
  
          await swapPool.withdrawOwnerFee(MaxUint256, MaxUint256);
  
          const ownerFeeAfter = await swapPool.ownerFeeCollected();
  
          expect(ownerFeeAfter.nativeFee).eq(0);
          expect(ownerFeeAfter.cerosFee).eq(0);
  
          expect(await wNative.balanceOf(deployer.address)).eq(
            ownerNativeBalBefore.add(ownerFeeBefore.nativeFee)
          );
          expect(await cerosToken.balanceOf(deployer.address)).eq(
            ownerCerosBalBefore.add(ownerFeeBefore.cerosFee)
          );
        });
  
        it("withdrawOwnerFeeEth full amount works", async () => {
          const ownerFeeBefore = await swapPool.ownerFeeCollected();
          expect(ownerFeeBefore.nativeFee).not.eq(0);
          expect(ownerFeeBefore.cerosFee).not.eq(0);
  
          const ownerNativeBalBefore = await deployer.getBalance();
          const ownerCerosBalBefore = await cerosToken.balanceOf(deployer.address);
  
          await swapPool.withdrawOwnerFeeEth(MaxUint256, MaxUint256);
  
          const ownerFeeAfter = await swapPool.ownerFeeCollected();
  
          expect(ownerFeeAfter.nativeFee).eq(0);
          expect(ownerFeeAfter.cerosFee).eq(0);
  
          expect(await deployer.getBalance()).lt(ownerNativeBalBefore.add(ownerFeeBefore.nativeFee));
          expect(await deployer.getBalance()).gt(ownerNativeBalBefore);
          expect(await cerosToken.balanceOf(deployer.address)).eq(
            ownerCerosBalBefore.add(ownerFeeBefore.cerosFee)
          );
        });
  
        it("withdrawOwnerFee partially works", async () => {
          const ownerFeeBefore = await swapPool.ownerFeeCollected();
          expect(ownerFeeBefore.nativeFee).not.eq(0);
          expect(ownerFeeBefore.cerosFee).not.eq(0);
  
          const amount0 = ownerFeeBefore.nativeFee.div(2);
          const amount1 = ownerFeeBefore.nativeFee.div(3);
  
          const ownerNativeBalBefore = await wNative.balanceOf(deployer.address);
          const ownerCerosBalBefore = await cerosToken.balanceOf(deployer.address);
  
          await swapPool.withdrawOwnerFee(amount0, amount1);
  
          const ownerFeeAfter = await swapPool.ownerFeeCollected();
  
          expect(ownerFeeAfter.nativeFee).eq(ownerFeeBefore.nativeFee.sub(amount0));
          expect(ownerFeeAfter.cerosFee).eq(ownerFeeBefore.cerosFee.sub(amount1));
  
          expect(await wNative.balanceOf(deployer.address)).eq(ownerNativeBalBefore.add(amount0));
          expect(await cerosToken.balanceOf(deployer.address)).eq(ownerCerosBalBefore.add(amount1));
        });
  
        it("withdrawOwnerFee will NOT fail if amounts are 0", async () => {
          const ownerFeeBefore = await swapPool.ownerFeeCollected();
          expect(ownerFeeBefore.nativeFee).not.eq(0);
          expect(ownerFeeBefore.cerosFee).not.eq(0);
  
          const ownerNativeBalBefore = await wNative.balanceOf(deployer.address);
          const ownerCerosBalBefore = await cerosToken.balanceOf(deployer.address);
  
          await swapPool.withdrawOwnerFee(0, 0);
  
          const ownerFeeAfter = await swapPool.ownerFeeCollected();
  
          expect(ownerFeeAfter.nativeFee).eq(ownerFeeBefore.nativeFee);
          expect(ownerFeeAfter.cerosFee).eq(ownerFeeBefore.cerosFee);
  
          expect(await wNative.balanceOf(deployer.address)).eq(ownerNativeBalBefore);
          expect(await cerosToken.balanceOf(deployer.address)).eq(ownerCerosBalBefore);
        });
      });
    });
  });