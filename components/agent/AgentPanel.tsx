"use client";

import { useMemo, useRef, useState } from "react";
import {
  Sparkles, X, Wand2, Pencil, FilePlus2, Loader2, Save, StopCircle,
  KeyRound, FileText,
} from "lucide-react";
import { type EditorFragmentSelection, useWorkspace } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { streamGenerate, convertPdf, convertToSlides } from "@/lib/ai/client";
import { extractFragment, extractHtml } from "@/lib/ai/prompts";
import { extractPdf } from "@/lib/pdf/extract";
import { baseNameNoExt } from "@/lib/fs/file-ops";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ThemePicker, StylePicker, CapabilityChips } from "./Controls";
import { cn } from "@/lib/utils";

type Mode = "create" | "edit" | "pdf" | "slides";
type PromptOption = { label: string; prompt: string };

const FORMULA_LATEX_PROMPT =
  "Nếu có công thức toán, vật lý, thống kê hoặc ký hiệu khoa học: hãy viết bằng LaTeX chuẩn, dùng $...$ cho công thức inline và $$...$$ cho công thức dạng khối. Không viết công thức như text thường. Với giới hạn, đạo hàm, phân số, căn, tổng/tích, ma trận, vector... phải dùng cú pháp LaTeX rõ ràng như \\lim_{h\\to 0}, \\frac{...}{...}, f'(a), \\Delta y/\\Delta x. Đặt công thức trong vùng riêng đủ rộng để không bị gãy dòng hoặc chồng lên nhãn/đồ họa.";

const PROMPT_OPTIONS: Record<Mode, PromptOption[]> = {
  create: [
    {
      label: "Bài học có ví dụ",
      prompt: "Tạo tài liệu học tập có cấu trúc: mục tiêu, giải thích từng bước, ví dụ minh họa, lỗi thường gặp và bài tập cuối bài.",
    },
    {
      label: "Tương tác",
      prompt: "Thêm phần tương tác bằng HTML/CSS/JS: câu hỏi kiểm tra nhanh, nút hiện đáp án và phản hồi tức thì.",
    },
    {
      label: "Tóm tắt nhanh",
      prompt: "Viết ngắn gọn, tập trung vào ý chính, dùng bullet rõ ràng và thêm phần tóm tắt cuối trang.",
    },
  ],
  edit: [
    {
      label: "Làm rõ nội dung",
      prompt: "Giữ nguyên bố cục và giao diện, chỉ viết lại nội dung cho rõ ràng, mạch lạc và dễ học hơn.",
    },
    {
      label: "Thêm ví dụ",
      prompt: "Thêm ví dụ minh họa thực tế và một bài tập ngắn, không thay đổi style hiện tại.",
    },
    {
      label: "Rút gọn",
      prompt: "Rút gọn nội dung, bỏ lặp ý, giữ các khái niệm quan trọng và trình bày bằng bullet dễ quét.",
    },
  ],
  pdf: [
    {
      label: "Giữ gần bố cục",
      prompt: "Giữ cấu trúc và thứ tự nội dung gần giống PDF gốc, nhưng làm HTML sạch, dễ đọc và bỏ header/footer/số trang thừa.",
    },
    {
      label: "Biến thành bài học",
      prompt: "Chuyển nội dung PDF thành bài học có mục tiêu, giải thích, ví dụ, ghi nhớ nhanh và câu hỏi ôn tập.",
    },
    {
      label: "Tóm tắt tài liệu",
      prompt: "Không cần chép đầy đủ. Hãy tóm tắt thành tài liệu HTML ngắn, nêu ý chính, bảng/timeline nếu phù hợp.",
    },
  ],
  slides: [
    {
      label: "Siêu ngầu",
      prompt:
        "Tạo một HTML slide deck thật ấn tượng kiểu keynote/product launch: 10-12 slide, ít chữ nhưng sắc, mỗi slide có một visual metaphor rõ ràng. Dùng inline SVG/CSS để tạo ảnh minh họa, diagram, timeline, mockup hoặc scene minh họa phù hợp nội dung. Thêm animation phức tạp nhưng mượt: reveal theo lớp, parallax nhẹ, morph/scale/line-draw, progress motion, chuyển slide cinematic bằng vanilla JS/CSS. Bắt buộc chống chồng lấn: label, icon, đường biểu đồ, card, nút và text phải có vùng an toàn riêng, không đè lên nhau ở desktop/mobile. Có chế độ prefers-reduced-motion để giảm chuyển động. Không dùng ảnh stock/link ngoài; nếu nguồn có ảnh thì tận dụng ảnh nguồn, nếu không hãy tự vẽ minh họa bằng SVG/CSS.",
    },
    {
      label: "Deck giảng bài",
      prompt: "Tạo 10 slide cho bài giảng: mở đầu hấp dẫn, mỗi slide một ý chính, ít chữ, có ví dụ và câu hỏi thảo luận cuối deck.",
    },
    {
      label: "Pitch deck",
      prompt: "Tạo deck dạng pitch: vấn đề, insight, giải pháp, lợi ích, bằng chứng, kế hoạch triển khai và kết luận mạnh.",
    },
    {
      label: "Workshop",
      prompt: "Tạo slide cho workshop: chia thành các phần ngắn, có hoạt động nhóm, câu hỏi kiểm tra và slide recap.",
    },
    {
      label: "Siêu ngắn",
      prompt: "Tạo 6 slide thật ngắn, ưu tiên tiêu đề mạnh, bullet ít chữ và phần kết luận dễ nhớ.",
    },
  ],
};

