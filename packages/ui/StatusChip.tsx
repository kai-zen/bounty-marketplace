import Chip, { type ChipProps } from "@mui/material/Chip";
import { BountyStatus, SubmissionStatus } from "@bounty/types";

type BountyStatusChipProps = {
  kind: "bounty";
  status: BountyStatus;
  size?: ChipProps["size"];
};

type SubmissionStatusChipProps = {
  kind: "submission";
  status: SubmissionStatus;
  size?: ChipProps["size"];
};

export type StatusChipProps = BountyStatusChipProps | SubmissionStatusChipProps;

function bountyStatusPresentation(status: BountyStatus): {
  label: string;
  color: ChipProps["color"];
} {
  switch (status) {
    case BountyStatus.Open:
      return { label: "Open", color: "success" };
    case BountyStatus.Awarded:
      return { label: "Awarded", color: "warning" };
    case BountyStatus.Claimed:
      return { label: "Claimed", color: "info" };
    case BountyStatus.Refunded:
      return { label: "Refunded", color: "default" };
    default:
      return { label: "Unknown", color: "default" };
  }
}

function submissionStatusPresentation(status: SubmissionStatus): {
  label: string;
  color: ChipProps["color"];
} {
  switch (status) {
    case SubmissionStatus.Pending:
      return { label: "Pending", color: "default" };
    case SubmissionStatus.Selected:
      return { label: "Selected", color: "success" };
    default:
      return { label: "Unknown", color: "default" };
  }
}

/** Chip label and color mapped from on-chain bounty or submission status enums. */
export function StatusChip(props: StatusChipProps) {
  const { size = "small" } = props;
  const presentation =
    props.kind === "bounty"
      ? bountyStatusPresentation(props.status)
      : submissionStatusPresentation(props.status);

  return (
    <Chip
      label={presentation.label}
      color={presentation.color}
      size={size}
      variant={presentation.color === "default" ? "outlined" : "filled"}
      sx={{ flexShrink: 0 }}
    />
  );
}
