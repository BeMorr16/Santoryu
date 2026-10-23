import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogButton,
  type DialogResult,
} from "@/components/Dialog";

export function DialogExample() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<DialogResult | null>(null);
  // The least destructive action takes focus first (APG alertdialog).
  const keep = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button
        iconStart="trash"
        onClick={() => {
          setOpen(true);
        }}
      >
        Delete theme
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        onComplete={setResult}
        role="alertdialog"
        title="Delete “Ocean”?"
        initialFocus={keep}
      >
        <DialogBody>
          <p>The theme is removed from this browser. This can’t be undone.</p>
        </DialogBody>
        <DialogActions>
          <DialogButton ref={keep} result="failure">
            Keep theme
          </DialogButton>
          <DialogButton variant="primary" result="success">
            Delete
          </DialogButton>
        </DialogActions>
      </Dialog>
      <p role="status">
        {result === "success" && "Deleted “Ocean”."}
        {result === "failure" && "Kept “Ocean”."}
      </p>
    </>
  );
}
