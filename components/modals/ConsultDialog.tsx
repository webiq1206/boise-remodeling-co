"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConsultationForm } from "@/components/ConsultationForm";

/** The consultation dialog, loaded by ModalProvider the first time it opens. */
export function ConsultDialog({ open, onClose, onRevise }: { open: boolean; onClose: () => void; onRevise: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto" data-clarity-mask="true">
        <DialogHeader>
          <DialogTitle className="font-sans font-light text-xl text-foreground">
            Schedule your free in-home visit
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            No obligation - we&apos;ll walk your space and give you an honest planning range.
          </DialogDescription>
        </DialogHeader>
        <ConsultationForm onRevise={onRevise} showTrust />
      </DialogContent>
    </Dialog>
  );
}