const SLIDE_COLOR_THEMES = [
  {
    id: "auto",
    label: "Tự động",
    swatches: ["#111827", "#f8fafc", "#6366f1"],
    prompt: "Tự chọn bảng màu phù hợp nhất với nội dung, bảo đảm tương phản tốt và nhất quán.",
  },
  {
    id: "neon",
    label: "Neon dark",
    swatches: ["#050816", "#22d3ee", "#a3e635"],
    prompt:
      "Dùng palette nền tối cinematic: near-black/navy, cyan neon, lime/emerald highlight, viền phát sáng tinh tế. Hợp slide công nghệ, AI, dữ liệu, tương lai.",
  },
  {
    id: "luxury",
    label: "Luxury",
    swatches: ["#111111", "#f5efe6", "#d4af37"],
    prompt:
      "Dùng palette sang trọng: đen than, ivory, vàng champagne/gold, typography sắc gọn, cảm giác premium nhưng không rối.",
  },
  {
    id: "aurora",
    label: "Aurora",
    swatches: ["#061826", "#7c3aed", "#2dd4bf"],
    prompt:
      "Dùng palette aurora: midnight blue, violet, teal, sky highlights, gradient mềm và lớp kính mờ có chiều sâu.",
  },
  {
    id: "candy",
    label: "Pop candy",
    swatches: ["#fff7ed", "#fb7185", "#14b8a6"],
    prompt:
      "Dùng palette tươi sáng: warm cream, coral/pink, teal, yellow accent. Vui mắt, trẻ trung, hợp bài học dễ tiếp cận.",
  },
  {
    id: "mono",
    label: "Mono sharp",
    swatches: ["#ffffff", "#111827", "#ef4444"],
    prompt:
      "Dùng palette trắng/đen sắc nét với một màu accent đỏ hoặc electric blue. Rất rõ, tối giản, tương phản cao, hợp deck chiến lược.",
  },
] as const;

