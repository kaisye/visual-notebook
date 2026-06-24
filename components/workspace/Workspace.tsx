"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/store";
import { TopBar } from "./TopBar";
import { ConnectScreen } from "./ConnectScreen";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Library } from "@/components/library/Library";
import { Viewer } from "@/components/viewer/Viewer";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { SettingsDialog } from "@/components/settings/SettingsDialog";

export function Workspace() {
  const status = useWorkspace((s) => s.status);
  const init = useWorkspace((s) => s.init);
  const openPath = useWorkspace((s) => s.openPath);
  const agentOpen = useWorkspace((s) => s.agentOpen);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    init().finally(() => setReady(true));
  }, [init]);

  if (!ready) {
    return <div className="flex flex-1 items-center justify-center" />;
  }

  if (status !== "connected") {
    return (
      <div className="flex flex-1 flex-col">
        <ConnectScreen />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 overflow-hidden">
          {openPath ? <Viewer path={openPath} /> : <Library />}
        </main>
        {agentOpen && <AgentPanel onOpenSettings={() => setSettingsOpen(true)} />}
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
