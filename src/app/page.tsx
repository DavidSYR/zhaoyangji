"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

type RecognizeResult = {
  possibleNames: string[];
  searchKeywords: string[];
  materialGuess: string;
};

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RecognizeResult | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2500);
  };

  const recognize = async (file: File) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setError("");
    setResult(null);
    setSelectedKeyword("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/recognize", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "识别失败，请稍后重试");
      }

      setResult(data as RecognizeResult);
      setSelectedKeyword(data.searchKeywords?.[0] ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "识别失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void recognize(file);
  };

  const openSearch = (baseUrl: string) => {
    if (!selectedKeyword) return;
    window.open(
      `${baseUrl}${encodeURIComponent(selectedKeyword)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const copyForXianyu = async () => {
    if (!selectedKeyword) return;

    try {
      await navigator.clipboard.writeText(selectedKeyword);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = selectedKeyword;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    showToast("关键词已复制，请打开闲鱼粘贴搜索");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="mx-auto w-full max-w-md px-5 pb-44 pt-10">
        <header>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            找样机
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            拍下线下看到的东西，生成能搜到的关键词
          </p>
        </header>

        <section className="mt-12 flex flex-col items-center">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex h-44 w-44 flex-col items-center justify-center gap-3 rounded-full bg-blue-600 text-xl font-bold text-white shadow-xl shadow-blue-600/30 transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-9 w-9"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2L9 4h6l1.5 2h2A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-8Z"
              />
              <circle cx="12" cy="12.5" r="3.5" />
            </svg>
            拍照识别
          </button>

          {loading && (
            <div
              role="status"
              aria-live="polite"
              className="mt-5 flex items-center gap-2 text-sm font-semibold text-blue-700"
            >
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
              识别中…
            </div>
          )}
        </section>

        {previewUrl && (
          <section className="mt-8">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob 预览图是临时本地 URL，无需优化 */}
            <img
              src={previewUrl}
              alt="待识别图片预览"
              className="h-56 w-full rounded-2xl border border-slate-200 bg-white object-cover"
            />
          </section>
        )}

        {error && (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {result && (
          <section className="mt-8 space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-sm font-bold text-slate-500">识别名称</h2>
              <ul className="space-y-2">
                {(result.possibleNames ?? []).map((name, index) => (
                  <li
                    key={`${name}-${index}`}
                    className="rounded-xl bg-slate-100 px-4 py-3 text-base font-semibold text-slate-900"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-sm font-bold text-slate-500">搜索关键词</h2>
              <div className="flex flex-wrap gap-2">
                {(result.searchKeywords ?? []).map((keyword, index) => (
                  <button
                    key={`${keyword}-${index}`}
                    type="button"
                    onClick={() => setSelectedKeyword(keyword)}
                    aria-pressed={selectedKeyword === keyword}
                    className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${
                      selectedKeyword === keyword
                        ? "bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2"
                        : "bg-slate-100 text-slate-700 ring-1 ring-slate-300 active:bg-slate-200"
                    }`}
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-sm font-bold text-slate-500">材质推测</h2>
              <p className="text-base leading-relaxed text-slate-900">
                {result.materialGuess}
              </p>
            </div>
          </section>
        )}

        <p className="mt-10 text-center text-xs text-slate-400">
          在 Safari 中点击分享按钮，选择“添加到主屏幕”
        </p>
      </main>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-28 left-1/2 z-20 w-max max-w-[90vw] -translate-x-1/2 rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg"
        >
          {toast}
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/95 px-4 pt-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex w-full max-w-md gap-3">
          <button
            type="button"
            disabled={!selectedKeyword}
            onClick={() => openSearch("https://s.taobao.com/search?q=")}
            className="flex-1 rounded-xl bg-orange-500 py-4 text-base font-bold text-white shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            淘宝
          </button>
          <button
            type="button"
            disabled={!selectedKeyword}
            onClick={() => void copyForXianyu()}
            className="flex-1 rounded-xl bg-amber-400 py-4 text-base font-bold text-amber-950 shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            闲鱼
          </button>
          <button
            type="button"
            disabled={!selectedKeyword}
            onClick={() => openSearch("https://search.jd.com/Search?keyword=")}
            className="flex-1 rounded-xl bg-red-600 py-4 text-base font-bold text-white shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            京东
          </button>
        </div>
      </nav>
    </div>
  );
}
