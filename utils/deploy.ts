import { ethers } from "hardhat";

export async function deployToken(name: string, symbol: string) {
  const TokenFactory = await ethers.getContractFactory("Token");
  const Token = await TokenFactory.deploy(name, symbol);

  await Token.waitForDeployment();

  return Token;
}

export async function deployTracking(tokenAddress: string) {
  const TrackingFactory = await ethers.getContractFactory("Tracking");
  const Tracking = await TrackingFactory.deploy(tokenAddress);

  await Tracking.waitForDeployment();

  return Tracking;
}