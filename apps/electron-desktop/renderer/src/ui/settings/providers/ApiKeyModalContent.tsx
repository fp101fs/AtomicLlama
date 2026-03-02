/**
 * Modal content for entering/validating an API key for a model provider.
 * For Anthropic, also supports setup-token authentication (Claude subscription).
 * Extracted from ModelProvidersTab.tsx.
 */
import React from "react";

import { getDesktopApiOrNull } from "@ipc/desktopApi";
import { ActionButton, TextInput } from "@shared/kit";
import { openExternal } from "@shared/utils/openExternal";
import type { ModelProviderInfo } from "@shared/models/providers";
import { resolveProviderIconUrl } from "@shared/models/providers";
import s from "./ApiKeyModalContent.module.css";

type AuthMode = "api_key" | "setup_token";

const ANTHROPIC_SETUP_TOKEN_PREFIX = "sk-ant-oat01-";
const ANTHROPIC_SETUP_TOKEN_MIN_LENGTH = 80;

function validateSetupToken(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "Please paste your setup token";
  }
  if (!trimmed.startsWith(ANTHROPIC_SETUP_TOKEN_PREFIX)) {
    return `Token should start with ${ANTHROPIC_SETUP_TOKEN_PREFIX}`;
  }
  if (trimmed.length < ANTHROPIC_SETUP_TOKEN_MIN_LENGTH) {
    return "Token looks too short — paste the full setup-token";
  }
  return undefined;
}

function supportsSetupToken(providerId: string): boolean {
  return providerId === "anthropic";
}

export function ApiKeyModalContent(props: {
  provider: ModelProviderInfo;
  busy: boolean;
  onSave: (key: string) => void;
  onSaveSetupToken?: (token: string) => void;
  onPaste: () => Promise<string>;
  onClose: () => void;
}) {
  const { provider, busy } = props;
  const hasTokenMode = supportsSetupToken(provider.id);
  const [authMode, setAuthMode] = React.useState<AuthMode>("api_key");
  const [draftKey, setDraftKey] = React.useState("");
  const [draftToken, setDraftToken] = React.useState("");
  const [validating, setValidating] = React.useState(false);
  const [validationError, setValidationError] = React.useState("");

  const switchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setValidationError("");
  };

  const handlePaste = React.useCallback(async () => {
    const text = await props.onPaste();
    if (text) {
      if (authMode === "setup_token") {
        setDraftToken(text);
      } else {
        setDraftKey(text);
      }
      setValidationError("");
    }
  }, [props, authMode]);

  const handleSaveApiKey = React.useCallback(async () => {
    const trimmed = draftKey.trim();
    if (!trimmed) {
      return;
    }

    setValidationError("");
    setValidating(true);
    try {
      const result = await getDesktopApiOrNull()?.validateApiKey(provider.id, trimmed);
      if (result && !result.valid) {
        setValidationError(result.error ?? "Invalid API key.");
        return;
      }
    } catch {
      // If validation IPC is unavailable, allow saving anyway
    } finally {
      setValidating(false);
    }

    props.onSave(trimmed);
  }, [draftKey, provider.id, props]);

  const handleSaveSetupToken = React.useCallback(() => {
    const err = validateSetupToken(draftToken);
    if (err) {
      setValidationError(err);
      return;
    }
    props.onSaveSetupToken?.(draftToken.trim());
  }, [draftToken, props]);

  const handleSave = () => {
    if (authMode === "setup_token") {
      handleSaveSetupToken();
    } else {
      void handleSaveApiKey();
    }
  };

  const isBusy = busy || validating;
  const currentDraft = authMode === "setup_token" ? draftToken : draftKey;

  return (
    <>
      <div className={s.UiModalProviderHeader}>
        <span className={s.UiModalProviderIcon} aria-hidden="true">
          <img src={resolveProviderIconUrl(provider.id)} alt="" />
        </span>
        <span className={s.UiModalProviderName}>{provider.name}</span>
      </div>

      {hasTokenMode ? (
        <div className={s.UiModalAuthToggle} role="radiogroup" aria-label="Authentication method">
          <button
            type="button"
            className={`${s.UiModalAuthBtn} ${authMode === "api_key" ? s["UiModalAuthBtn--active"] : ""}`}
            onClick={() => switchAuthMode("api_key")}
            disabled={isBusy}
          >
            I have API key
          </button>
          <button
            type="button"
            className={`${s.UiModalAuthBtn} ${authMode === "setup_token" ? s["UiModalAuthBtn--active"] : ""}`}
            onClick={() => switchAuthMode("setup_token")}
            disabled={isBusy}
          >
            I have Claude subscription
          </button>
        </div>
      ) : null}

      {authMode === "api_key" ? (
        <div className={s.UiModalHelpText}>
          {provider.helpText}{" "}
          {provider.helpUrl ? (
            <a
              href={provider.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="UiLink"
              onClick={(e) => {
                e.preventDefault();
                if (!provider.helpUrl) {
                  return;
                }
                openExternal(provider.helpUrl);
              }}
            >
              Get API key ↗
            </a>
          ) : null}
        </div>
      ) : (
        <div className={s.UiModalHelpText}>
          Run <code className={s.UiModalInlineCode}>claude setup-token</code> in your terminal, then
          paste the generated token below.{" "}
          <a
            href="https://docs.anthropic.com/en/docs/claude-code/setup-token"
            target="_blank"
            rel="noopener noreferrer"
            className="UiLink"
            onClick={(e) => {
              e.preventDefault();
              openExternal("https://docs.anthropic.com/en/docs/claude-code/setup-token");
            }}
          >
            Learn more ↗
          </a>
        </div>
      )}

      <div className={s.UiModalInputRow}>
        {authMode === "api_key" ? (
          <TextInput
            type="password"
            value={draftKey}
            onChange={(v) => {
              setDraftKey(v);
              if (validationError) {
                setValidationError("");
              }
            }}
            placeholder={provider.placeholder}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={isBusy}
            isError={validationError}
          />
        ) : (
          <TextInput
            type="password"
            value={draftToken}
            onChange={(v) => {
              setDraftToken(v);
              if (validationError) {
                setValidationError("");
              }
            }}
            placeholder="sk-ant-oat01-..."
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={isBusy}
            isError={validationError}
          />
        )}
      </div>

      <div className={s.UiModalActions}>
        <ActionButton disabled={isBusy} onClick={() => void handlePaste()}>
          Paste
        </ActionButton>
        <ActionButton
          variant="primary"
          disabled={isBusy || !currentDraft.trim()}
          loading={validating}
          onClick={handleSave}
        >
          {validating ? "Validating…" : busy ? "Saving…" : "Save"}
        </ActionButton>
      </div>
    </>
  );
}
