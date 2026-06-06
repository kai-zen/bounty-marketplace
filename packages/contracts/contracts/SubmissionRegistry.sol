// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IBountyEscrow {
  function creator() external view returns (address);

  function deadline() external view returns (uint256);

  function status() external view returns (uint8);
}

/// @notice Stores lightweight on-chain proofs of bounty submissions.
contract SubmissionRegistry {
  enum SubmissionStatus {
    Pending,
    Selected
  }

  struct Submission {
    uint256 id;
    address bountyAddress;
    address submitter;
    string submissionURI;
    SubmissionStatus status;
  }

  uint256 public submissionCount;
  mapping(uint256 => Submission) public submissions;
  mapping(address => uint256[]) private _bountySubmissions;
  mapping(address => uint256[]) private _submitterSubmissions;

  event WorkSubmitted(
    uint256 indexed submissionId,
    address indexed bountyAddress,
    address indexed submitter,
    string submissionURI
  );
  event SubmissionSelected(
    uint256 indexed submissionId,
    address indexed bountyAddress,
    address indexed submitter
  );

  function submitWork(address _bountyAddress, string calldata _submissionURI) external returns (uint256) {
    require(_bountyAddress != address(0), "SubmissionRegistry: invalid bounty");
    require(bytes(_submissionURI).length > 0, "SubmissionRegistry: empty submission URI");

    IBountyEscrow bounty = IBountyEscrow(_bountyAddress);
    require(bounty.status() == 0, "SubmissionRegistry: bounty not open");
    require(block.timestamp <= bounty.deadline(), "SubmissionRegistry: bounty expired");
    require(msg.sender != bounty.creator(), "SubmissionRegistry: creator cannot submit");

    uint256 submissionId = submissionCount;

    submissions[submissionId] = Submission({
      id: submissionId,
      bountyAddress: _bountyAddress,
      submitter: msg.sender,
      submissionURI: _submissionURI,
      status: SubmissionStatus.Pending
    });

    _bountySubmissions[_bountyAddress].push(submissionId);
    _submitterSubmissions[msg.sender].push(submissionId);
    submissionCount++;

    emit WorkSubmitted(submissionId, _bountyAddress, msg.sender, _submissionURI);

    return submissionId;
  }

  function markSelected(uint256 _submissionId) external {
    Submission storage submission = submissions[_submissionId];
    require(submission.bountyAddress != address(0), "SubmissionRegistry: invalid submission");
    require(submission.status == SubmissionStatus.Pending, "SubmissionRegistry: not pending");
    require(
      msg.sender == IBountyEscrow(submission.bountyAddress).creator()
        || msg.sender == submission.bountyAddress,
      "SubmissionRegistry: not authorized"
    );

    submission.status = SubmissionStatus.Selected;

    emit SubmissionSelected(_submissionId, submission.bountyAddress, submission.submitter);
  }

  function submissionExists(
    address bounty,
    address submitter,
    uint256 submissionId
  ) external view returns (bool) {
    Submission storage submission = submissions[submissionId];
    return submission.bountyAddress == bounty
      && submission.submitter == submitter
      && submission.status == SubmissionStatus.Pending;
  }

  function getSubmission(uint256 _submissionId) external view returns (Submission memory) {
    Submission memory submission = submissions[_submissionId];
    require(submission.bountyAddress != address(0), "SubmissionRegistry: invalid submission");
    return submission;
  }

  function getSubmissionsForBounty(address _bountyAddress) external view returns (uint256[] memory) {
    return _bountySubmissions[_bountyAddress];
  }

  function getSubmissionsBySubmitter(address _submitter) external view returns (uint256[] memory) {
    return _submitterSubmissions[_submitter];
  }
}
