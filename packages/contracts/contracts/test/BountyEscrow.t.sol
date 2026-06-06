// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {BountyEscrow} from "../BountyEscrow.sol";
import {SubmissionRegistry} from "../SubmissionRegistry.sol";
import {Test} from "forge-std/Test.sol";

contract BountyEscrowTest is Test {
  SubmissionRegistry registry;
  BountyEscrow escrow;

  address creator = makeAddr("creator");
  address winner = makeAddr("winner");
  address feeRecipient = makeAddr("feeRecipient");
  uint256 constant REWARD = 1 ether;
  uint256 constant PLATFORM_FEE_BPS = 250;
  uint256 deadline;
  uint256 submissionId;

  function setUp() public {
    registry = new SubmissionRegistry();
    deadline = block.timestamp + 1 days;

    vm.deal(creator, REWARD);
    vm.prank(creator);
    escrow = new BountyEscrow{value: REWARD}(
      creator,
      deadline,
      "ipfs://bounty-metadata",
      address(registry),
      feeRecipient,
      PLATFORM_FEE_BPS
    );

    vm.prank(winner);
    submissionId = registry.submitWork(address(escrow), "ipfs://submission-metadata");
  }

  function test_InitialState() public view {
    BountyEscrow.BountyDetails memory details = escrow.getBountyDetails();

    require(details.creator == creator, "creator mismatch");
    require(details.reward == REWARD, "reward mismatch");
    require(details.deadline == deadline, "deadline mismatch");
    require(keccak256(bytes(details.metadataURI)) == keccak256(bytes("ipfs://bounty-metadata")), "metadata mismatch");
    require(details.status == BountyEscrow.BountyStatus.Open, "status mismatch");
    require(details.winner == address(0), "winner should be unset");
    require(details.winningSubmissionId == 0, "submission id should be unset");
    require(details.submissionRegistry == address(registry), "registry mismatch");
    require(details.feeRecipient == feeRecipient, "fee recipient mismatch");
    require(details.platformFeeBps == PLATFORM_FEE_BPS, "fee bps mismatch");
  }

  function test_AwardWinnerMarksSubmissionSelected() public {
    vm.prank(creator);
    vm.expectEmit(true, true, false, false);
    emit BountyEscrow.WinnerAwarded(winner, submissionId);
    escrow.awardWinner(winner, submissionId);

    require(escrow.winner() == winner, "winner mismatch");
    require(escrow.winningSubmissionId() == submissionId, "submission id mismatch");
    require(escrow.status() == BountyEscrow.BountyStatus.Awarded, "status should be Awarded");

    SubmissionRegistry.Submission memory submission = registry.getSubmission(submissionId);
    require(submission.status == SubmissionRegistry.SubmissionStatus.Selected, "submission should be selected");
  }

  function test_ClaimRewardPaysWinnerAndPlatformFee() public {
    vm.prank(creator);
    escrow.awardWinner(winner, submissionId);

    uint256 feeAmount = (REWARD * PLATFORM_FEE_BPS) / 10_000;
    uint256 winnerAmount = REWARD - feeAmount;

    vm.prank(winner);
    escrow.claimReward();

    require(escrow.status() == BountyEscrow.BountyStatus.Claimed, "status should be Claimed");
    require(winner.balance == winnerAmount, "winner balance mismatch");
    require(feeRecipient.balance == feeAmount, "fee recipient balance mismatch");
    require(address(escrow).balance == 0, "escrow should be empty");
  }

  function test_RefundExpired() public {
    vm.warp(deadline + 1);

    vm.prank(creator);
    escrow.refundExpired();

    require(escrow.status() == BountyEscrow.BountyStatus.Refunded, "status should be Refunded");
    require(creator.balance == REWARD, "creator refund mismatch");
    require(address(escrow).balance == 0, "escrow should be empty");
  }

  function test_RevertWhenAwardWinnerWithInvalidSubmission() public {
    vm.prank(creator);
    vm.expectRevert("BountyEscrow: invalid submission");
    escrow.awardWinner(winner, submissionId + 1);
  }

  function test_RevertWhenNonCreatorAwardsWinner() public {
    vm.prank(winner);
    vm.expectRevert("BountyEscrow: not creator");
    escrow.awardWinner(winner, submissionId);
  }

  function test_RevertWhenRefundBeforeDeadline() public {
    vm.prank(creator);
    vm.expectRevert("BountyEscrow: deadline not passed");
    escrow.refundExpired();
  }

  function test_RevertWhenClaimBeforeAward() public {
    vm.prank(winner);
    vm.expectRevert("BountyEscrow: not awarded");
    escrow.claimReward();
  }
}
