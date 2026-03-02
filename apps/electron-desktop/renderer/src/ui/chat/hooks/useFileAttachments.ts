import React from "react";
import type { ChatAttachmentInput } from "@store/slices/chat/chatSlice";
import {
  dataUrlDecodedBytes,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_ATTACHMENTS_BYTES,
} from "../utils/file-limits";

type UseFileAttachmentsParams = {
  attachments: ChatAttachmentInput[];
  maxAttachments: number;
  onAttachmentsChange: (
    next: ChatAttachmentInput[] | ((prev: ChatAttachmentInput[]) => ChatAttachmentInput[])
  ) => void;
  onAttachmentsLimitError?: (message: string) => void;
  /** Called after files are successfully added (e.g. to refocus textarea). */
  onFilesAdded?: () => void;
};

export function useFileAttachments({
  attachments,
  maxAttachments,
  onAttachmentsChange,
  onAttachmentsLimitError,
  onFilesAdded,
}: UseFileAttachmentsParams) {
  const addFiles = React.useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (!fileArray.length) {
        return;
      }

      const currentCount = attachments.length;
      const currentTotalBytes = attachments.reduce(
        (sum, a) => sum + dataUrlDecodedBytes(a.dataUrl),
        0
      );
      if (currentCount >= maxAttachments) {
        onAttachmentsLimitError?.(
          `Maximum ${maxAttachments} attachment${maxAttachments === 1 ? "" : "s"} allowed.`
        );
        return;
      }

      const add: ChatAttachmentInput[] = [];
      let addedBytes = 0;
      const maxNewCount = maxAttachments - currentCount;
      let totalSizeShown = false;
      let oversizedShown = false;

      let expectedCount = 0;
      for (let i = 0; i < fileArray.length && expectedCount < maxNewCount; i += 1) {
        const file = fileArray[i];
        if (file.size > MAX_FILE_SIZE_BYTES) {
          if (!oversizedShown) {
            oversizedShown = true;
            onAttachmentsLimitError?.("File is too large. Maximum size per file is 5MB.");
          }
          continue;
        }
        const wouldTotal = currentTotalBytes + addedBytes + file.size;
        if (wouldTotal > MAX_TOTAL_ATTACHMENTS_BYTES) {
          if (!totalSizeShown) {
            totalSizeShown = true;
            onAttachmentsLimitError?.(
              `Total attachments size exceeds ${MAX_TOTAL_ATTACHMENTS_BYTES / (1024 * 1024)}MB.`
            );
          }
          continue;
        }
        addedBytes += file.size;
        expectedCount += 1;
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          const dataUrl = reader.result as string;
          add.push({
            id: crypto.randomUUID(),
            dataUrl,
            mimeType: file.type || "application/octet-stream",
            fileName: file.name,
          });
          if (add.length === expectedCount) {
            onAttachmentsChange((prev) => [...prev, ...add]);
            if (onFilesAdded) requestAnimationFrame(onFilesAdded);
          }
        });
        reader.addEventListener("error", () => {
          if (add.length === expectedCount) {
            onAttachmentsChange((prev) => [...prev, ...add]);
            if (onFilesAdded) requestAnimationFrame(onFilesAdded);
          }
        });
        reader.readAsDataURL(file);
      }

      if (fileArray.length > maxNewCount && expectedCount === maxNewCount) {
        onAttachmentsLimitError?.(
          `Maximum ${maxAttachments} attachment${maxAttachments === 1 ? "" : "s"} allowed.`
        );
      }
    },
    [attachments, maxAttachments, onAttachmentsChange, onAttachmentsLimitError, onFilesAdded]
  );

  const onFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files?.length) {
        addFiles(files);
      }
      e.target.value = "";
    },
    [addFiles]
  );

  const removeAttachment = React.useCallback(
    (id: string) => {
      onAttachmentsChange((prev) => prev.filter((a) => a.id !== id));
    },
    [onAttachmentsChange]
  );

  const onDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (files?.length) {
        addFiles(files);
      }
    },
    [addFiles]
  );

  const onDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return { addFiles, onFileChange, removeAttachment, onDrop, onDragOver };
}
