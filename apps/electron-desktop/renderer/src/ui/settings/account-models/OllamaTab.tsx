import React from "react";

import { getDesktopApiOrNull } from "@ipc/desktopApi";
import { addToastError } from "@shared/toast";

import s from "./AccountModelsTab.module.css";
import os from "./OllamaTab.module.css";

type OllamaModel = {
  name: string;
  size: number;
  modified_at: string;
  contextWindow: number;
};

const OLLAMA_DEFAULT_CONTEXT_WINDOW = 128000;

async function fetchOllamaContextWindow(modelName: string): Promise<number> {
  try {
    const res = await fetch("http://localhost:11434/api/show", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return OLLAMA_DEFAULT_CONTEXT_WINDOW;
    const data = (await res.json()) as { model_info?: Record<string, unknown> };
    if (!data.model_info) return OLLAMA_DEFAULT_CONTEXT_WINDOW;
    for (const [key, value] of Object.entries(data.model_info)) {
      if (
        key.endsWith(".context_length") &&
        typeof value === "number" &&
        Number.isFinite(value) &&
        value > 0
      ) {
        return Math.floor(value);
      }
    }
    return OLLAMA_DEFAULT_CONTEXT_WINDOW;
  } catch {
    return OLLAMA_DEFAULT_CONTEXT_WINDOW;
  }
}

type Status = "checking" | "not-running" | "no-models" | "ready";

type GatewayRpc = {
  request: <T = unknown>(method: string, params?: unknown) => Promise<T>;
};

export function OllamaTab(props: {
  gw: GatewayRpc;
  activeModelId: string | null;
  reload: () => Promise<void>;
}) {
  const [status, setStatus] = React.useState<Status>("checking");
  const [models, setModels] = React.useState<OllamaModel[]>([]);
  const [busy, setBusy] = React.useState(false);

  const check = React.useCallback(async () => {
    setStatus("checking");
    const api = getDesktopApiOrNull();
    if (!api) {
      setStatus("not-running");
      return;
    }

    const { running } = await api.ollamaCheck();
    if (!running) {
      setStatus("not-running");
      return;
    }

    const { models: found } = await api.ollamaListModels();
    if (found.length === 0) {
      setModels([]);
      setStatus("no-models");
    } else {
      const modelsWithCtx = await Promise.all(
        found.map(async (m) => ({
          ...m,
          contextWindow: await fetchOllamaContextWindow(m.name),
        }))
      );
      setModels(modelsWithCtx);
      setStatus("ready");
    }
  }, []);

  React.useEffect(() => {
    void check();
  }, [check]);

  const handleSelect = React.useCallback(
    async (model: OllamaModel) => {
      setBusy(true);
      try {
        const snap = await props.gw.request<{ hash?: string }>("config.get", {});
        const baseHash = typeof snap.hash === "string" ? snap.hash.trim() : "";
        if (!baseHash) throw new Error("Missing config base hash. Click Reload and try again.");

        const modelId = `ollama/${model.name}`;
        const patch = {
          models: {
            providers: {
              ollama: {
                baseUrl: "http://localhost:11434/v1",
                api: "openai-completions",
                injectNumCtxForOpenAICompat: true,
                models: models.map((m) => ({
                  id: m.name,
                  name: m.name,
                  reasoning: false,
                  input: ["text"],
                  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                  contextWindow: m.contextWindow,
                  maxTokens: 4096,
                })),
              },
            },
          },
          agents: {
            defaults: {
              model: { primary: modelId },
              models: { [modelId]: {} },
            },
          },
        };

        await props.gw.request("config.patch", {
          baseHash,
          raw: JSON.stringify(patch, null, 2),
          note: "Settings: set Ollama model",
        });
        await props.reload();
      } catch (err) {
        addToastError(err);
      } finally {
        setBusy(false);
      }
    },
    [props, models]
  );

  if (status === "checking") {
    return (
      <div className={os.statusBlock}>
        <div className={os.statusIcon}>
          <span className={os.spinner} />
        </div>
        <div className={os.statusText}>Checking for Ollama…</div>
      </div>
    );
  }

  if (status === "not-running") {
    return (
      <div className={os.statusBlock}>
        <div className={os.statusIcon + " " + os.warn}>⚠</div>
        <div>
          <div className={os.statusText}>Ollama not detected.</div>
          <div className={os.statusHint}>
            Make sure Ollama is running, or{" "}
            <a href="https://ollama.com" target="_blank" rel="noreferrer" className={os.link}>
              install Ollama ↗
            </a>
          </div>
        </div>
        <button type="button" className={os.refreshBtn} onClick={() => void check()}>
          Retry
        </button>
      </div>
    );
  }

  if (status === "no-models") {
    return (
      <div className={os.statusBlock}>
        <div className={os.statusIcon + " " + os.warn}>⚠</div>
        <div>
          <div className={os.statusText}>Ollama is running but no models are installed.</div>
          <div className={os.statusHint}>
            Run <code className={s.inlineCode}>ollama pull llama3</code> in your terminal to get
            started.
          </div>
        </div>
        <button type="button" className={os.refreshBtn} onClick={() => void check()}>
          Refresh
        </button>
      </div>
    );
  }

  const activeOllamaModel = props.activeModelId?.startsWith("ollama/")
    ? props.activeModelId.slice("ollama/".length)
    : null;

  return (
    <div>
      <div className={os.header}>
        <div className={s.dropdownLabel}>Available Models</div>
        <button
          type="button"
          className={os.refreshBtn}
          onClick={() => void check()}
          disabled={busy}
        >
          Refresh
        </button>
      </div>
      <div className={os.modelList}>
        {models.map((m) => {
          const isActive = m.name === activeOllamaModel;
          return (
            <div
              key={m.name}
              className={`${os.modelRow}${isActive ? ` ${os.modelRowActive}` : ""}`}
            >
              <div className={os.modelInfo}>
                <div className={os.modelName}>{m.name}</div>
                <div className={os.modelMeta}>{formatSize(m.size)}</div>
              </div>
              <button
                type="button"
                className={`${os.selectBtn}${isActive ? ` ${os.selectBtnActive}` : ""}`}
                onClick={() => void handleSelect(m)}
                disabled={busy || isActive}
              >
                {isActive ? "Selected" : "Use"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "";
  const gb = bytes / 1024 / 1024 / 1024;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}
