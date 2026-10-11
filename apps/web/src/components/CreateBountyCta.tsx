"use client";

import Button from "@mui/material/Button";
import Link from "next/link";

export function CreateBountyCta() {
  return (
    <Button component={Link} href="/create" variant="contained">
      Create bounty
    </Button>
  );
}