export function AgentPanel({ onOpenSettings }: { onOpenSettings: () => void }) {
  const root = useWorkspace((s) => s.root);
  const readText = useWorkspace((s) => s.readText);
  const getFileObj = useWorkspace((s) => s.getFileObj);
  const openPath = useWorkspace((s) => s.openPath);
  const setAgentOpen = useWorkspace((s) => s.setAgentOpen);
  const createHtml = useWorkspace((s) => s.createHtml);
  const saveHtml = useWorkspace((s) => s.saveHtml);
  const reloadOpen = useWorkspace((s) => s.reloadOpen);
  const targetDir = useWorkspace((s) => s.targetDir);
  const editorSelection = useWorkspace((s) => s.editorSelection);

  const settings = useSettings();
  const isPdfOpen = !!openPath && /\.pdf$/i.test(openPath);
  const isHtmlOpen = !!openPath && /\.html?$/i.test(openPath);
  const isMarkdownOpen = !!openPath && /\.(md|markdown)$/i.test(openPath);
  const isSlideSourceOpen = isPdfOpen || isHtmlOpen || isMarkdownOpen;
  const selectedFragment =
    !!editorSelection &&
    editorSelection.path === openPath &&
    editorSelection.to > editorSelection.from &&
    editorSelection.text.trim().length > 0
      ? editorSelection
      : null;
  const suggestedMode: Mode = isPdfOpen ? "pdf" : isHtmlOpen ? "edit" : "create";

  const [selectedMode, setMode] = useState<Mode | null>(null);
  const selectedModeAvailable =
    selectedMode === "create" ||
    selectedMode === "slides" ||
    (selectedMode === "edit" && isHtmlOpen) ||
    (selectedMode === "pdf" && isPdfOpen);
  const mode: Mode = selectedFragment ? "edit" : selectedModeAvailable ? selectedMode : suggestedMode;
  const [themeId, setThemeId] = useState(settings.defaultTheme);
  const [slideColorThemeId, setSlideColorThemeId] = useState<(typeof SLIDE_COLOR_THEMES)[number]["id"]>("auto");
  const [styleId, setStyleId] = useState(settings.defaultStyle);
  const [caps, setCaps] = useState<string[]>(settings.defaultCapabilities);
  const [applyThemeOnEdit, setApplyThemeOnEdit] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [savedPath, setSavedPath] = useState("");
  const [fragmentBase, setFragmentBase] = useState<EditorFragmentSelection | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeSelection = mode === "edit" ? selectedFragment : null;

  const html = useMemo(() => extractHtml(output), [output]);
  const fragment = useMemo(() => extractFragment(output), [output]);
  const mergedFragmentHtml = useMemo(() => {
    if (!fragmentBase || !fragment) return "";
    return fragmentBase.html.slice(0, fragmentBase.from) + fragment + fragmentBase.html.slice(fragmentBase.to);
  }, [fragment, fragmentBase]);
  const previewHtml = fragmentBase ? mergedFragmentHtml : html;
  const canRun = settings.hasActiveKey();

  function reset() {
    setOutput("");
    setError("");
    setSavedPath("");
    setFragmentBase(null);
  }

  function toggleCap(id: string) {
    setCaps((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  function applyPromptOption(option: PromptOption) {
    const value = `${option.prompt}\n\n${FORMULA_LATEX_PROMPT}`;
    if (mode !== "edit" || applyThemeOnEdit) {
      setCaps((current) => (current.includes("math") ? current : [...current, "math"]));
    }
    setPrompt((current) => {
      const trimmed = current.trim();
      if (!trimmed) return value;
      if (trimmed.includes(option.prompt) && trimmed.includes(FORMULA_LATEX_PROMPT)) return current;
      return `${trimmed}\n\n${value}`;
    });
  }

  function buildSlidePrompt() {
    const selected = SLIDE_COLOR_THEMES.find((item) => item.id === slideColorThemeId) ?? SLIDE_COLOR_THEMES[0];
    const parts = [
      prompt.trim(),
      `Theme màu slide: ${selected.label}. ${selected.prompt}`,
    ].filter(Boolean);
    return parts.join("\n\n");
  }

  async function run() {
    if (!root) return;
    const selectionToEdit = activeSelection;
    reset();
    setBusy(true);
    const ac = new AbortController();
    abortRef.current = ac;
    const active = settings.providers[settings.activeProvider];
    const base = {
      provider: settings.activeProvider,
      model: active.model,
      apiKey: active.apiKey,
      baseURL: active.baseURL,
      themeId,
      styleId,
      capabilityIds: caps,
    };
    try {
      if (mode === "pdf" && openPath) {
        setFragmentBase(null);
        setStatus("Đang đọc & trích nội dung PDF…");
        const file = await getFileObj(openPath);
        const { text, images } = await extractPdf(file);
        setTitle(baseNameNoExt(openPath));
        setStatus("AI đang dựng lại HTML…");
        await convertPdf(
          { ...base, text, images, fileName: openPath.split("/").pop() ?? "tài liệu", prompt },
          setOutput,
          ac.signal,
        );
      } else if (mode === "slides") {
        setFragmentBase(null);
        const slidePrompt = buildSlidePrompt();
        const link = sourceUrl.trim();
        if (link) {
          setTitle(prompt.trim().split(/\s+/).slice(0, 7).join(" ") || "slide-deck");
          setStatus("AI đang đọc link và dựng slide HTML…");
          await convertToSlides(
            {
              ...base,
              sourceKind: "url",
              sourceName: link,
              sourceUrl: link,
              prompt: slidePrompt,
            },
            setOutput,
            ac.signal,
          );
        } else if (openPath && isPdfOpen) {
          setStatus("Đang đọc & trích nội dung PDF cho slide…");
          const file = await getFileObj(openPath);
          const { text, images } = await extractPdf(file);
          setTitle(`${baseNameNoExt(openPath)}-slides`);
          setStatus("AI đang dựng slide HTML…");
          await convertToSlides(
            {
              ...base,
              sourceKind: "pdf",
              sourceName: openPath.split("/").pop() ?? "PDF",
              sourceText: text,
              images,
              prompt: slidePrompt,
            },
            setOutput,
            ac.signal,
          );
        } else if (openPath && (isHtmlOpen || isMarkdownOpen)) {
          setStatus("Đang đọc file hiện tại cho slide…");
          const sourceText = await readText(openPath);
          setTitle(`${baseNameNoExt(openPath)}-slides`);
          setStatus("AI đang dựng slide HTML…");
          await convertToSlides(
            {
              ...base,
              sourceKind: isHtmlOpen ? "html" : "markdown",
              sourceName: openPath.split("/").pop() ?? "tài liệu",
              sourceText,
              prompt: slidePrompt,
            },
            setOutput,
            ac.signal,
          );
        } else {
          throw new Error("Hãy mở PDF/HTML/Markdown hoặc dán link tài liệu public để tạo slide");
        }
      } else if (mode === "edit" && openPath) {
        if (selectionToEdit) {
          setFragmentBase(selectionToEdit);
          setStatus("AI đang chỉnh sửa vùng chọn…");
          await streamGenerate(
            { ...base, mode: "fragment", prompt, currentHtml: selectionToEdit.text },
            setOutput,
            ac.signal,
          );
        } else {
          setFragmentBase(null);
          setStatus("Đang đọc file hiện tại…");
          const currentHtml = await readText(openPath);
          setStatus("AI đang chỉnh sửa…");
          await streamGenerate(
            { ...base, mode: "edit", applyTheme: applyThemeOnEdit, prompt, currentHtml },
            setOutput,
            ac.signal,
          );
        }
      } else {
        setFragmentBase(null);
        if (!prompt.trim()) { setBusy(false); return; }
        setTitle(prompt.trim().split(/\s+/).slice(0, 8).join(" "));
        setStatus("AI đang tạo tài liệu…");
        await streamGenerate({ ...base, mode: "generate", prompt }, setOutput, ac.signal);
      }
      setStatus("Hoàn tất ✓");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
      setStatus("");
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function saveNew() {
    if (!previewHtml) return;
    const path = await createHtml(title || "tai-lieu", previewHtml, themeId || undefined);
    setSavedPath(path);
    setStatus(`Đã lưu: ${path}`);
  }

  async function applyEdit() {
    if (!previewHtml || !openPath) return;
    await saveHtml(openPath, previewHtml);
    reloadOpen();
    setStatus("Đã áp dụng thay đổi ✓");
    reset();
  }

  const showInputs = !busy && !output;

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-border bg-card">
      <div className="flex h-12 items-center gap-2 border-b border-border px-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Trợ lý AI</span>
        <Button size="icon" variant="ghost" className="ml-auto" onClick={() => setAgentOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!canRun ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <KeyRound className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Chưa có API key cho{" "}
            <b>{settings.activeProvider}</b>. Hãy thêm trong Cài đặt để dùng trợ lý.
          </p>
          <Button variant="primary" size="sm" onClick={onOpenSettings}>
            <KeyRound className="h-4 w-4" /> Mở Cài đặt
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-y-auto p-3">
          {/* Mode tabs */}
          <div className="mb-3 flex flex-wrap gap-1 rounded-lg border border-border p-0.5 text-xs">
            <ModeTab active={mode === "create"} onClick={() => setMode("create")} icon={<FilePlus2 className="h-3.5 w-3.5" />}>Tạo mới</ModeTab>
            <ModeTab active={mode === "edit"} onClick={() => setMode("edit")} disabled={!isHtmlOpen} icon={<Pencil className="h-3.5 w-3.5" />}>Sửa file</ModeTab>
            <ModeTab active={mode === "pdf"} onClick={() => setMode("pdf")} disabled={!isPdfOpen} icon={<Wand2 className="h-3.5 w-3.5" />}>PDF→HTML</ModeTab>
            <ModeTab active={mode === "slides"} onClick={() => setMode("slides")} icon={<FileText className="h-3.5 w-3.5" />}>Slides</ModeTab>
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}

          {showInputs && (
            <div className="space-y-3">
              {mode === "edit" && (
                <div className="space-y-1 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <p>
                    {activeSelection ? "Đang sửa vùng chọn" : "Đang sửa cả file"}:{" "}
                    <b>{openPath?.split("/").pop()}</b>
                  </p>
                  {activeSelection ? (
                    <p>Vùng chọn hiện tại có {activeSelection.text.length.toLocaleString("vi-VN")} ký tự. AI sẽ chỉ thay đoạn này.</p>
                  ) : (
                    <p>Muốn sửa một phần: vào tab <b>Mã nguồn</b>, bôi đen đoạn cần sửa rồi bấm “Sửa vùng chọn”.</p>
                  )}
                </div>
              )}
              {mode === "pdf" && (
                <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                  Trích nội dung từ <b>{openPath?.split("/").pop()}</b> và dựng lại HTML theo theme bên dưới.
                </p>
              )}

              {mode === "slides" && (
                <div className="space-y-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <p>
                    Nguồn slide: {sourceUrl.trim()
                      ? "link bên dưới"
                      : isSlideSourceOpen
                        ? openPath?.split("/").pop()
                        : "dán link HTTPS public hoặc mở PDF/HTML/Markdown"}
                  </p>
                  <Input
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://docs.google.com/document/d/... hoặc link bài viết"
                  />
                </div>
              )}

              {mode === "edit" && !activeSelection && (
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={applyThemeOnEdit}
                    onChange={(e) => setApplyThemeOnEdit(e.target.checked)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  Áp dụng lại theme &amp; năng lực (mặc định tắt — chỉ sửa nội dung, giữ nguyên giao diện)
                </label>
              )}

              {(mode !== "edit" || applyThemeOnEdit) && !activeSelection && (
                <>
                  <div>
                    <Label>Theme</Label>
                    <ThemePicker value={themeId} onChange={setThemeId} />
                  </div>
                  {mode === "slides" && (
                    <div>
                      <Label>Theme màu slide</Label>
                      <SlideColorThemePicker value={slideColorThemeId} onChange={setSlideColorThemeId} />
                    </div>
                  )}
                  <div>
                    <Label>Phong cách viết</Label>
                    <StylePicker value={styleId} onChange={setStyleId} />
                  </div>
                  <div>
                    <Label>Năng lực</Label>
                    <CapabilityChips value={caps} onToggle={toggleCap} />
                  </div>
                </>
              )}

              {(
                <div>
                  <Label>
                    {mode === "edit"
                      ? "Yêu cầu chỉnh sửa"
                      : mode === "pdf"
                        ? "Yêu cầu chuyển đổi (tuỳ chọn)"
                        : mode === "slides"
                          ? "Yêu cầu tạo slide (tuỳ chọn)"
                          : "Mô tả tài liệu cần tạo"}
                  </Label>
                  <Textarea
                    rows={5}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      mode === "edit"
                        ? "VD: Thêm một biểu đồ cột so sánh, đổi tiêu đề thành…"
                        : mode === "pdf"
                          ? "VD: Giữ bố cục gần giống PDF, thêm mục tóm tắt cuối bài, bỏ phụ lục…"
                          : mode === "slides"
                            ? "VD: Tạo 10 slide, mỗi slide ít chữ, có ví dụ và câu hỏi thảo luận cuối deck…"
                            : "VD: Trang giải thích định lý Pythagore, có hình minh hoạ và 1 bài tập tương tác…"
                    }
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PROMPT_OPTIONS[mode].map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => applyPromptOption(option)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={run}
                disabled={mode !== "pdf" && mode !== "slides" && !prompt.trim()}
              >
                {mode === "pdf" || mode === "slides" ? <Wand2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {mode === "edit" ? (activeSelection ? "Chỉnh sửa vùng chọn" : "Chỉnh sửa") : mode === "pdf" ? "Chuyển sang HTML" : mode === "slides" ? "Tạo slide HTML" : "Tạo tài liệu"}
              </Button>
            </div>
          )}

          {(busy || output) && (
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{status}</span>
                {busy && (
                  <Button size="sm" variant="ghost" className="ml-auto h-6 px-2 text-danger" onClick={stop}>
                    <StopCircle className="h-3.5 w-3.5" /> Dừng
                  </Button>
                )}
              </div>

              <div className="min-h-48 flex-1 overflow-hidden rounded-lg border border-border bg-white">
                {previewHtml ? (
                  <iframe
                    title="preview"
                    srcDoc={previewHtml}
                    className="h-full min-h-48 w-full border-0"
                    sandbox="allow-scripts allow-popups allow-same-origin"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
                    Đang nhận nội dung…
                  </div>
                )}
              </div>

              {!busy && previewHtml && !savedPath && (
                <div className="space-y-2">
                  {mode === "edit" ? (
                    <Button variant="primary" className="w-full justify-center" onClick={applyEdit}>
                      <Save className="h-4 w-4" /> Áp dụng vào file
                    </Button>
                  ) : (
                    <>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={mode === "slides" ? "Tên file slide mới" : "Tên file"}
                      />
                      {mode === "slides" && (
                        <p className="text-xs text-muted-foreground">
                          File nguồn sẽ được giữ nguyên; slide được lưu thành file HTML mới.
                        </p>
                      )}
                      <Button variant="primary" className="w-full justify-center" onClick={saveNew}>
                        <Save className="h-4 w-4" /> {mode === "slides" ? "Lưu thành slide mới vào" : "Lưu vào"} {targetDir() || "thư mục gốc"}
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" className="w-full justify-center" onClick={reset}>
                    Bỏ & làm lại
                  </Button>
                </div>
              )}

              {savedPath && (
                <Button variant="secondary" className="w-full justify-center" onClick={reset}>
                  {mode === "slides" ? "Tạo slide khác" : "Tạo tài liệu khác"}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function ModeTab({
  active, onClick, disabled, icon, children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5",
        active ? "bg-accent font-medium" : "text-muted-foreground",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}

function SlideColorThemePicker({
  value,
  onChange,
}: {
  value: (typeof SLIDE_COLOR_THEMES)[number]["id"];
  onChange: (id: (typeof SLIDE_COLOR_THEMES)[number]["id"]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SLIDE_COLOR_THEMES.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.prompt}
            aria-pressed={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-2 text-left text-xs",
              active ? "border-primary ring-1 ring-primary" : "border-border hover:bg-accent",
            )}
          >
            <span className="flex h-7 w-7 shrink-0 overflow-hidden rounded-md border border-border">
              {item.swatches.map((color) => (
                <span key={color} className="flex-1" style={{ background: color }} />
              ))}
            </span>
            <span className="min-w-0 truncate font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
