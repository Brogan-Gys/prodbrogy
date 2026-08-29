"use client";

import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Library, Loader2, LogIn, UploadCloud, XCircle } from "lucide-react";
import Link from "next/link";
import {
  readApiJson,
  readStoredAdminPassword,
  rememberAdminPassword,
  type AdminSound,
  type PasswordStatus,
  type UploadState
} from "./lib";
import { UploadPanel } from "./UploadPanel";
import { LibraryPanel } from "./LibraryPanel";

type Tab = "upload" | "library";

export function UploadClient() {
  const [password, setPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<PasswordStatus>("unknown");
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<Tab>("upload");
  const [state, setState] = useState<UploadState>({ status: "idle", message: "" });
  const [sounds, setSounds] = useState<AdminSound[]>([]);
  const [loadingSounds, setLoadingSounds] = useState(false);

  useEffect(() => {
    const stored = readStoredAdminPassword();
    if (stored) {
      setPassword(stored);
    }
  }, []);

  const loadSounds = async (candidate = password) => {
    if (!candidate) {
      setState({ status: "error", message: "Enter the admin password." });
      return false;
    }

    setLoadingSounds(true);
    setState({ status: "submitting", message: "Loading library..." });

    try {
      const response = await fetch("/api/admin/sounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: candidate })
      });
      const result = await readApiJson<{ error?: string; sounds?: AdminSound[] }>(response);

      if (response.status === 401) {
        setPasswordStatus("invalid");
        throw new Error("Wrong password.");
      }

      if (!response.ok) {
        throw new Error(result.error || "Could not load sounds.");
      }

      rememberAdminPassword(candidate);
      setPasswordStatus("valid");
      setUnlocked(true);
      setSounds(result.sounds ?? []);
      setState({
        status: "success",
        message: `Loaded ${result.sounds?.length ?? 0} sound${result.sounds?.length === 1 ? "" : "s"}.`
      });
      return true;
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Could not load sounds." });
      return false;
    } finally {
      setLoadingSounds(false);
    }
  };

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadSounds();
  };

  if (!unlocked) {
    return (
      <main className="grain flex min-h-screen items-center justify-center px-4 py-10">
        <form onSubmit={handleUnlock} className="w-full max-w-md border-2 border-ink bg-white p-6 shadow-hard">
          <p className="font-display text-sm font-black uppercase text-ink/55">Private admin</p>
          <h1 className="font-display text-4xl font-black uppercase leading-none">Sound Admin</h1>
          <label className="mt-6 grid gap-2">
            <span className="font-display text-xs font-black uppercase text-ink/60">Admin password</span>
            <input
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordStatus("unknown");
              }}
              type="password"
              required
              autoFocus
              className="input"
              autoComplete="current-password"
            />
          </label>
          {passwordStatus === "invalid" ? (
            <p className="mt-2 flex items-center gap-1 text-xs font-black uppercase text-coral">
              <XCircle className="h-4 w-4" aria-hidden />
              Wrong password
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loadingSounds || !password}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 border-2 border-ink bg-volt px-4 font-display text-sm font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingSounds ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <LogIn className="h-5 w-5" aria-hidden />}
            Enter
          </button>
          <Link
            href="/"
            className="mt-3 inline-flex items-center gap-1 font-display text-xs font-black uppercase text-ink/55 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to vault
          </Link>
        </form>
      </main>
    );
  }

  return (
    <main className="grain min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="sticky top-0 z-20 -mx-4 border-b-2 border-ink bg-bone/95 px-4 py-3 backdrop-blur sm:mx-0 sm:border-2 sm:bg-white sm:px-4 sm:shadow-hard">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-black uppercase leading-none sm:text-3xl">Sound Admin</h1>
              {passwordStatus === "valid" ? (
                <span className="hidden items-center gap-1 text-xs font-black uppercase text-emerald-600 sm:flex">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Unlocked
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border-2 border-ink shadow-hard">
                <TabButton active={tab === "upload"} onClick={() => setTab("upload")} icon={<UploadCloud className="h-4 w-4" aria-hidden />}>
                  Upload
                </TabButton>
                <TabButton active={tab === "library"} onClick={() => setTab("library")} icon={<Library className="h-4 w-4" aria-hidden />}>
                  Library
                </TabButton>
              </div>
              <Link
                href="/"
                className="inline-flex h-10 items-center gap-2 border-2 border-ink bg-white px-3 font-display text-xs font-black uppercase shadow-hard transition hover:-translate-y-0.5"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Vault</span>
              </Link>
            </div>
          </div>
        </header>

        {tab === "upload" ? (
          <UploadPanel
            password={password}
            onStatus={setState}
            onSaved={async () => {
              await loadSounds();
            }}
            onPasswordValid={() => setPasswordStatus("valid")}
            onPasswordInvalid={() => setPasswordStatus("invalid")}
          />
        ) : (
          <LibraryPanel
            password={password}
            sounds={sounds}
            loadingSounds={loadingSounds}
            onStatus={setState}
            reload={async () => {
              await loadSounds();
            }}
            setSounds={setSounds}
          />
        )}
      </div>

      <StatusToast state={state} />
    </main>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-2 px-3 font-display text-xs font-black uppercase transition ${
        active ? "bg-volt" : "bg-white hover:bg-bone"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function StatusToast({ state }: { state: UploadState }) {
  if (!state.message) {
    return null;
  }

  const tone =
    state.status === "error"
      ? "bg-coral"
      : state.status === "success"
        ? "bg-volt"
        : "bg-white";

  return (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 border-2 border-ink px-4 py-3 shadow-hard ${tone}`}
    >
      {state.status === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      <p className="text-sm font-black uppercase">{state.message}</p>
    </div>
  );
}
