"use client";

import { BookMarked, FolderOpen, ShieldAlert, Loader2 } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function ConnectScreen() {
  const status = useWorkspace((s) => s.status);
  const error = useWorkspace((s) => s.error);
  const rootName = useWorkspace((s) => s.rootName);
  const connect = useWorkspace((s) => s.connect);
  const reconnect = useWorkspace((s) => s.reconnect);

  if (status === "unsupported") {
    return (
      <Center>
        <ShieldAlert className="h-10 w-10 text-danger" />
        <h1 className="text-xl font-bold">Trình duyệt chưa hỗ trợ</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Visual Notebook cần <b>File System Access API</b> để đọc/ghi trực tiếp
          file trên ổ đĩa. Hãy mở bằng <b>Google Chrome</b> hoặc <b>Microsoft Edge</b>{" "}
          (phiên bản mới).
        </p>
      </Center>
    );
  }

  if (status === "needs-permission") {
    return (
      <Center>
        <FolderOpen className="h-10 w-10 text-primary" />
        <h1 className="text-xl font-bold">Cấp lại quyền truy cập</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Thư mục <b>{rootName}</b> đã được chọn trước đó. Trình duyệt cần bạn xác
          nhận lại quyền đọc/ghi.
        </p>
        <Button variant="primary" onClick={() => reconnect()}>
          <FolderOpen className="h-4 w-4" /> Cấp quyền & mở
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </Center>
    );
  }

  const connecting = status === "connecting";
  return (
    <Center>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <BookMarked className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold">Visual Notebook</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Chọn thư mục chứa tài liệu của bạn (ví dụ <code>d:\AIO2026</code>). App sẽ
        đọc/ghi trực tiếp các file <b>.html</b>, <b>.md</b> và <b>.pdf</b> ngay trên ổ đĩa — dữ
        liệu không rời máy bạn.
      </p>
      <Button variant="primary" size="md" onClick={() => connect()} disabled={connecting}>
        {connecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FolderOpen className="h-4 w-4" />
        )}
        Mở thư mục
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      {children}
    </div>
  );
}
