"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Đăng nhập thất bại");
      }
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-muted/40 p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookMarked className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Visual Notebook</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý file HTML/Markdown/PDF học tập với trợ lý AI
          </p>
        </div>

        <label className="mb-1.5 block text-sm font-medium">Mật khẩu</label>
        <Input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu truy cập"
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          className="mt-5 w-full justify-center"
          disabled={loading || !password}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Đăng nhập
        </Button>
      </form>
    </div>
  );
}
