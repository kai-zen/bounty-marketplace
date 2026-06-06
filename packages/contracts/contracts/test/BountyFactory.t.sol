// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {BountyEscrow} from "../BountyEscrow.sol";
import {BountyFactory} from "../BountyFactory.sol";
import {SubmissionRegistry} from "../SubmissionRegistry.sol";
import {Test} from "forge-std/Test.sol";

contract BountyFactoryTest is Test {
  SubmissionRegistry registry;
  BountyFactory factory;
  address feeRecipient = makeAddr("feeRecipient");
  uint256 constant PLATFORM_FEE_BPS = 250;

  function setUp() public {
    registry = new SubmissionRegistry();
    factory = new BountyFactory(address(registry), feeRecipient, PLATFORM_FEE_BPS);
  }

  function test_ConstructorSetsState() public view {
    require(factory.owner() == address(this), "owner mismatch");
    require(factory.submissionRegistry() == address(registry), "registry mismatch");
    require(factory.feeRecipient() == feeRecipient, "fee recipient mismatch");
    require(factory.platformFeeBps() == PLATFORM_FEE_BPS, "fee bps mismatch");
    require(factory.bountyCount() == 0, "initial bounty count should be zero");
  }

  function test_CreateBountyDeploysEscrowAndTracksIt() public {
    uint256 deadline = block.timestamp + 1 days;
    string memory metadataURI = "ipfs://bounty-metadata";
    uint256 bountyAmount = 1 ether;

    vm.expectEmit(true, false, true, true);
    emit BountyFactory.BountyCreated(0, address(0), address(this), deadline, metadataURI, bountyAmount);

    factory.createBounty{value: bountyAmount}(deadline, metadataURI);

    address[] memory allBounties = factory.getAllBounties();
    require(allBounties.length == 1, "expected one bounty");
    require(factory.bountyCount() == 1, "bounty count should be one");

    BountyEscrow escrow = BountyEscrow(payable(allBounties[0]));
    require(escrow.creator() == address(this), "creator mismatch");
    require(escrow.deadline() == deadline, "deadline mismatch");
    require(keccak256(bytes(escrow.metadataURI())) == keccak256(bytes(metadataURI)), "metadata mismatch");
    require(escrow.reward() == bountyAmount, "reward mismatch");
    require(escrow.submissionRegistry() == address(registry), "registry mismatch");
    require(escrow.feeRecipient() == feeRecipient, "escrow fee recipient mismatch");
    require(escrow.platformFeeBps() == PLATFORM_FEE_BPS, "escrow fee bps mismatch");
    require(uint256(escrow.status()) == 0, "status should be Open");
    require(address(escrow).balance == bountyAmount, "escrow balance mismatch");

    address[] memory creatorBounties = factory.getBountiesByCreator(address(this));
    require(creatorBounties.length == 1, "expected one creator bounty");
    require(creatorBounties[0] == allBounties[0], "creator bounty address mismatch");
  }

  function test_OwnerCanUpdateFeeConfig() public {
    address newFeeRecipient = makeAddr("newFeeRecipient");
    uint256 newFeeBps = 500;

    factory.setFeeRecipient(newFeeRecipient);
    require(factory.feeRecipient() == newFeeRecipient, "fee recipient not updated");

    factory.setPlatformFeeBps(newFeeBps);
    require(factory.platformFeeBps() == newFeeBps, "fee bps not updated");
  }

  function test_RevertWhenNonOwnerUpdatesFeeConfig() public {
    address stranger = makeAddr("stranger");

    vm.prank(stranger);
    vm.expectRevert("BountyFactory: not owner");
    factory.setFeeRecipient(makeAddr("anotherRecipient"));

    vm.prank(stranger);
    vm.expectRevert("BountyFactory: not owner");
    factory.setPlatformFeeBps(100);
  }

  function test_RevertWhenCreateBountyWithZeroValue() public {
    vm.expectRevert("BountyFactory: zero bounty amount");
    factory.createBounty(block.timestamp + 1 days, "ipfs://metadata");
  }

  function test_RevertWhenCreateBountyWithPastDeadline() public {
    vm.expectRevert("BountyFactory: deadline in past");
    factory.createBounty{value: 1 ether}(block.timestamp - 1, "ipfs://metadata");
  }

  function test_RevertWhenCreateBountyWithEmptyMetadata() public {
    vm.expectRevert("BountyFactory: empty metadata URI");
    factory.createBounty{value: 1 ether}(block.timestamp + 1 days, "");
  }

  function test_RevertWhenFeeBpsTooHigh() public {
    vm.expectRevert("BountyFactory: fee exceeds max");
    factory.setPlatformFeeBps(10_001);
  }
}
