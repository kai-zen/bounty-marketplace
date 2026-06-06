// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {BountyEscrow} from "../BountyEscrow.sol";
import {SubmissionRegistry} from "../SubmissionRegistry.sol";
import {Test} from "forge-std/Test.sol";

contract SubmissionRegistryTest is Test {
  SubmissionRegistry registry;
  BountyEscrow escrow;

  address creator = makeAddr("creator");
  address submitter = makeAddr("submitter");
  address feeRecipient = makeAddr("feeRecipient");
  uint256 constant REWARD = 1 ether;
  uint256 constant PLATFORM_FEE_BPS = 250;
  uint256 deadline;

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
  }

  function test_SubmitWorkStoresSubmission() public {
    string memory submissionURI = "ipfs://submission-metadata";

    vm.prank(submitter);
    vm.expectEmit(true, true, true, true);
    emit SubmissionRegistry.WorkSubmitted(0, address(escrow), submitter, submissionURI);
    uint256 submissionId = registry.submitWork(address(escrow), submissionURI);

    require(submissionId == 0, "submission id mismatch");
    require(registry.submissionCount() == 1, "submission count mismatch");

    SubmissionRegistry.Submission memory submission = registry.getSubmission(submissionId);
    require(submission.id == submissionId, "stored id mismatch");
    require(submission.bountyAddress == address(escrow), "bounty mismatch");
    require(submission.submitter == submitter, "submitter mismatch");
    require(keccak256(bytes(submission.submissionURI)) == keccak256(bytes(submissionURI)), "uri mismatch");
    require(submission.status == SubmissionRegistry.SubmissionStatus.Pending, "status mismatch");

    uint256[] memory bountySubmissions = registry.getSubmissionsForBounty(address(escrow));
    require(bountySubmissions.length == 1, "bounty submissions length mismatch");
    require(bountySubmissions[0] == submissionId, "bounty submission id mismatch");

    uint256[] memory submitterSubmissions = registry.getSubmissionsBySubmitter(submitter);
    require(submitterSubmissions.length == 1, "submitter submissions length mismatch");
    require(submitterSubmissions[0] == submissionId, "submitter submission id mismatch");
  }

  function test_MarkSelectedUpdatesStatus() public {
    vm.prank(submitter);
    uint256 submissionId = registry.submitWork(address(escrow), "ipfs://submission-metadata");

    vm.prank(creator);
    vm.expectEmit(true, true, true, false);
    emit SubmissionRegistry.SubmissionSelected(submissionId, address(escrow), submitter);
    registry.markSelected(submissionId);

    SubmissionRegistry.Submission memory submission = registry.getSubmission(submissionId);
    require(submission.status == SubmissionRegistry.SubmissionStatus.Selected, "status should be Selected");
  }

  function test_SubmissionExistsReturnsTrueForPendingSubmission() public {
    vm.prank(submitter);
    uint256 submissionId = registry.submitWork(address(escrow), "ipfs://submission-metadata");

    require(registry.submissionExists(address(escrow), submitter, submissionId), "submission should exist");
  }

  function test_SubmissionExistsReturnsFalseAfterSelected() public {
    vm.prank(submitter);
    uint256 submissionId = registry.submitWork(address(escrow), "ipfs://submission-metadata");

    vm.prank(creator);
    registry.markSelected(submissionId);

    require(!registry.submissionExists(address(escrow), submitter, submissionId), "selected submission should not exist");
  }

  function test_RevertWhenCreatorSubmitsWork() public {
    vm.prank(creator);
    vm.expectRevert("SubmissionRegistry: creator cannot submit");
    registry.submitWork(address(escrow), "ipfs://submission-metadata");
  }

  function test_RevertWhenSubmitWorkWithEmptyURI() public {
    vm.prank(submitter);
    vm.expectRevert("SubmissionRegistry: empty submission URI");
    registry.submitWork(address(escrow), "");
  }

  function test_RevertWhenSubmitWorkAfterDeadline() public {
    vm.warp(deadline + 1);

    vm.prank(submitter);
    vm.expectRevert("SubmissionRegistry: bounty expired");
    registry.submitWork(address(escrow), "ipfs://submission-metadata");
  }

  function test_RevertWhenNonCreatorMarksSelected() public {
    vm.prank(submitter);
    uint256 submissionId = registry.submitWork(address(escrow), "ipfs://submission-metadata");

    vm.prank(submitter);
    vm.expectRevert("SubmissionRegistry: not authorized");
    registry.markSelected(submissionId);
  }

  function test_RevertWhenGetInvalidSubmission() public {
    vm.expectRevert("SubmissionRegistry: invalid submission");
    registry.getSubmission(0);
  }
}
