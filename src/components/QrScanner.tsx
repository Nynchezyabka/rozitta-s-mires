import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Header button: opens the camera and jumps to the chest whose sticker QR was scanned. */
export function QrScanner() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button aria-label="Сканировать наклейку" onClick={() => setOpen(true)} className="shrink-0 rounded-full bg-secondary p-2 text-secondary-foreground"><ScanLine className="h-4 w-4" /></button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-2 border-primary/60 bg-card">
          <DialogTitle className="font-display text-sm text-primary">Наведите на QR сундука</DialogTitle>
          {open && <Camera onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Camera({ onDone }: { onDone: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const nav = useNavigate();
  const [err, setErr] = useState("");
  useEffect(() => {
    let stream: MediaStream | null = null;
    let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch (e) {
        console.error(e);
        setErr("Камера недоступна — разрешите доступ к ней в браузере.");
        return;
      }
      try {
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        const Det = (window as unknown as { BarcodeDetector?: new (o: object) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
        const det = Det ? new Det({ formats: ["qr_code"] }) : null;
        const jsQR = det ? null : (await import("jsqr")).default;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        while (!stop) {
          let text = "";
          if (v.videoWidth) {
            if (det) text = (await det.detect(v))[0]?.rawValue ?? "";
            else {
              canvas.width = v.videoWidth; canvas.height = v.videoHeight;
              ctx.drawImage(v, 0, 0);
              text = jsQR!(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data ?? "";
            }
          }
          const id = text.match(/\/box\/([0-9a-f-]{36})/i)?.[1];
          if (id) { onDone(); nav({ to: "/box/$id", params: { id } }); return; }
          if (text) toast("Это не наклейка сундука");
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch (e) {
        console.error(e);
        if (!stop) setErr("Не получилось прочитать код, попробуйте ещё раз.");
      }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [nav, onDone]);
  return err ? <p className="text-sm text-destructive">{err}</p> : <video ref={video} muted playsInline className="aspect-square w-full rounded-2xl bg-muted object-cover" />;
}
