"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type CopyButtonProps = {
  value: string;
};

export function CopyButton({ value }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#f5ff5c] px-4 text-sm font-semibold text-[#11140f] shadow-[0_0_0_1px_rgba(17,20,15,0.08),0_10px_26px_rgba(245,255,92,0.24)] transition hover:bg-[#ecff2e]"
      title="复制订阅链接"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "已复制" : "复制链接"}
    </button>
  );
}
