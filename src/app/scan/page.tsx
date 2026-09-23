"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { verifyQrToken } from "@/lib/qrToken";

export default function ScanPage() {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setResult(decodedText);
        const data = verifyQrToken(decodedText);
        if (!data) {
          setError("Invalid or expired QR token");
        } else {
          setError(null);
        }
        scanner.clear();
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">QR Scan</h1>
      <div id="reader" />
      {result && <p className="text-sm">Scanned: {result}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
