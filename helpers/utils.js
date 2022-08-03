const { BigNumber } = require("ethers");
const { ethers, network, hre } = require("hardhat");

const verifyContract = async (
  contractAddress,
  constructorArguments
) => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    const tx = await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments,
    });
    console.log(tx);

    await sleep(16000);
  } catch (error) {
    console.log("error is ->");
    console.log(error);
    console.log("cannot verify contract", contractAddress);
    await sleep(16000);
  }
  console.log("contract", contractAddress, "verified successfully");
};

const advanceTime = async (seconds) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
};

const advanceBlock = async (blockCount) => {
  for (let i = 0; i < blockCount; i++) {
    await network.provider.send("evm_mine");
  }
};

const advanceBlockAndTime = async (blockCount, seconds) => {
  const secondPerBlock = Math.floor(seconds / blockCount);
  for (let i = 0; i < blockCount; i++) {
    await advanceTime(secondPerBlock);
  }
};

const setTimestamp = async (seconds) => {
  await network.provider.send("evm_setNextBlockTimestamp", [seconds]);
  await network.provider.send("evm_mine");
};

const getTimestamp = async () => {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp;
};

const daysToSeconds = (days) => {
  return hoursToSeconds(days.mul(24));
};

const hoursToSeconds = (hours) => {
  return minutesToSeconds(hours.mul(60));
};

const minutesToSeconds = (minutes) => {
  return minutes.mul(60);
};

const getNextTimestampDivisibleBy = async (num) => {
  const blockTimestamp = await getTimestamp();
  const numCount = BigNumber.from(blockTimestamp).div(num);
  return numCount.add(1).mul(num);
};

const toWad = (num) => {
  return ethers.utils.parseUnits(num, 18);
};

const toRay = (num) => {
  return ethers.utils.parseUnits(num, 27);
};

const toRad = (num) => {
  return ethers.utils.parseUnits(num, 45);
};

module.exports = {
  verifyContract,
  advanceTime,
  advanceBlock,
  advanceBlockAndTime,
  setTimestamp,
  getTimestamp,
  daysToSeconds,
  hoursToSeconds,
  minutesToSeconds,
  getNextTimestampDivisibleBy,
  toWad,
  toRay,
  toRad,
};