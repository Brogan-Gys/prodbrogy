"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Pencil, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import {
  accents,
  readApiJson,
  rememberAdminPassword,
  uploadCategories,
  type AdminSound,
  type UploadState
} from "./lib";
import { AudioPreview } from "./AudioPreview";
import { Field } from "./ui";

type LibraryPanelProps = {
  password: string;
  sounds: AdminSound[];
  loadingSounds: boolean;
  onStatus: (state: UploadState) => void;
  reload: () => void | Promise<void>;
  setSounds: (updater: (current: AdminSound[]) => AdminSound[]) => void;
};

type SortKey = "title" | "category" | "producerName" | "bpm" | "duration";
type SortDir = "asc" | "desc";

// Shared grid template so the header row and every data row line up.
const COLS = "md:grid-cols-[40px_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_64px_72px_132px]";

const categoryLabel = (id: string) => uploadCategories.find((category) => category.id === id)?.label ?? id;

// "1:23" -> 83 seconds, for numeric sorting.
function durationSeconds(value: string) {
  const [minutes, seconds] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(minutes)) {
    return 0;
  }
  return minutes * 60 + (Number.isFinite(seconds) ? seconds : 0);
}

export function LibraryPanel({ password, sounds, loadingSounds, onStatus, reload, setSounds }: LibraryPanelProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = sounds.filter((sound) => {
      const matchesCategory = categoryFilter === "all" || sound.category === categoryFilter;
      const matchesQuery =
        !needle ||
        sound.title.toLowerCase().includes(needle) ||
        sound.producerName.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });

    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "bpm") {
        return ((a.bpm ?? -1) - (b.bpm ?? -1)) * direction;
      }
      if (sortKey === "duration") {
        return (durationSeconds(a.duration) - durationSeconds(b.duration)) * direction;
      }
      const av = sortKey === "category" ? categoryLabel(a.category) : a[sortKey];
      const bv = sortKey === "category" ? categoryLabel(b.category) : b[sortKey];
      return String(av).localeCompare(String(bv), undefined, { sensitivity: "base" }) * direction;
    });
  }, [sounds, query, categoryFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleEdit = async (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const getString = (key: string) => {
      const value = formData.get(key);
      return typeof value === "string" ? value.trim() : "";
    };
    const bpmRaw = getString("bpm");

    setSavingId(id);
    onStatus({ status: "submitting", message: "Saving sound..." });

    try {
      const response = await fetch("/api/admin/sounds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          id,
          title: getString("title"),
          category: getString("category"),
          producerName: getString("producerName"),
          bpm: bpmRaw && Number.isFinite(Number(bpmRaw)) ? Number(bpmRaw) : null,
          mood: "",
          duration: getString("duration"),
          tags: [],
          accent: getString("accent"),
          previewUrl: getString("previewUrl"),
          downloadUrl: getString("downloadUrl")
        })
      });
      const result = await readApiJson<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(result.error || "Save failed.");
      }

      rememberAdminPassword(password);
      setEditingId(null);
      onStatus({ status: "success", message: "Sound saved." });
      await reload();
    } catch (error) {
      onStatus({ status: "error", message: error instanceof Error ? error.message : "Save failed." });
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (sound: AdminSound) => {
    if (!window.confirm(`Delete "${sound.title}" from Sanity and remove its R2 files?`)) {
      return;
    }

    setDeletingId(sound.id);
    onStatus({ status: "submitting", message: "Deleting sound and linked R2 files..." });

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
      onStatus({ status: "success", message: "Sound deleted." });
    } catch (error) {
      onStatus({ status: "error", message: error instanceof Error ? error.message : "Delete failed." });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 border-2 border-ink bg-white p-4 shadow-hard sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="Search title or producer">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" aria-hidden />
            <input
              className="input pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
            />
          </div>
        </Field>
        <Field label="Category">
          <select className="input min-w-40" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">All categories</option>
            {uploadCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loadingSounds || !password}
          className="inline-flex h-12 items-center justify-center gap-2 border-2 border-ink bg-cyan text-stamp px-4 font-display text-sm font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={loadingSounds ? "h-5 w-5 animate-spin" : "h-5 w-5"} aria-hidden />
          Refresh
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-black uppercase leading-none">Library</h2>
        <p className="font-display text-sm font-black uppercase text-ink/55">
          {visible.length} of {sounds.length}
        </p>
      </div>

      {sounds.length === 0 ? (
        <div className="border-2 border-ink bg-white p-8 text-center shadow-hard">
          <p className="font-display text-xl font-black uppercase">No sounds yet</p>
          <p className="mt-1 text-sm font-bold uppercase text-ink/55">Add some on the Upload tab.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="border-2 border-ink bg-white p-8 text-center shadow-hard">
          <p className="font-display text-xl font-black uppercase">No matches</p>
          <p className="mt-1 text-sm font-bold uppercase text-ink/55">Try a different search or category.</p>
        </div>
      ) : (
        <div className="border-2 border-ink bg-white shadow-hard">
          {/* Header row (desktop only) */}
          <div className={`hidden items-center gap-3 border-b-2 border-ink bg-bone/60 px-3 py-2 md:grid ${COLS}`}>
            <span aria-hidden />
            <SortHeader label="Title" active={sortKey === "title"} dir={sortDir} onClick={() => toggleSort("title")} />
            <SortHeader label="Category" active={sortKey === "category"} dir={sortDir} onClick={() => toggleSort("category")} />
            <SortHeader label="Producer" active={sortKey === "producerName"} dir={sortDir} onClick={() => toggleSort("producerName")} />
            <SortHeader label="BPM" active={sortKey === "bpm"} dir={sortDir} onClick={() => toggleSort("bpm")} />
            <SortHeader label="Len" active={sortKey === "duration"} dir={sortDir} onClick={() => toggleSort("duration")} />
            <span className="text-right font-display text-xs font-black uppercase text-ink/55">Actions</span>
          </div>

          {/* Mobile sort control */}
          <div className="flex items-center gap-2 border-b-2 border-ink bg-bone/60 px-3 py-2 md:hidden">
            <span className="font-display text-xs font-black uppercase text-ink/55">Sort</span>
            <select
              className="input h-9 flex-1"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
            >
              <option value="title">Title</option>
              <option value="category">Category</option>
              <option value="producerName">Producer</option>
              <option value="bpm">BPM</option>
              <option value="duration">Length</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))}
              aria-label={sortDir === "asc" ? "Ascending" : "Descending"}
              className="inline-flex h-9 w-9 items-center justify-center border-2 border-ink bg-white shadow-hard"
            >
              {sortDir === "asc" ? <ArrowUp className="h-4 w-4" aria-hidden /> : <ArrowDown className="h-4 w-4" aria-hidden />}
            </button>
          </div>

          {visible.map((sound, index) => {
            const editing = editingId === sound.id;
            return (
              <div
                key={sound.id}
                className={`border-ink ${index > 0 ? "border-t-2" : ""} ${editing ? "bg-volt/10" : ""}`}
              >
                {/* Desktop table row */}
                <div className={`hidden items-center gap-3 px-3 py-2 md:grid ${COLS}`}>
                  <AudioPreview source={sound.previewUrl} label={sound.title} />
                  <span className="truncate font-display text-sm font-black uppercase" title={sound.title}>
                    {sound.title}
                  </span>
                  <span className="truncate text-xs font-bold uppercase text-ink/70">{categoryLabel(sound.category)}</span>
                  <span className="truncate text-xs font-bold uppercase text-ink/60">{sound.producerName || "—"}</span>
                  <span className="text-xs font-bold uppercase text-ink/60">{sound.bpm ?? "—"}</span>
                  <span className="text-xs font-bold uppercase text-ink/60">{sound.duration || "—"}</span>
                  <RowActions
                    editing={editing}
                    deleting={deletingId === sound.id}
                    disabled={!password}
                    onEdit={() => setEditingId(editing ? null : sound.id)}
                    onDelete={() => handleDelete(sound)}
                  />
                </div>

                {/* Mobile card row */}
                <div className="flex items-center gap-3 px-3 py-3 md:hidden">
                  <AudioPreview source={sound.previewUrl} label={sound.title} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-black uppercase leading-none">{sound.title}</p>
                    <p className="mt-1 truncate text-xs font-bold uppercase text-ink/55">
                      {categoryLabel(sound.category)}
                      {sound.producerName ? ` · ${sound.producerName}` : ""}
                      {sound.bpm ? ` · ${sound.bpm} BPM` : ""}
                      {sound.duration ? ` · ${sound.duration}` : ""}
                    </p>
                  </div>
                  <RowActions
                    editing={editing}
                    deleting={deletingId === sound.id}
                    disabled={!password}
                    onEdit={() => setEditingId(editing ? null : sound.id)}
                    onDelete={() => handleDelete(sound)}
                  />
                </div>

                {editing ? (
                  <form onSubmit={(event) => handleEdit(event, sound.id)} className="grid gap-3 border-t-2 border-ink p-4 lg:grid-cols-4">
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
                    <div className="lg:col-span-4">
                      <Field label="Download path">
                        <input name="downloadUrl" className="input" defaultValue={sound.downloadUrl ?? ""} />
                      </Field>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-3 lg:col-span-4">
                      <p className="min-w-0 truncate text-xs font-bold uppercase text-ink/40">{sound.id}</p>
                      <button
                        type="submit"
                        disabled={savingId === sound.id || !password}
                        className="inline-flex h-11 items-center gap-2 border-2 border-ink bg-volt text-stamp px-4 font-display text-xs font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingId === sound.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                        Save
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 font-display text-xs font-black uppercase transition hover:text-ink ${
        active ? "text-ink" : "text-ink/55"
      }`}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />
      )}
    </button>
  );
}

function RowActions({
  editing,
  deleting,
  disabled,
  onEdit,
  onDelete
}: {
  editing: boolean;
  deleting: boolean;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onEdit}
        aria-label={editing ? "Close editor" : "Edit sound"}
        className="inline-flex h-9 items-center gap-1 border-2 border-ink bg-white px-2.5 font-display text-xs font-black uppercase shadow-hard transition hover:-translate-y-0.5"
      >
        {editing ? <X className="h-4 w-4" aria-hidden /> : <Pencil className="h-4 w-4" aria-hidden />}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting || disabled}
        aria-label="Delete sound"
        className="inline-flex h-9 items-center gap-1 border-2 border-ink bg-coral text-stamp px-2.5 font-display text-xs font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
