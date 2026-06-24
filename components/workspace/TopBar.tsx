"use client";

import { useState } from "react";
import {
  Search, LayoutGrid, List, RefreshCw, Settings, Sparkles,
  Moon, Sun, BookMarked, FolderOpen, ChevronDown, FolderSync, FolderPlus, Unplug,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem } from "@/components/ui/menu";
import { useDialog } from "@/components/ui/dialog";

export function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const rootName = useWorkspace((s) => s.rootName);
  const search = useWorkspace((s) => s.search);
  const setSearch = useWorkspace((s) => s.setSearch);
  const view = useWorkspace((s) => s.view);
  const setView = useWorkspace((s) => s.setView);
  const refresh = useWorkspace((s) => s.refresh);
  const connect = useWorkspace((s) => s.connect);
  const addRoot = useWorkspace((s) => s.addRoot);
  const disconnect = useWorkspace((s) => s.disconnect);
  const agentOpen = useWorkspace((s) => s.agentOpen);
  const setAgentOpen = useWorkspace((s) => s.setAgentOpen);
  const dialog = useDialog();

  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  const [busy, setBusy] = useState(false);

  function toggleDark() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("vn-dark", next ? "1" : "0");
    setDark(next);
  }

  async function doRefresh() {
    setBusy(true);
    await refresh();
    setBusy(false);
  }

  async function changeFolder(close: () => void) {
    close();
    await connect();
  }

  async function doAddRoot(close: () => void) {
    close();
    await addRoot();
  }

  async function doDisconnect(close: () => void) {
    close();
    const ok = await dialog.confirm({
      title: "Ngắt kết nối thư mục",
      description: `Quay lại màn hình chọn thư mục. File trên ổ đĩa của bạn không bị thay đổi.`,
      confirmText: "Ngắt kết nối",
      danger: true,
    });
    if (ok) await disconnect();
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
      <div className="flex items-center gap-2 pr-1">
        <BookMarked className="h-5 w-5 text-primary" />
        <span className="hidden text-sm font-semibold lg:inline">Visual Notebook</span>
      </div>

      <Menu
        align="start"
        trigger={
          <button
            className="flex max-w-[12rem] items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-sm hover:bg-accent"
            title={`Thư mục: ${rootName || "—"}`}
          >
            <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{rootName || "Thư mục"}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        }
      >
        {(close) => (
          <>
            <MenuItem icon={<FolderPlus className="h-4 w-4" />} onClick={() => doAddRoot(close)}>
              Thêm thư mục vào workspace…
            </MenuItem>
            <MenuItem icon={<FolderSync className="h-4 w-4" />} onClick={() => changeFolder(close)}>
              Mở thư mục khác…
            </MenuItem>
            <div className="my-1 border-t border-border" />
            <MenuItem icon={<Unplug className="h-4 w-4" />} danger onClick={() => doDisconnect(close)}>
              Ngắt kết nối
            </MenuItem>
          </>
        )}
      </Menu>

      <div className="relative ml-1 max-w-md flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Tìm trong ${rootName || "thư mục"}…`}
          className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <div className="mr-1 flex rounded-lg border border-border p-0.5">
          <button
            onClick={() => setView("grid")}
            className={`rounded-md p-1.5 ${view === "grid" ? "bg-accent text-foreground" : "text-muted-foreground"}`}
            title="Dạng lưới"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`rounded-md p-1.5 ${view === "list" ? "bg-accent text-foreground" : "text-muted-foreground"}`}
            title="Dạng danh sách"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <Button size="icon" variant="ghost" onClick={doRefresh} title="Làm mới">
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
        </Button>
        <Button size="icon" variant="ghost" onClick={toggleDark} title="Sáng/Tối">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={onOpenSettings} title="Cài đặt">
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant={agentOpen ? "primary" : "secondary"}
          size="sm"
          onClick={() => setAgentOpen(!agentOpen)}
          className="ml-1"
        >
          <Sparkles className="h-4 w-4" /> Trợ lý AI
        </Button>
      </div>
    </header>
  );
}
