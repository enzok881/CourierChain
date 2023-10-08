// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Tracking is AccessControl, Ownable {
  bytes32 public constant TRACKER_ROLE = keccak256("TRACKER_ROLE");

  uint public constant shippingFee = 8 * 10 ** 6;

  IERC20 private token;

  enum TrackingStatus { Ordered, Shipped, Delivered, Failed, Refunded }

  event TrackingStatusUpdated(
    string orderId, 
    TrackingStatus from, 
    TrackingStatus to
  );

  struct TrackingOrder {
    address orderCreator;
    uint orderAmount;
    uint createdAt;
    uint expiredAt;
    Package package;
    TrackingStatus status;
  }

  struct Package {
    string productName;
    uint width;
    uint height;
    uint length;
    uint weight;
  }

  mapping (string orderId => TrackingOrder) orderTracking;

  constructor(address _token) {
    token = IERC20(_token);

    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _setupRole(TRACKER_ROLE, msg.sender);
  }

  function getOrderTracking(string calldata orderId) public view returns (TrackingOrder memory) {
    return orderTracking[orderId];
  }

  function createTrack(
    string calldata orderId,
    uint orderAmount,
    string calldata productName,
    uint width,
    uint height,
    uint length,
    uint weight
  ) public {
    require(bytes(orderId).length > 0, "Order ID is required");
    require(orderAmount > 0, "Order amount must be greater than 0");
    require(bytes(productName).length > 0, "Product name is required");
    require(width > 0, "Width must be greater than 0");
    require(height > 0, "Height must be greater than 0");
    require(length > 0, "Length amount must be greater than 0");
    require(weight > 0, "Weight amount must be greater than 0");
    require(orderTracking[orderId].createdAt == 0, "Track already exists");
    require(token.balanceOf(owner()) >= orderAmount, "Insufficient balance to pay package insurance");
    require(token.balanceOf(msg.sender) >= shippingFee, "Insufficient balance to pay shipping fee");

    SafeERC20.safeTransferFrom(token, owner(), address(this), orderAmount);
    SafeERC20.safeTransferFrom(token, msg.sender, address(this), shippingFee);

    orderTracking[orderId] = TrackingOrder({
      orderCreator: msg.sender,
      orderAmount: orderAmount,
      createdAt: block.timestamp,
      expiredAt: block.timestamp + 5 days,
      package: Package({
        width: width,
        height: height,
        length: length,
        weight: weight,
        productName: productName
      }),
      status: TrackingStatus.Ordered
    });
  }

  modifier validTracking(string calldata orderId, TrackingStatus status) {
    require(orderTracking[orderId].createdAt > 0, "Tracking does not exist");
    require(orderTracking[orderId].status != status, "Tracking status is the same");

    bool isOrdered = orderTracking[orderId].status == TrackingStatus.Ordered;
    bool isShipped = orderTracking[orderId].status == TrackingStatus.Shipped;
    bool isExpired = orderTracking[orderId].expiredAt < block.timestamp;

    if (status == TrackingStatus.Shipped && !isExpired) {
      require(isOrdered, "Tracking status cannot be shipped");
    } else if (status == TrackingStatus.Delivered && !isExpired) {
      require(isShipped, "Tracking status cannot be delivered");
    } else if (status == TrackingStatus.Failed) {
      require(isOrdered || isShipped, "Tracking status cannot be failed");
    } else if (status == TrackingStatus.Refunded && isExpired) {
      require(isOrdered || isShipped, "Tracking status cannot be refunded");
    } else {
      revert("Invalid tracking status");
    }

    _;
  }

  function updateTrackingStatus(
    string calldata orderId,
    TrackingStatus status
  ) public onlyRole(TRACKER_ROLE) validTracking(orderId, status) {
    TrackingStatus currStatus = orderTracking[orderId].status;

    orderTracking[orderId].status = status;

    address orderCreator = orderTracking[orderId].orderCreator;
    uint releaseTokens = orderTracking[orderId].orderAmount + shippingFee;

    if (status == TrackingStatus.Failed) {
      SafeERC20.safeTransfer(token, orderCreator, releaseTokens);
    } else if (status == TrackingStatus.Refunded) {
      SafeERC20.safeTransfer(token, orderCreator, shippingFee);
    } else {
      SafeERC20.safeTransfer(token, owner(), releaseTokens);
    }

    emit TrackingStatusUpdated(orderId, currStatus, status);
  }
}