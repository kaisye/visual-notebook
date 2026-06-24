"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, FolderPlus, Info } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Input } from "./input";

type PromptOptions = {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
};

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type AlertOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  danger?: boolean;
};

type Dialogs = {
  prompt: (opts: PromptOptions) => Promise<string | null>;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions) => Promise<void>;
};

const DialogContext = createContext<Dialogs | null>(null);

type State =
  | { kind: "prompt"; opts: PromptOptions; resolve: (v: string | null) => void }
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "alert"; opts: AlertOptions; resolve: () => void };

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const api = useMemo<Dialogs>(
    () => ({
      prompt: (opts) =>
        new Promise((resolve) => {
          setValue(opts.defaultValue ?? "");
          setState({ kind: "prompt", opts, resolve });
        }),
      confirm: (opts) =>
        new Promise((resolve) => setState({ kind: "confirm", opts, resolve })),
      alert: (opts) =>
        new Promise((resolve) => setState({ kind: "alert", opts, resolve })),
    }),
    [],
  );

  // Focus + select the input when a prompt opens.
  useEffect(() => {
    if (state?.kind !== "prompt") return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [state]);

  function cancel() {
    if (!state) return;
    if (state.kind === "prompt") state.resolve(null);
    else if (state.kind === "confirm") state.resolve(false);
    else state.resolve();
    setState(null);
  }

  function submit() {
    if (!state) return;
    if (state.kind === "prompt") state.resolve(value);
    else if (state.kind === "confirm") state.resolve(true);
    else state.resolve();
    setState(null);
  }

  const danger =
    (state?.kind === "confirm" || state?.kind === "alert") && state.opts.danger;

  const HeaderIcon =
    state?.kind === "prompt"
      ? FolderPlus
      : state?.kind === "confirm"
        ? AlertTriangle
        : Info;

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal open={!!state} onClose={cancel} className="max-w-md">
        {state && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className={
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                  (danger
                    ? "bg-danger/10 text-danger"
                    : "bg-primary/10 text-primary")
                }
              >
                <HeaderIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold leading-6">
                  {state.opts.title}
                </h2>
                {state.opts.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {state.opts.description}
                  </p>
                )}
                {state.kind === "prompt" && (
                  <Input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={state.opts.placeholder}
                    className="mt-3"
                  />
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              {state.kind !== "alert" && (
                <Button type="button" variant="ghost" onClick={cancel}>
                  {state.opts.cancelText ?? "Huỷ"}
                </Button>
              )}
              <Button
                type="submit"
                variant={danger ? "danger" : "primary"}
                autoFocus={state.kind !== "prompt"}
              >
                {state.opts.confirmText ??
                  (state.kind === "confirm" ? "Đồng ý" : "OK")}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): Dialogs {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within <DialogProvider>");
  return ctx;
}
