"use client";

import { FormEvent, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import {
  accents,
  batchCategories,
  defaultBatchCategory,
  defaultUploadCategory,
  isMidiFile,
  parseFileName,
  readAudioDuration,
  readMidiMeta,
  rememberAdminPassword,
  uploadCategories,
  uploadSoundFile,
  type Accent,
  type BatchRow,
  type UploadState
} from "./lib";
import { AudioPreview } from "./AudioPreview";
import { Field } from "./ui";

type UploadPanelProps = {
  password: string;
  onStatus: (state: UploadState) => void;
  onSaved: () => void | Promise<void>;
  onPasswordValid: () => void;
  onPasswordInvalid: () => void;
};

const AUDIO_ACCEPT = "audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm";
const MIDI_ACCEPT = ".mid,.midi,audio/midi,audio/x-midi";
const BATCH_ACCEPT = `${AUDIO_ACCEPT},${MIDI_ACCEPT}`;

export function UploadPanel({ password, onStatus, onSaved, onPasswordValid, onPasswordInvalid }: UploadPanelProps) {
  const [batchCategory, setBatchCategory] = useState(defaultBatchCategory);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchSaving, setBatchSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [midiOpen, setMidiOpen] = useState(false);
  const [midiCategory, setMidiCategory] = useState(defaultUploadCategory);
  const [midiSaving, setMidiSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addBatchFiles = async (fileList: FileList | File[] | null) => {
    const files = Array.from(fileList ?? []).filter((file) => file.size > 0);
    if (files.length === 0) {
      return;
    }

    const rows = await Promise.all(
      files.map(async (file, index) => {
        const parsed = parseFileName(file.name);
        const isMidi = isMidiFile(file);
        const midiMeta = isMidi ? await readMidiMeta(file) : null;
        const duration = midiMeta ? midiMeta.duration : await readAudioDuration(file);

        return {
          rowId: `${Date.now().toString(36)}-${index}-${file.name}`,
          file,
          title: parsed.title,
          category: isMidi ? "midi" : batchCategory,
          producerName: parsed.producerName,
          bpm: parsed.bpm ?? midiMeta?.bpm ?? null,
          duration,
          accent: accents[index % accents.length],
          status: "pending" as const,
          message: ""
        };
      })
    );

    setBatchRows((current) => [...current, ...rows]);
    onStatus({ status: "idle", message: `Parsed ${rows.length} file${rows.length === 1 ? "" : "s"}. Review and save.` });
  };

  const updateBatchRow = (rowId: string, changes: Partial<BatchRow>) => {
    setBatchRows((current) => current.map((row) => (row.rowId === rowId ? { ...row, ...changes } : row)));
  };

  const removeBatchRow = (rowId: string) => {
    setBatchRows((current) => current.filter((row) => row.rowId !== rowId));
  };

  const handleBatchSave = async () => {
    if (!password) {
      onStatus({ status: "error", message: "Enter the admin password to save." });
      return;
    }

    const pendingRows = batchRows.filter((row) => row.status !== "done");
    if (pendingRows.length === 0) {
      return;
    }

    setBatchSaving(true);
    onStatus({
      status: "submitting",
      message: `Uploading ${pendingRows.length} sound${pendingRows.length === 1 ? "" : "s"}...`
    });

    let saved = 0;
    let failed = 0;

    for (const row of pendingRows) {
      updateBatchRow(row.rowId, { status: "uploading", message: "Uploading..." });

      try {
        if (!row.title) {
          throw new Error("Title is required.");
        }

        const result = await uploadSoundFile({
          file: row.file,
          password,
          meta: {
            title: row.title,
            category: row.category,
            producerName: row.producerName,
            bpm: row.bpm,
            duration: row.duration,
            accent: row.accent
          }
        });

        saved += 1;
        updateBatchRow(row.rowId, { status: "done", message: result.warning || "Added." });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed.";
        failed += 1;
        updateBatchRow(row.rowId, { status: "error", message });

        // Wrong password fails every row — stop early and flag it instead of hammering.
        if (message.toLowerCase().includes("password")) {
          onPasswordInvalid();
          setBatchSaving(false);
          onStatus({ status: "error", message: "Wrong password. Fix it above, then Save All again." });
          return;
        }
      }
    }

    setBatchSaving(false);
    rememberAdminPassword(password);
    if (saved > 0) {
      onPasswordValid();
    }
    onStatus({
      status: failed > 0 ? "error" : "success",
      message: `Saved ${saved} sound${saved === 1 ? "" : "s"}${failed > 0 ? `, ${failed} failed.` : "."}`
    });
    await onSaved();
  };

  const handleMidiSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password) {
      onStatus({ status: "error", message: "Enter the admin password to save." });
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const getString = (key: string) => {
      const value = formData.get(key);
      return typeof value === "string" ? value.trim() : "";
    };
    const getFile = (key: string) => {
      const value = formData.get(key);
      return value instanceof File && value.size > 0 ? value : null;
    };

    const downloadFile = getFile("downloadFile");

    setMidiSaving(true);
    onStatus({ status: "submitting", message: "Uploading and creating catalog entry..." });

    try {
      if (!downloadFile) {
        throw new Error("Choose a download file.");
      }

      const bpmRaw = getString("bpm");
      const bpm = bpmRaw && Number.isFinite(Number(bpmRaw)) ? Number(bpmRaw) : null;
      const accentValue = getString("accent");

      const result = await uploadSoundFile({
        file: downloadFile,
        password,
        meta: {
          title: getString("title"),
          category: getString("category"),
          producerName: getString("producerName"),
          bpm,
          duration: getString("duration") || "0:00",
          accent: accents.includes(accentValue as Accent) ? (accentValue as Accent) : "volt"
        }
      });

      rememberAdminPassword(password);
      onPasswordValid();
      form.reset();
      setMidiCategory(defaultUploadCategory);
      onStatus({
        status: "success",
        message: result.warning ? `Sound added, but ${result.warning}` : "Sound added to the site."
      });
      await onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      if (message.toLowerCase().includes("password")) {
        onPasswordInvalid();
      }
      onStatus({ status: "error", message });
    } finally {
      setMidiSaving(false);
    }
  };

  const pendingCount = batchRows.filter((row) => row.status !== "done").length;

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 border-2 border-ink bg-white p-4 shadow-hard sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-black uppercase leading-none">Upload sounds</h2>
            <p className="mt-1 text-sm font-bold uppercase text-ink/55">
              Drop audio in — title, BPM &amp; length are read from the file name.
            </p>
          </div>
          <Field label="Category for new files">
            <select
              className="input min-w-44"
              value={batchCategory}
              onChange={(event) => {
                const value = event.target.value;
                setBatchCategory(value);
                setBatchRows((current) =>
                  current.map((row) => (row.status === "pending" ? { ...row, category: value } : row))
                );
              }}
            >
              {batchCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void addBatchFiles(event.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink px-4 py-10 text-center transition ${
            dragging ? "bg-volt text-stamp shadow-hard" : "bg-bone/60 hover:bg-bone"
          }`}
        >
          <UploadCloud className="h-8 w-8" aria-hidden />
          <span className="font-display text-lg font-black uppercase leading-none">Drop audio or MIDI files here</span>
          <span className="text-xs font-bold uppercase text-ink/55">or click to browse — MIDI files file themselves under MIDI automatically</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={BATCH_ACCEPT}
          className="hidden"
          onChange={(event) => {
            void addBatchFiles(event.target.files);
            event.target.value = "";
          }}
        />

        {batchRows.length > 0 ? (
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-black uppercase text-ink/55">
                {batchRows.length} queued · {pendingCount} to save
              </p>
              <button
                type="button"
                onClick={() => setBatchRows([])}
                disabled={batchSaving}
                className="font-display text-xs font-black uppercase text-ink/55 underline underline-offset-2 disabled:opacity-40"
              >
                Clear all
              </button>
            </div>

            {batchRows.map((row) => (
              <div key={row.rowId} className="grid gap-3 border-2 border-ink bg-bone/40 p-3 shadow-hard lg:grid-cols-6">
                <div className="flex items-end gap-2 lg:col-span-2">
                  <AudioPreview source={row.file} label={row.title} />
                  <div className="min-w-0 flex-1">
                    <Field label="Title">
                      <input
                        className="input"
                        value={row.title}
                        onChange={(event) => updateBatchRow(row.rowId, { title: event.target.value })}
                      />
                    </Field>
                  </div>
                </div>
                <Field label="Category">
                  <select
                    className="input"
                    value={row.category}
                    onChange={(event) => updateBatchRow(row.rowId, { category: event.target.value })}
                  >
                    {batchCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Producer">
                  <input
                    className="input"
                    value={row.producerName}
                    onChange={(event) => updateBatchRow(row.rowId, { producerName: event.target.value })}
                  />
                </Field>
                <Field label="BPM">
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={row.bpm ?? ""}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      updateBatchRow(row.rowId, { bpm: event.target.value && Number.isFinite(next) ? next : null });
                    }}
                  />
                </Field>
                <Field label="Duration">
                  <input
                    className="input"
                    value={row.duration}
                    onChange={(event) => updateBatchRow(row.rowId, { duration: event.target.value })}
                  />
                </Field>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink pt-2 lg:col-span-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold uppercase text-ink/50">{row.file.name}</p>
                    {row.message ? (
                      <p
                        className={`text-xs font-bold uppercase ${
                          row.status === "error" ? "text-coral" : "text-ink/50"
                        }`}
                      >
                        {row.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <BatchStatusBadge status={row.status} />
                    <button
                      type="button"
                      onClick={() => removeBatchRow(row.rowId)}
                      disabled={batchSaving}
                      aria-label="Remove from queue"
                      className="inline-flex h-9 items-center gap-1 border-2 border-ink bg-coral text-stamp px-2 font-display text-xs font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end border-t-2 border-ink pt-3">
              <button
                type="button"
                onClick={handleBatchSave}
                disabled={batchSaving || pendingCount === 0}
                className="inline-flex h-12 items-center gap-2 border-2 border-ink bg-volt text-stamp px-5 font-display text-sm font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {batchSaving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <UploadCloud className="h-5 w-5" aria-hidden />}
                Save all ({pendingCount})
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="border-2 border-ink bg-white shadow-hard">
        <button
          type="button"
          onClick={() => setMidiOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
        >
          <div>
            <h2 className="font-display text-lg font-black uppercase leading-none">MIDI / custom upload</h2>
            <p className="mt-1 text-xs font-bold uppercase text-ink/55">
              For files that need a separate preview (e.g. MIDI packs).
            </p>
          </div>
          <ChevronDown className={`h-6 w-6 shrink-0 transition ${midiOpen ? "rotate-180" : ""}`} aria-hidden />
        </button>

        {midiOpen ? (
          <form onSubmit={handleMidiSubmit} className="grid gap-4 border-t-2 border-ink p-4 lg:grid-cols-2">
            <Field label="Title">
              <input name="title" required className="input" placeholder="Night drive loop" />
            </Field>
            <Field label="Category">
              <select
                name="category"
                required
                className="input"
                value={midiCategory}
                onChange={(event) => setMidiCategory(event.target.value)}
              >
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
            <Field label="Download file">
              <input name="downloadFile" type="file" accept=".zip,.rar,.7z,.mid,.midi,audio/*" required className="file-input" />
            </Field>
            {midiCategory === "midi" ? (
              <p className="text-[11px] font-bold uppercase text-ink/55 lg:col-span-2">
                MIDI plays in the browser through a soundfont, built from the file itself. No preview upload needed.
              </p>
            ) : null}
            <Field label="BPM">
              <input name="bpm" type="number" min="0" className="input" placeholder="140" />
            </Field>
            <Field label="Duration">
              <input name="duration" className="input" placeholder="0:18" defaultValue="0:00" />
            </Field>
            <div className="flex justify-end border-t-2 border-ink pt-4 lg:col-span-2">
              <button
                type="submit"
                disabled={midiSaving || !password}
                className="inline-flex h-12 items-center gap-2 border-2 border-ink bg-volt text-stamp px-5 font-display text-sm font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {midiSaving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Plus className="h-5 w-5" aria-hidden />}
                Add sound
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}

function BatchStatusBadge({ status }: { status: BatchRow["status"] }) {
  if (status === "done") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Saved" />;
  }

  if (status === "uploading") {
    return <Loader2 className="h-5 w-5 animate-spin" aria-label="Uploading" />;
  }

  if (status === "error") {
    return <span className="font-display text-xs font-black uppercase text-coral">Error</span>;
  }

  return <span className="font-display text-xs font-black uppercase text-ink/45">Ready</span>;
}
