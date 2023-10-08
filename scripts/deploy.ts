import { ethers } from "hardhat";
import { deployToken, deployTracking } from "../utils/deploy";

async function main() {
  const Token = await deployToken('InnovaTkn', 'INN');
  const TokenAddress = await Token.getAddress();
  const Tracking = await deployTracking(TokenAddress);
  const TrackingAddress = await Tracking.getAddress();

  console.log("Token deployed to:", TokenAddress);
  console.log("Tracking deployed to:", TrackingAddress);

  await Token.approve(TrackingAddress, ethers.MaxUint256);
}

main().catch((error) => {
  console.error(error);
}).finally(() => {
  process.exit();
});
