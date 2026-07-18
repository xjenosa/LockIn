"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QRJoin({ code, big = false }: { code: string; big?: boolean }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/play/${code}`);
  }, [code]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-2xl bg-white p-4">
        {url ? (
          <QRCodeSVG value={url} size={big ? 260 : 180} />
        ) : (
          <div style={{ width: big ? 260 : 180, height: big ? 260 : 180 }} />
        )}
      </div>
      <div className="text-center">
        <p className="text-white/70 text-sm break-all">{url || "…"}</p>
        <p className="mt-2 text-white/80">
          Room code:{" "}
          <span className="font-display text-4xl text-gold tracking-widest">{code}</span>
        </p>
      </div>
    </div>
  );
}
