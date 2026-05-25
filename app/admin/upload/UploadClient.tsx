"use client";

import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Save, Trash2, UploadCloud } from "lucide-react";
import Link from "next/link";
import { categories } from "@/lib/sounds";

type UploadState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

type AdminSound = {
  id: string;
  title: string;
  category: string;
  producerName: string;
  bpm: number | null;
  key: string;
  mood: string;
  credits: number;
  duration: string;
  tags: string[];
  accent: "volt" | "coral" | "cyan" | "plum";
  previewUrl?: string;
  downloadUrl?: string;
};

const uploadCategories = categories.filter((category) => category.id !== "all");
const accents = ["volt", "coral", "cyan", "plum"] as const;
const ADMIN_PASSWORD_STORAGE_KEY = "prodbrogy-admin-password";
const ADMIN_PASSWORD_TTL_MS = 12 * 60 * 60 * 1000;

type StoredAdminPassword = {
  value: string;
  expiresAt: number;
};

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFormNumber(formData: FormData, key: string) {
  const value = getFormString(formData, key);
  if (!value) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function readStoredAdminPassword() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || "null") as StoredAdminPassword | null;

    if (!stored?.value || !stored.expiresAt || Date.now() > stored.expiresAt) {
      window.localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
      return "";
    }

    return stored.value;
  } catch {
    return "";
  }
}

function rememberAdminPassword(value: string) {
  if (!value) {
    return;
  }

  window.localStorage.setItem(
    ADMIN_PASSWORD_STORAGE_KEY,
    JSON.stringify({
      value,
      expiresAt: Date.now() + ADMIN_PASSWORD_TTL_MS
    })
  );
}

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: text.slice(0, 180) || "The server returned an unreadable response." } as T;
  }
}

