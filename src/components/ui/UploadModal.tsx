'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ParsedData } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onParsed: (data: ParsedData) => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  plaintext: 'Plain Text',
  unknown: 'Unknown',
};

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: 'text-green-400 border-green-400/40 bg-green-400/10',
  claude: 'text-orange-400 border-orange-400/40 bg-orange-400/10',
  gemini: 'text-blue-400 border-blue-400/40 bg-blue-400/10',
  plaintext: 'text-gray-400 border-gray-400/40 bg-gray-400/10',
  unknown: 'text-gray-500 border-gray-500/40 bg-gray-500/10',
};

export function UploadModal({ isOpen, onClose, onParsed }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    platform: string;
    totalMessages: number;
    totalConversations: number;
    dateRange: { start: string; end: string };
  } | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setPreview(null);
    setParsedData(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.details || json.error || 'Parsing failed');
      }

      const data: ParsedData = json.data;
      setParsedData(data);
      setPreview({
        platform: data.metadata.platform,
        totalMessages: data.metadata.totalMessages,
        totalConversations: data.metadata.totalConversations,
        dateRange: data.metadata.dateRange,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const formatDate = (iso: string) => {
    if (!iso) return 'Unknown';
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleConfirm = () => {
    if (parsedData) {
      onParsed(parsedData);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Upload Conversation History</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* 드래그 존 */}
            {!preview && (
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                  ? 'border-star-blue bg-star-blue/10'
                  : 'border-white/20 hover:border-white/40'
                  }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className="text-4xl mb-3">
                  {isLoading ? '⏳' : '📁'}
                </div>
                {isLoading ? (
                  <p className="text-gray-400 text-sm">Parsing...</p>
                ) : (
                  <>
                    <p className="text-white font-medium text-sm mb-1">
                      Drag & drop a file or click to select
                    </p>
                    <p className="text-gray-500 text-xs">
                      .zip (ChatGPT) · .json (Claude/Gemini) · .txt
                    </p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".zip,.json,.txt"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>
            )}

            {/* 에러 */}
            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
                <button
                  className="ml-2 underline text-xs"
                  onClick={() => setError(null)}
                >
                  Try Again
                </button>
              </div>
            )}

            {/* 파싱 미리보기 */}
            {preview && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* 플랫폼 배지 */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${PLATFORM_COLORS[preview.platform] || PLATFORM_COLORS.unknown
                      }`}
                  >
                    {PLATFORM_LABELS[preview.platform] || preview.platform}
                  </span>
                  <span className="text-gray-500 text-xs">Auto-detected</span>
                </div>

                {/* 통계 카드 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-star-blue">
                      {preview.totalMessages.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Total Messages</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-star-blue">
                      {preview.totalConversations.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Conversations</div>
                  </div>
                </div>

                {/* 날짜 범위 */}
                {preview.dateRange.start && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1">Period</div>
                    <div className="text-sm text-white">
                      {formatDate(preview.dateRange.start)} →{' '}
                      {formatDate(preview.dateRange.end)}
                    </div>
                  </div>
                )}

                {/* 버튼 */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setPreview(null);
                      setParsedData(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-white/20 text-gray-400 text-sm hover:bg-white/5 transition-colors"
                  >
                    Reselect
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-2.5 rounded-xl bg-star-blue text-space-bg font-bold text-sm hover:bg-star-glow transition-colors"
                  >
                    Create Solar System →
                  </button>
                </div>
              </motion.div>
            )}

            {/* 플랫폼 export 안내 */}
            {!preview && !isLoading && (
              <div className="mt-4 text-xs text-gray-600 space-y-1">
                <p className="font-medium text-gray-500 mb-2">How to Export:</p>
                <p>
                  <span className="text-green-500">ChatGPT</span> — Settings →
                  Data Controls → Export data
                </p>
                <p>
                  <span className="text-orange-500">Claude</span> — Settings →
                  Export Data
                </p>
                <p>
                  <span className="text-blue-500">Gemini</span> — Google
                  Takeout → Gemini
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
