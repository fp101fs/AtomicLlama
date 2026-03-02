import React from "react";
import type { Components } from "react-markdown";
import { openExternal } from "@shared/utils/openExternal";
import { extractText } from "../utils/extractText";
import { CopyCodeButton } from "../components/CopyCodeButton";

/**
 * Stable markdown component overrides for the chat transcript.
 * Links open in the system browser; code blocks get a language tag and copy button.
 */
export function useMarkdownComponents(): Components {
  return React.useMemo(
    () => ({
      a: ({ href, children, ...rest }) => (
        <a
          {...rest}
          href={href}
          onClick={(e) => {
            e.preventDefault();
            if (href) {
              openExternal(href);
            }
          }}
        >
          {children}
        </a>
      ),
      pre: ({ children, ...rest }) => {
        let lang = "";
        const child = React.Children.toArray(children)[0];
        if (React.isValidElement(child) && child.props) {
          const className = (child.props as Record<string, unknown>).className;
          if (typeof className === "string") {
            const match = className.match(/language-(\S+)/);
            if (match) {
              lang = match[1];
            }
          }
        }
        const code = extractText(children).replace(/\n$/, "");
        return (
          <div className="UiMarkdownCodeBlock">
            {lang ? <span className="UiMarkdownCodeBlockLang">{lang}</span> : null}
            <CopyCodeButton code={code} />
            <pre {...rest}>{children}</pre>
          </div>
        );
      },
    }),
    []
  );
}
