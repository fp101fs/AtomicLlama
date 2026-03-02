import React from "react";
import { useNavigate } from "react-router-dom";
import { getObject } from "@shared/utils/configHelpers";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { downloadWhisperModel } from "@store/slices/whisperSlice";
import { addToastError } from "@shared/toast";
import { useVoiceInput, getVoiceProvider } from "./useVoiceInput";
import type { ChatComposerRef } from "../components/ChatComposer";

type GatewayRequest = <T = unknown>(method: string, params?: unknown) => Promise<T>;

/**
 * Encapsulates all voice-related state and handlers for ChatPage:
 * voice recording, OpenAI provider detection, whisper download, navigation.
 */
export function useVoiceConfig(
  gwRequest: GatewayRequest,
  composerRef: React.RefObject<ChatComposerRef | null>,
  setInput: React.Dispatch<React.SetStateAction<string>>
) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const voice = useVoiceInput(gwRequest);

  const [voiceConfigured, setVoiceConfigured] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const savedProvider = getVoiceProvider();
    if (savedProvider === "local") {
      setVoiceConfigured(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await gwRequest<{ config: unknown }>("config.get");
        if (cancelled) return;
        const cfg = getObject(snap.config);
        const auth = getObject(cfg.auth);
        const profiles = getObject(auth.profiles);
        const order = getObject(auth.order);
        const hasProfile = Object.values(profiles).some((p) => {
          if (!p || typeof p !== "object" || Array.isArray(p)) return false;
          return (p as { provider?: unknown }).provider === "openai";
        });
        const hasOrder = Object.prototype.hasOwnProperty.call(order, "openai");
        setVoiceConfigured(Boolean(hasProfile || hasOrder));
      } catch {
        setVoiceConfigured(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gwRequest]);

  React.useEffect(() => {
    if (voice.error) {
      addToastError(voice.error);
    }
  }, [voice.error]);

  const handleVoiceStart = React.useCallback(() => {
    voice.startRecording();
  }, [voice]);

  const handleVoiceStop = React.useCallback(async () => {
    const text = await voice.stopRecording();
    if (text) {
      setInput((prev) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed} ${text}` : text;
      });
    }
    requestAnimationFrame(() => composerRef.current?.focusInput());
  }, [voice, setInput, composerRef]);

  const handleNavigateVoiceSettings = React.useCallback(() => {
    navigate("/settings/voice");
  }, [navigate]);

  const whisperDownload = useAppSelector((s) => s.whisper.download);

  const handleWhisperDownload = React.useCallback(() => {
    void dispatch(downloadWhisperModel("small"));
  }, [dispatch]);

  React.useEffect(() => {
    if (whisperDownload.kind === "idle" && getVoiceProvider() === "local") {
      setVoiceConfigured(true);
    }
  }, [whisperDownload]);

  return {
    voice,
    voiceConfigured,
    handleVoiceStart,
    handleVoiceStop,
    handleNavigateVoiceSettings,
    whisperDownload,
    handleWhisperDownload,
  };
}
