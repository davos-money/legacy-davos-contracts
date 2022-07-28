import { BigNumber } from "ethers";
import hre, { ethers, network } from "hardhat";

export const verifyContract = async (
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

export const advanceTime = async (seconds) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
};

export const advanceBlock = async (blockCount) => {
  for (let i = 0; i < blockCount; i++) {
    await network.provider.send("evm_mine");
  }
};

export const advanceBlockAndTime = async (blockCount, seconds) => {
  const secondPerBlock = Math.floor(seconds / blockCount);
  for (let i = 0; i < blockCount; i++) {
    await advanceTime(secondPerBlock);
  }
};

export const setTimestamp = async (seconds) => {
  await network.provider.send("evm_setNextBlockTimestamp", [seconds]);
  await network.provider.send("evm_mine");
};

export const getTimestamp = async () => {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp;
};

export const daysToSeconds = (days) => {
  return hoursToSeconds(days.mul(24));
};

export const hoursToSeconds = (hours) => {
  return minutesToSeconds(hours.mul(60));
};

export const minutesToSeconds = (minutes) => {
  return minutes.mul(60);
};

export const getNextTimestampDivisibleBy = async (num) => {
  const blockTimestamp = await getTimestamp();
  const numCount = BigNumber.from(blockTimestamp).div(num);
  return numCount.add(1).mul(num);
};

export default {
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
};