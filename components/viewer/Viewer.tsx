"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft, Eye, Code2, Save, ExternalLink, PanelRight,
  Sparkles, Loader2, FileText, Wand2, ScanLine,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { useDarkMode } from "@/lib/hooks";
import { markdownDocument } from "@/lib/markdown/render";
import { Button } from "@/components/ui/button";
import { PropertiesPanel } from "./PropertiesPanel";

const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => <div className="p-4 text-sm text-muted-foreground">Đang tải trình soạn thảo…</div>,
});

interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function Viewer({ path }: { path: string }) {
  const root = useWorkspace((s) => s.root);
  const readText = useWorkspace((s) => s.readText);
  const getFileObj = useWorkspace((s) => s.getFileObj);
  const openFile = useWorkspace((s) => s.openFile);
  const saveHtml = useWorkspace((s) => s.saveHtml);
  const setAgentOpen = useWorkspace((s) => s.setAgentOpen);
  const setEditorSelection = useWorkspace((s) => s.setEditorSelection);
  const editorSelection = useWorkspace((s) => s.editorSelection);
  const manifest = useWorkspace((s) => s.manifest);
  const reloadToken = useWorkspace((s) => s.reloadToken);
  const dark = useDarkMode();

  const isHtml = /\.html?$/i.test(path);
  const isMarkdown = /\.(md|markdown)$/i.test(path);
  const isPdf = /\.pdf$/i.test(path);
  const isTextDocument = isHtml || isMarkdown;
  const title = manifest.files[path]?.title?.trim() || path.split("/").pop();
  const hasSelection =
    !!editorSelection &&
    editorSelection.path === path &&
    editorSelection.to > editorSelection.from &&
    editorSelection.text.trim().length > 0;

  const [content, setContent] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"preview" | "source">("preview");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showProps, setShowProps] = useState(false);
  const [selectionHint, setSelectionHint] = useState("");
  const [boxSelectActive, setBoxSelectActive] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const urlRef = useRef<string | null>(null);
  const previewSelectionCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setTab("preview");
      setDirty(false);
      if (!root) return;
      try {
        if (isTextDocument) {
          const text = await readText(path);
          if (!cancelled) setContent(text.normalize("NFC"));
        } else if (isPdf) {
          const file = await getFileObj(path);
          const url = URL.createObjectURL(file);
          urlRef.current = url;
          if (!cancelled) setPdfUrl(url);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      previewSelectionCleanupRef.current?.();
      previewSelectionCleanupRef.current = null;
      dragStartRef.current = null;
      setPdfUrl(null);
    };
  }, [path, root, isTextDocument, isPdf, reloadToken, readText, getFileObj]);

  async function save() {
    setSaving(true);
    try {
      await saveHtml(path, content);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  function openInNewTab() {
    const blob = new Blob([previewDocument], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  }

  const previewDocument = isMarkdown ? markdownDocument(content, title ?? path) : content;

  function normalizeBox(start: { x: number; y: number }, end: { x: number; y: number }): SelectionBox {
    const left = Math.min(start.x, end.x);
    const top = Math.min(start.y, end.y);
    return {
      left,
      top,
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  function pointFromPointer(e: PointerEvent<HTMLDivElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)),
    };
  }

  function centerInside(rect: DOMRect, box: SelectionBox): boolean {
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    return x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height;
  }

  function elementDepth(el: Element): number {
    let depth = 0;
    let cur: Element | null = el;
    while (cur?.parentElement) {
      depth += 1;
      cur = cur.parentElement;
    }
    return depth;
  }

  function commonAncestor(elements: Element[]): HTMLElement | null {
    if (!elements.length) return null;
    let ancestor: Element | null = elements[0];
    while (ancestor && !elements.every((el) => ancestor?.contains(el))) {
      ancestor = ancestor.parentElement;
    }
    return ancestor instanceof HTMLElement ? ancestor : null;
  }

  function findRangeForElement(el: HTMLElement): { from: number; to: number; text: string } | null {
    const candidates = [el.outerHTML, el.innerHTML, el.textContent ?? ""]
      .map((value) => value.trim())
      .filter((value) => value.length >= 2);

    for (const candidate of candidates) {
      const found = findUniqueRange(content, candidate);
      if (found && found !== "ambiguous") {
        return { from: found.from, to: found.to, text: content.slice(found.from, found.to) };
      }
    }

    return null;
  }

  function applyBoxSelection(box: SelectionBox) {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;

    const elements = Array.from(doc.body.querySelectorAll<HTMLElement>("body *"))
      .filter((el) => {
        if (["SCRIPT", "STYLE", "LINK", "META"].includes(el.tagName)) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && centerInside(rect, box);
      })
      .sort((a, b) => elementDepth(b) - elementDepth(a));

    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const centerEl = doc.elementFromPoint(centerX, centerY);
    const ancestor = commonAncestor(elements);
    const startEl =
      ancestor && ancestor !== doc.body && ancestor !== doc.documentElement
        ? ancestor
        : centerEl instanceof HTMLElement
          ? centerEl
          : null;

    let cur: HTMLElement | null = startEl;
    while (cur && cur !== doc.body && cur !== doc.documentElement) {
      const range = findRangeForElement(cur);
      if (range) {
        setEditorSelection({ path, ...range, html: content });
        setSelectionHint(`Đã khoanh vùng <${cur.tagName.toLowerCase()}> để AI sửa`);
        setBoxSelectActive(false);
        return;
      }
      cur = cur.parentElement;
    }

    setSelectionHint("Chưa map được vùng này; hãy khoanh rộng hơn hoặc dùng Mã nguồn.");
    setEditorSelection(null);
  }

  function startBoxSelection(e: PointerEvent<HTMLDivElement>) {
    const point = pointFromPointer(e);
    dragStartRef.current = point;
    setSelectionBox({ left: point.x, top: point.y, width: 0, height: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function moveBoxSelection(e: PointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    if (!start) return;
    setSelectionBox(normalizeBox(start, pointFromPointer(e)));
  }

  function finishBoxSelection(e: PointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;
    const box = normalizeBox(start, pointFromPointer(e));
    setSelectionBox(box);
    if (box.width < 12 || box.height < 12) {
      setSelectionHint("Kéo một vùng lớn hơn để chọn nội dung.");
      return;
    }
    applyBoxSelection(box);
  }

  function findUniqueRange(source: string, needle: string): { from: number; to: number } | null | "ambiguous" {
    const cleanNeedle = needle.trim();
    if (!cleanNeedle) return null;

    const first = source.indexOf(cleanNeedle);
    if (first >= 0) {
      const second = source.indexOf(cleanNeedle, first + cleanNeedle.length);
      return second >= 0 ? "ambiguous" : { from: first, to: first + cleanNeedle.length };
    }

    const escaped = cleanNeedle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const regex = new RegExp(escaped, "g");
    const matches = [...source.matchAll(regex)];
    if (matches.length > 1) return "ambiguous";
    if (matches.length === 1 && typeof matches[0].index === "number") {
      return { from: matches[0].index, to: matches[0].index + matches[0][0].length };
    }

    return null;
  }

  function syncPreviewSelection(win: Window) {
    const selection = win.getSelection();
    const selectedText = selection?.toString().trim() ?? "";
    if (!selectedText) {
      setSelectionHint("");
      setEditorSelection(null);
      return;
    }

    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const wrapper = win.document.createElement("div");
    if (range) wrapper.append(range.cloneContents());
    const selectedHtml = wrapper.innerHTML.trim();

    for (const candidate of [selectedHtml, selectedText]) {
      const found = findUniqueRange(content, candidate);
      if (found && found !== "ambiguous") {
        setSelectionHint("Đã chọn vùng trên bản xem trước");
        setEditorSelection({
          path,
          from: found.from,
          to: found.to,
          text: content.slice(found.from, found.to),
          html: content,
        });
        return;
      }
      if (found === "ambiguous") {
        setSelectionHint("Đoạn này xuất hiện nhiều lần; hãy chọn cụ thể trong Mã nguồn.");
        setEditorSelection(null);
        return;
      }
    }

    setSelectionHint("Chưa map được vùng chọn này; hãy chọn một đoạn text ngắn hơn hoặc dùng Mã nguồn.");
    setEditorSelection(null);
  }

  function bindPreviewSelection() {
    previewSelectionCleanupRef.current?.();
    previewSelectionCleanupRef.current = null;

    const win = iframeRef.current?.contentWindow;
    const doc = iframeRef.current?.contentDocument;
    if (!win || !doc) return;

    const sync = () => syncPreviewSelection(win);
    doc.addEventListener("selectionchange", sync);
    doc.addEventListener("mouseup", sync);
    doc.addEventListener("keyup", sync);
    previewSelectionCleanupRef.current = () => {
      doc.removeEventListener("selectionchange", sync);
      doc.removeEventListener("mouseup", sync);
      doc.removeEventListener("keyup", sync);
    };
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
          <Button size="icon" variant="ghost" onClick={() => openFile(null)} title="Quay lại">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="mr-2 min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>

          {isTextDocument && (
            <div className="flex rounded-lg border border-border p-0.5">
              <button
                onClick={() => setTab("preview")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${tab === "preview" ? "bg-accent" : "text-muted-foreground"}`}
              >
                <Eye className="h-3.5 w-3.5" /> Xem
              </button>
              <button
                onClick={() => {
                  setBoxSelectActive(false);
                  setTab("source");
                }}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${tab === "source" ? "bg-accent" : "text-muted-foreground"}`}
              >
                <Code2 className="h-3.5 w-3.5" /> Mã nguồn
              </button>
            </div>
          )}

          {isTextDocument && dirty && (
            <Button size="sm" variant="primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu
            </Button>
          )}
          {isHtml && (
            <>
              {tab === "preview" && (
                <Button
                  size="sm"
                  variant={boxSelectActive ? "primary" : "secondary"}
                  onClick={() => {
                    setBoxSelectActive((value) => !value);
                    setSelectionBox(null);
                    setSelectionHint("");
                  }}
                >
                  <ScanLine className="h-4 w-4" /> Khoanh vùng
                </Button>
              )}
              {hasSelection && (
                <Button size="sm" variant="primary" onClick={() => setAgentOpen(true)}>
                  <ScanLine className="h-4 w-4" /> Sửa vùng chọn
                </Button>
              )}
              {!hasSelection && (
                <Button size="sm" variant="secondary" onClick={() => setAgentOpen(true)}>
                  <Sparkles className="h-4 w-4" /> Sửa bằng AI
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={openInNewTab} title="Mở tab mới">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </>
          )}
          {isMarkdown && (
            <Button size="icon" variant="ghost" onClick={openInNewTab} title="Mở tab mới">
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          {selectionHint && <span className="hidden max-w-52 truncate text-xs text-muted-foreground lg:inline">{selectionHint}</span>}
          {isPdf && (
            <Button size="sm" variant="primary" onClick={() => setAgentOpen(true)}>
              <Wand2 className="h-4 w-4" /> Chuyển sang HTML
            </Button>
          )}
          <Button
            size="icon"
            variant={showProps ? "secondary" : "ghost"}
            onClick={() => setShowProps((v) => !v)}
            title="Thuộc tính"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative flex-1 overflow-hidden bg-muted/30">
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : isTextDocument ? (
            tab === "preview" ? (
              <div className="relative h-full">
                <iframe
                  ref={isHtml ? iframeRef : undefined}
                  title={path}
                  srcDoc={previewDocument}
                  className="h-full w-full border-0 bg-white"
                  sandbox="allow-scripts allow-popups allow-same-origin allow-forms allow-modals"
                  onLoad={isHtml ? bindPreviewSelection : undefined}
                />
                {isHtml && boxSelectActive && (
                  <div
                    className="absolute inset-0 z-10 cursor-crosshair bg-primary/5"
                    onPointerDown={startBoxSelection}
                    onPointerMove={moveBoxSelection}
                    onPointerUp={finishBoxSelection}
                    onPointerCancel={() => {
                      dragStartRef.current = null;
                    }}
                  >
                    <div className="absolute left-3 top-3 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground shadow-sm">
                      Kéo để khoanh vùng AI cần sửa
                    </div>
                    {selectionBox && (
                      <div
                        className="absolute rounded border-2 border-primary bg-primary/15"
                        style={{
                          left: selectionBox.left,
                          top: selectionBox.top,
                          width: selectionBox.width,
                          height: selectionBox.height,
                        }}
                      />
                    )}
                  </div>
                )}
                {isHtml && selectionBox && !boxSelectActive && hasSelection && (
                  <div
                    className="pointer-events-none absolute z-10 rounded border-2 border-primary bg-primary/10"
                    style={{
                      left: selectionBox.left,
                      top: selectionBox.top,
                      width: selectionBox.width,
                      height: selectionBox.height,
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="h-full overflow-hidden">
                <CodeEditor
                  value={content}
                  dark={dark}
                  language={isHtml ? "html" : "plain"}
                  onChange={(v) => {
                    setContent(v);
                    setDirty(true);
                  }}
                  onSelect={
                    isHtml
                      ? (selection) => {
                          setEditorSelection(
                            selection.to > selection.from
                              ? { ...selection, path, html: selection.html }
                              : null,
                          );
                        }
                      : undefined
                  }
                />
              </div>
            )
          ) : isPdf && pdfUrl ? (
            <iframe title={path} src={pdfUrl} className="h-full w-full border-0" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileText className="h-10 w-10" />
              <p className="text-sm">Không thể xem trước loại file này.</p>
            </div>
          )}
        </div>
      </div>

      {showProps && <PropertiesPanel key={path} path={path} />}
    </div>
  );
}
