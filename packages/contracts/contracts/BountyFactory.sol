// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {BountyEscrow} from "./BountyEscrow.sol";

/// @notice Creates and tracks bounty escrows and manages platform fee configuration.
contract BountyFactory {
  address public owner;
  uint256 public bountyCount;
  address public submissionRegistry;
  address public feeRecipient;
  uint256 public platformFeeBps;

  address[] private _allBounties;
  mapping(address => address[]) private _creatorBounties;

  event BountyCreated(
    uint256 indexed bountyId,
    address indexed escrow,
    address indexed creator,
    uint256 deadline,
    string metadataURI,
    uint256 amount
  );
  event FeeRecipientUpdated(address indexed previousRecipient, address indexed newRecipient);
  event PlatformFeeUpdated(uint256 previousFeeBps, uint256 newFeeBps);

  modifier onlyOwner() {
    require(msg.sender == owner, "BountyFactory: not owner");
    _;
  }

  constructor(address _submissionRegistry, address _feeRecipient, uint256 _platformFeeBps) {
    require(_submissionRegistry != address(0), "BountyFactory: invalid submission registry");
    require(_feeRecipient != address(0), "BountyFactory: invalid fee recipient");
    require(_platformFeeBps <= 10_000, "BountyFactory: fee exceeds max");

    owner = msg.sender;
    submissionRegistry = _submissionRegistry;
    feeRecipient = _feeRecipient;
    platformFeeBps = _platformFeeBps;
  }

  function createBounty(uint256 _deadline, string calldata _metadataURI) external payable {
    require(_deadline > block.timestamp, "BountyFactory: deadline in past");
    require(msg.value > 0, "BountyFactory: zero bounty amount");
    require(bytes(_metadataURI).length > 0, "BountyFactory: empty metadata URI");

    uint256 bountyId = bountyCount;

    BountyEscrow escrow = new BountyEscrow{value: msg.value}(
      msg.sender,
      _deadline,
      _metadataURI,
      submissionRegistry,
      feeRecipient,
      platformFeeBps
    );

    address escrowAddress = address(escrow);
    _allBounties.push(escrowAddress);
    _creatorBounties[msg.sender].push(escrowAddress);
    bountyCount++;

    emit BountyCreated(bountyId, escrowAddress, msg.sender, _deadline, _metadataURI, msg.value);
  }

  function setFeeRecipient(address _feeRecipient) external onlyOwner {
    require(_feeRecipient != address(0), "BountyFactory: invalid fee recipient");

    address previousRecipient = feeRecipient;
    feeRecipient = _feeRecipient;

    emit FeeRecipientUpdated(previousRecipient, _feeRecipient);
  }

  function setPlatformFeeBps(uint256 _bps) external onlyOwner {
    require(_bps <= 10_000, "BountyFactory: fee exceeds max");

    uint256 previousFeeBps = platformFeeBps;
    platformFeeBps = _bps;

    emit PlatformFeeUpdated(previousFeeBps, _bps);
  }

  function getAllBounties() external view returns (address[] memory) {
    return _allBounties;
  }

  function getBountiesByCreator(address _creator) external view returns (address[] memory) {
    return _creatorBounties[_creator];
  }
}
