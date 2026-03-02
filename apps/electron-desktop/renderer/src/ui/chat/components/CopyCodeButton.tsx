import React from "react";
import { CopyIcon, CheckIcon } from "@shared/kit/icons";

/** Copy-to-clipboard button rendered inside code block header. */
export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      className="UiMarkdownCopyCodeBtn"
      onClick={() => {
        void navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={copied ? "Copied" : "Copy"}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