async function uploadFileDirectly(file: File, url: string, contentType: string) {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed for ${file.name}.`);
  }
}

function getUploadFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function getNumberValue(formData: FormData, key: string) {
  const value = getFormNumber(formData, key);
  return value === null ? undefined : value;
}

export function UploadClient() {
  const [password, setPassword] = useState("");
  const [state, setState] = useState<UploadState>({ status: "idle", message: "" });
  const [sounds, setSounds] = useState<AdminSound[]>([]);
  const [loadingSounds, setLoadingSounds] = useState(false);

  useEffect(() => {
    setPassword(readStoredAdminPassword());
  }, []);

  const loadSounds = async () => {
    setLoadingSounds(true);
    setState({ status: "idle", message: "Loading admin library..." });

    try {
      const response = await fetch("/api/admin/sounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const result = await readApiJson<{ error?: string; sounds?: AdminSound[] }>(response);

      if (!response.ok) {
        throw new Error(result.error || "Could not load sounds.");
      }

      rememberAdminPassword(password);
      setSounds(result.sounds ?? []);
      setState({ status: "success", message: `Loaded ${result.sounds?.length ?? 0} sound${result.sounds?.length === 1 ? "" : "s"}.` });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Could not load sounds." });
    } finally {
      setLoadingSounds(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState({ status: "submitting", message: "Uploading files and creating the catalog entry..." });

    const form = event.currentTarget;
    const formData = new FormData(form);
    const previewFile = getUploadFile(formData, "previewFile");
    const downloadFile = getUploadFile(formData, "downloadFile");

    try {
      const uploadUrlResponse = await fetch("/api/admin/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          title: getFormString(formData, "title"),
          previewFileName: previewFile?.name,
          previewContentType: previewFile?.type,
          downloadFileName: downloadFile?.name,
          downloadContentType: downloadFile?.type
        })
      });
      const uploadTargets = await readApiJson<{
        error?: string;
        baseKey?: string;
        preview?: { key: string; url: string; contentType: string } | null;
        download?: { key: string; url: string; contentType: string } | null;
      }>(uploadUrlResponse);

      if (!uploadUrlResponse.ok) {
        throw new Error(uploadTargets.error || "Upload setup failed.");
      }

      if (previewFile && uploadTargets.preview) {
        setState({ status: "submitting", message: "Uploading preview directly to R2..." });
        await uploadFileDirectly(previewFile, uploadTargets.preview.url, uploadTargets.preview.contentType);
      }

      if (downloadFile && uploadTargets.download) {
        setState({ status: "submitting", message: "Uploading download directly to R2..." });
        await uploadFileDirectly(downloadFile, uploadTargets.download.url, uploadTargets.download.contentType);
      }

      setState({ status: "submitting", message: "Trimming preview and creating catalog entry..." });
      const finalizeResponse = await fetch("/api/admin/upload-sound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          baseKey: uploadTargets.baseKey,
          previewTempKey: uploadTargets.preview?.key,
          downloadKey: uploadTargets.download?.key,
          title: getFormString(formData, "title"),
          category: getFormString(formData, "category"),
          producerName: getFormString(formData, "producerName"),
          bpm: getNumberValue(formData, "bpm"),
          key: getFormString(formData, "key"),
          mood: getFormString(formData, "mood"),
          credits: getNumberValue(formData, "credits"),
          duration: getFormString(formData, "duration"),
          tags: parseCsv(getFormString(formData, "tags")),
          accent: getFormString(formData, "accent")
        })
      });
      const result = await readApiJson<{ error?: string; id?: string; warning?: string }>(finalizeResponse);

      if (!finalizeResponse.ok) {
        throw new Error(result.error || "Upload failed.");
      }

      rememberAdminPassword(password);
      form.reset();
      setState({
        status: "success",
        message: result.warning ? `Sound added, but ${result.warning}` : `Sound added to the site. Sanity ID: ${result.id}`
      });
      await loadSounds();
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Upload failed."
      });
    }
  };

  const handleEdit = async (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    setState({ status: "submitting", message: "Saving sound..." });

    const formData = new FormData(event.currentTarget);
    const payload = {
      password,
      id,
      title: getFormString(formData, "title"),
      category: getFormString(formData, "category"),
      producerName: getFormString(formData, "producerName"),
      bpm: getFormNumber(formData, "bpm"),
      key: getFormString(formData, "key"),
      mood: getFormString(formData, "mood"),
      credits: getFormNumber(formData, "credits") ?? 1,
      duration: getFormString(formData, "duration"),
      tags: parseCsv(getFormString(formData, "tags")),
      accent: getFormString(formData, "accent"),
      previewUrl: getFormString(formData, "previewUrl"),
      downloadUrl: getFormString(formData, "downloadUrl")
    };

    try {
      const response = await fetch("/api/admin/sounds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await readApiJson<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(result.error || "Save failed.");
      }

      rememberAdminPassword(password);
      setState({ status: "success", message: "Sound saved." });
      await loadSounds();
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Save failed." });
    }
  };

  const handleDelete = async (sound: AdminSound) => {
    const confirmed = window.confirm(`Delete "${sound.title}" from Sanity and remove its R2 files?`);

    if (!confirmed) {
      return;
    }

    setState({ status: "submitting", message: "Deleting sound and linked R2 files..." });

    try {
      const response = await fetch("/api/admin/sounds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id: sound.id })
      });
      const result = await readApiJson<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(result.error || "Delete failed.");
      }

      setSounds((current) => current.filter((item) => item.id !== sound.id));
      setState({ status: "success", message: "Sound deleted." });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Delete failed." });
    }
  };

  return (
    <main className="grain min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-sm font-black uppercase text-ink/55">Private admin</p>
            <h1 className="font-display text-4xl font-black uppercase leading-none sm:text-5xl">Sound Admin</h1>
          </div>
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 border-2 border-ink bg-white px-3 font-display text-xs font-black uppercase shadow-hard transition hover:-translate-y-0.5"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Vault
          </Link>
        </div>

        <section className="grid gap-3 border-2 border-ink bg-white p-4 shadow-hard md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Admin password">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              className="input"
              autoComplete="current-password"
            />
          </Field>
          <button
            type="button"
            onClick={loadSounds}
            disabled={loadingSounds || !password}
            className="inline-flex h-12 items-center justify-center gap-2 border-2 border-ink bg-cyan px-4 font-display text-sm font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={loadingSounds ? "h-5 w-5 animate-spin" : "h-5 w-5"} aria-hidden />
            Load Library
          </button>
        </section>

        <form onSubmit={handleSubmit} className="grid gap-4 border-2 border-ink bg-white p-4 shadow-hard lg:grid-cols-2">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-black uppercase leading-none">Upload New Sound</h2>
          </div>

          <Field label="Title">
            <input name="title" required className="input" placeholder="Night drive loop" />
          </Field>

          <Field label="Category">
            <select name="category" required className="input">
              {uploadCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Producer name">
            <input name="producerName" className="input" placeholder="Collaborator or producer credit" />
          </Field>

          <Field label="Accent">
            <select name="accent" className="input" defaultValue="volt">
              {accents.map((accent) => (
                <option key={accent} value={accent}>
                  {accent}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Preview audio - optional">
            <input name="previewFile" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm" className="file-input" />
          </Field>

          <Field label="Download file">
            <input name="downloadFile" type="file" accept=".zip,.rar,.7z,.mid,.midi,audio/*" className="file-input" />
          </Field>

          <Field label="BPM">
            <input name="bpm" type="number" min="0" className="input" placeholder="140" />
          </Field>

          <Field label="Key">
            <input name="key" className="input" placeholder="F minor" />
          </Field>

          <Field label="Mood">
            <input name="mood" className="input" placeholder="dark, glossy, bounce" />
          </Field>

          <Field label="Credits">
            <input name="credits" type="number" min="1" max="12" required className="input" defaultValue="1" />
          </Field>

          <Field label="Duration">
            <input name="duration" className="input" placeholder="0:18" defaultValue="0:00" />
          </Field>

          <Field label="Tags">
            <input name="tags" className="input" placeholder="trap, piano, loop" />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-4 lg:col-span-2">
            <StatusText state={state} />
            <button
              type="submit"
              disabled={state.status === "submitting" || !password}
              className="inline-flex h-12 items-center gap-2 border-2 border-ink bg-volt px-4 font-display text-sm font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state.status === "submitting" ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : state.status === "success" ? (
                <CheckCircle2 className="h-5 w-5" aria-hidden />
              ) : (
                <UploadCloud className="h-5 w-5" aria-hidden />
              )}
              Upload
            </button>
          </div>
        </form>

        <section className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-3xl font-black uppercase leading-none">Manage Sounds</h2>
            <p className="font-display text-sm font-black uppercase text-ink/55">{sounds.length} loaded</p>
          </div>

          {sounds.length === 0 ? (
            <div className="border-2 border-ink bg-white p-6 text-center shadow-hard">
              <p className="font-display text-xl font-black uppercase">No admin sounds loaded</p>
            </div>
          ) : (
            sounds.map((sound) => (
              <form
                key={sound.id}
                onSubmit={(event) => handleEdit(event, sound.id)}
                className="grid gap-3 border-2 border-ink bg-white p-4 shadow-hard lg:grid-cols-4"
              >
                <Field label="Title">
                  <input name="title" className="input" defaultValue={sound.title} required />
                </Field>
                <Field label="Category">
                  <select name="category" className="input" defaultValue={sound.category} required>
                    {uploadCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Producer name">
                  <input name="producerName" className="input" defaultValue={sound.producerName} />
                </Field>
                <Field label="BPM">
                  <input name="bpm" type="number" min="0" className="input" defaultValue={sound.bpm ?? ""} />
                </Field>
                <Field label="Credits">
                  <input name="credits" type="number" min="1" max="12" className="input" defaultValue={sound.credits} />
                </Field>
                <Field label="Key">
                  <input name="key" className="input" defaultValue={sound.key} />
                </Field>
                <Field label="Mood">
                  <input name="mood" className="input" defaultValue={sound.mood} />
                </Field>
                <Field label="Duration">
                  <input name="duration" className="input" defaultValue={sound.duration} />
                </Field>
                <Field label="Accent">
                  <select name="accent" className="input" defaultValue={sound.accent}>
                    {accents.map((accent) => (
                      <option key={accent} value={accent}>
                        {accent}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="lg:col-span-2">
                  <Field label="Preview path">
                    <input name="previewUrl" className="input" defaultValue={sound.previewUrl ?? ""} />
                  </Field>
                </div>
                <div className="lg:col-span-2">
                  <Field label="Download path">
                    <input name="downloadUrl" className="input" defaultValue={sound.downloadUrl ?? ""} />
                  </Field>
                </div>
                <div className="lg:col-span-4">
                  <Field label="Tags">
                    <input name="tags" className="input" defaultValue={sound.tags.join(", ")} />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-3 lg:col-span-4">
                  <p className="min-w-0 truncate text-xs font-bold uppercase text-ink/50">{sound.id}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(sound)}
                      disabled={state.status === "submitting" || !password}
                      className="inline-flex h-11 items-center gap-2 border-2 border-ink bg-coral px-3 font-display text-xs font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Delete
                    </button>
                    <button
                      type="submit"
                      disabled={state.status === "submitting" || !password}
                      className="inline-flex h-11 items-center gap-2 border-2 border-ink bg-volt px-3 font-display text-xs font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" aria-hidden />
                      Save
                    </button>
                  </div>
                </div>
              </form>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function StatusText({ state }: { state: UploadState }) {
  return <p className="min-h-5 text-sm font-bold uppercase text-ink/60">{state.message}</p>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-display text-xs font-black uppercase text-ink/60">{label}</span>
      {children}
    </label>
  );
}
