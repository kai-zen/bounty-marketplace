// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface ISubmissionRegistry {
  function submissionExists(
    address bounty,
    address submitter,
    uint256 submissionId
  ) external view returns (bool);

  function markSelected(uint256 submissionId) external;
}

/// @notice Holds ETH for a specific bounty and manages award, claim, and refund lifecycle.
contract BountyEscrow {
  enum BountyStatus {
    Open,
    Awarded,
    Claimed,
    Refunded
  }

  struct BountyDetails {
    address creator;
    uint256 reward;
    uint256 deadline;
    string metadataURI;
    BountyStatus status;
    address winner;
    uint256 winningSubmissionId;
    address submissionRegistry;
    address feeRecipient;
    uint256 platformFeeBps;
  }

  address public creator;
  uint256 public reward;
  uint256 public deadline;
  string public metadataURI;
  BountyStatus public status;
  address public winner;
  uint256 public winningSubmissionId;
  address public submissionRegistry;
  address public feeRecipient;
  uint256 public platformFeeBps;

  event WinnerAwarded(address indexed winner, uint256 indexed submissionId);
  event RewardClaimed(address indexed winner, uint256 winnerAmount);
  event PlatformFeePaid(address indexed feeRecipient, uint256 feeAmount);
  event BountyRefunded(address indexed creator, uint256 amount);

  constructor(
    address _creator,
    uint256 _deadline,
    string memory _metadataURI,
    address _submissionRegistry,
    address _feeRecipient,
    uint256 _platformFeeBps
  ) payable {
    require(_creator != address(0), "BountyEscrow: invalid creator");
    require(_submissionRegistry != address(0), "BountyEscrow: invalid submission registry");
    require(_feeRecipient != address(0), "BountyEscrow: invalid fee recipient");
    require(_platformFeeBps <= 10_000, "BountyEscrow: fee exceeds max");
    require(_deadline > block.timestamp, "BountyEscrow: deadline in past");
    require(msg.value > 0, "BountyEscrow: zero reward");
    require(bytes(_metadataURI).length > 0, "BountyEscrow: empty metadata URI");

    creator = _creator;
    reward = msg.value;
    deadline = _deadline;
    metadataURI = _metadataURI;
    status = BountyStatus.Open;
    submissionRegistry = _submissionRegistry;
    feeRecipient = _feeRecipient;
    platformFeeBps = _platformFeeBps;
  }

  function awardWinner(address _winner, uint256 _submissionId) external {
    require(msg.sender == creator, "BountyEscrow: not creator");
    require(status == BountyStatus.Open, "BountyEscrow: not open");
    require(block.timestamp <= deadline, "BountyEscrow: deadline passed");
    require(_winner != address(0), "BountyEscrow: invalid winner");
    require(
      ISubmissionRegistry(submissionRegistry).submissionExists(address(this), _winner, _submissionId),
      "BountyEscrow: invalid submission"
    );

    winner = _winner;
    winningSubmissionId = _submissionId;
    status = BountyStatus.Awarded;

    ISubmissionRegistry(submissionRegistry).markSelected(_submissionId);

    emit WinnerAwarded(_winner, _submissionId);
  }

  function claimReward() external {
    require(status == BountyStatus.Awarded, "BountyEscrow: not awarded");
    require(msg.sender == winner, "BountyEscrow: not winner");

    status = BountyStatus.Claimed;

    uint256 feeAmount = (reward * platformFeeBps) / 10_000;
    uint256 winnerAmount = reward - feeAmount;

    if (feeAmount > 0) {
      (bool feeSent,) = feeRecipient.call{value: feeAmount}("");
      require(feeSent, "BountyEscrow: fee transfer failed");
      emit PlatformFeePaid(feeRecipient, feeAmount);
    }

    (bool rewardSent,) = winner.call{value: winnerAmount}("");
    require(rewardSent, "BountyEscrow: reward transfer failed");

    emit RewardClaimed(winner, winnerAmount);
  }

  function refundExpired() external {
    require(msg.sender == creator, "BountyEscrow: not creator");
    require(status == BountyStatus.Open, "BountyEscrow: not open");
    require(block.timestamp > deadline, "BountyEscrow: deadline not passed");

    status = BountyStatus.Refunded;

    (bool refunded,) = creator.call{value: reward}("");
    require(refunded, "BountyEscrow: refund transfer failed");

    emit BountyRefunded(creator, reward);
  }

  function getBountyDetails() external view returns (BountyDetails memory) {
    return BountyDetails({
      creator: creator,
      reward: reward,
      deadline: deadline,
      metadataURI: metadataURI,
      status: status,
      winner: winner,
      winningSubmissionId: winningSubmissionId,
      submissionRegistry: submissionRegistry,
      feeRecipient: feeRecipient,
      platformFeeBps: platformFeeBps
    });
  }
}
