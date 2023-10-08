import trackingAbi from "./tracking.abi";

export enum TrackingStatus {
  Ordered = 0, 
  Shipped = 1,
  Delivered = 2, 
  Failed = 3,
  Refunded = 4
}

export const trackingConfig = {
  contractAddress: '0x7c920773b73998a5f0ae5fc26e92b03a2a1302c2',
  contractAbi: trackingAbi,
}