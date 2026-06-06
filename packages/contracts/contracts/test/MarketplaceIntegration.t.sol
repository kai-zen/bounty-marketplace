// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {BountyEscrow} from "../BountyEscrow.sol";
import {BountyFactory} from "../BountyFactory.sol";
import {SubmissionRegistry} from "../SubmissionRegistry.sol";
import {Test} from "forge-std/Test.sol";

contract MarketplaceIntegrationTest is Test {
  SubmissionRegistry registry;
  BountyFactory factory;

  address creator = makeAddr("creator");
  address submitter = makeAddr("submitter");
  address feeRecipient = makeAddr("feeRecipient");
  uint256 constant REWARD = 2 ether;
  uint256 constant PLATFORM_FEE_BPS = 500;

  function setUp() public {
    registry = new SubmissionRegistry();
    factory = new BountyFactory(address(registry), feeRecipient, PLATFORM_FEE_BPS);
  }

  function test_FullBountyLifecycle() public {
    uint256 deadline = block.timestamp + 7 days;
    string memory bountyURI = "ipfs://bounty/full-flow";
    string memory submissionURI = "ipfs://submission/full-flow";

    vm.deal(creator, REWARD);
    vm.prank(creator);
    factory.createBounty{value: REWARD}(deadline, bountyURI);

    address escrowAddress = factory.getAllBounties()[0];
    BountyEscrow escrow = BountyEscrow(payable(escrowAddress));

    vm.prank(submitter);
    uint256 submissionId = registry.submitWork(escrowAddress, submissionURI);

    require(registry.getSubmissionsForBounty(escrowAddress).length == 1, "expected one bounty submission");
    require(registry.getSubmissionsBySubmitter(submitter).length == 1, "expected one submitter submission");

    vm.prank(creator);
    escrow.awardWinner(submitter, submissionId);

    uint256 feeAmount = (REWARD * PLATFORM_FEE_BPS) / 10_000;
    uint256 winnerAmount = REWARD - feeAmount;

    vm.prank(submitter);
    escrow.claimReward();

    require(escrow.status() == BountyEscrow.BountyStatus.Claimed, "bounty should be claimed");
    require(submitter.balance == winnerAmount, "winner payout mismatch");
    require(feeRecipient.balance == feeAmount, "platform fee mismatch");
    require(address(escrow).balance == 0, "escrow should be empty");

    SubmissionRegistry.Submission memory submission = registry.getSubmission(submissionId);
    require(submission.status == SubmissionRegistry.SubmissionStatus.Selected, "submission should be selected");
  }

  function test_ExpiredBountyRefundFlow() public {
    uint256 deadline = block.timestamp + 1 days;

    vm.deal(creator, REWARD);
    vm.prank(creator);
    factory.createBounty{value: REWARD}(deadline, "ipfs://bounty/refund-flow");

    address escrowAddress = factory.getAllBounties()[0];
    BountyEscrow escrow = BountyEscrow(payable(escrowAddress));

    vm.prank(submitter);
    registry.submitWork(escrowAddress, "ipfs://submission/refund-flow");

    vm.warp(deadline + 1);

    vm.prank(creator);
    escrow.refundExpired();

    require(escrow.status() == BountyEscrow.BountyStatus.Refunded, "bounty should be refunded");
    require(creator.balance == REWARD, "creator should receive full refund");
    require(address(escrow).balance == 0, "escrow should be empty");
  }
}
