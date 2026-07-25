"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Send, Trash2, Plus, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Toggle } from "@/components/SettingsDrawer";
import {
  NotificationRecipient,
  listRecipients,
  createRecipient,
  updateRecipient,
  deleteRecipient,
  testRecipient,
} from "@/lib/notifications";

type TestState = "idle" | "pending" | "sent" | "failed";

export default function NotificationRecipientsPanel() {
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [testState, setTestState] = useState<Record<string, TestState>>({});
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    listRecipients()
      .then(setRecipients)
      .catch(() => setRecipients([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(recipient: NotificationRecipient, field: "whatsapp_enabled" | "telegram_enabled") {
    const next = { ...recipient, [field]: !recipient[field] };
    setRecipients((prev) => prev.map((r) => (r.id === recipient.id ? next : r)));
    try {
      await updateRecipient(recipient.id, { [field]: next[field] });
    } catch {
      setRecipients((prev) => prev.map((r) => (r.id === recipient.id ? recipient : r)));
    }
  }

  async function handleDelete(id: string) {
    if (pendingDelete !== id) {
      setPendingDelete(id);
      return;
    }
    setPendingDelete(null);
    const prev = recipients;
    setRecipients((r) => r.filter((x) => x.id !== id));
    try {
      await deleteRecipient(id);
    } catch {
      setRecipients(prev);
    }
  }

  async function handleTest(id: string) {
    setTestState((s) => ({ ...s, [id]: "pending" }));
    try {
      const result = await testRecipient(id);
      const ok = Object.values(result).some((v) => v === "sent");
      setTestState((s) => ({ ...s, [id]: ok ? "sent" : "failed" }));
    } catch {
      setTestState((s) => ({ ...s, [id]: "failed" }));
    }
    setTimeout(() => setTestState((s) => ({ ...s, [id]: "idle" })), 3000);
  }

  return (
    <div className="space-y-1.5">
      {loading && (
        <p className="px-4 py-3 font-plus-jakarta text-[11px]" style={{ color: "var(--text-muted)" }}>
          Loading recipients…
        </p>
      )}

      {!loading && recipients.length === 0 && !showForm && (
        <p className="px-4 py-3 font-plus-jakarta text-[11px]" style={{ color: "var(--text-muted)" }}>
          No recipients yet. Add one to receive WhatsApp/Telegram alerts.
        </p>
      )}

      {recipients.map((r) => (
        <motion.div key={r.id} whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl glass-tactical"
        >
          <div className="flex-1 min-w-0">
            <p className="font-outfit font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
              {r.name}
            </p>
            <p className="font-plus-jakarta text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
              {r.phone_number || "no phone"} · {r.telegram_chat_id ? "telegram linked" : "no telegram"}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handleTest(r.id)}
              title="Send test message"
              className="flex items-center justify-center size-7 rounded-lg transition-all active:scale-95"
              style={{ backgroundColor: "var(--accent-subtle)", border: "1px solid var(--border-glass)" }}
            >
              {testState[r.id] === "pending" && <Loader2 size={13} className="animate-spin" style={{ color: "var(--text-secondary)" }} />}
              {testState[r.id] === "sent" && <CheckCircle2 size={13} style={{ color: "var(--accent)" }} />}
              {testState[r.id] === "failed" && <XCircle size={13} style={{ color: "var(--alert)" }} />}
              {(!testState[r.id] || testState[r.id] === "idle") && <Send size={13} style={{ color: "var(--text-secondary)" }} />}
            </button>

            <Toggle on={r.whatsapp_enabled} onToggle={() => handleToggle(r, "whatsapp_enabled")} color="accent" />
            <Toggle on={r.telegram_enabled} onToggle={() => handleToggle(r, "telegram_enabled")} color="accent" />

            <button
              onClick={() => handleDelete(r.id)}
              title={pendingDelete === r.id ? "Click again to confirm" : "Delete recipient"}
              className="flex items-center justify-center size-7 rounded-lg transition-all active:scale-95"
              style={{
                backgroundColor: pendingDelete === r.id ? "var(--alert-glow)" : "var(--accent-subtle)",
                border: "1px solid var(--border-glass)",
              }}
            >
              <Trash2 size={13} style={{ color: pendingDelete === r.id ? "var(--alert)" : "var(--text-secondary)" }} />
            </button>
          </div>
        </motion.div>
      ))}

      {showForm ? (
        <AddRecipientForm
          onCancel={() => setShowForm(false)}
          onCreated={(r) => { setRecipients((prev) => [r, ...prev]); setShowForm(false); }}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-2xl glass-tactical font-outfit font-semibold text-xs transition-all active:scale-[0.98]"
          style={{ color: "var(--accent)" }}
        >
          <Plus size={14} /> Add Recipient
        </button>
      )}
    </div>
  );
}

function AddRecipientForm({ onCancel, onCreated }: {
  onCancel: () => void;
  onCreated: (r: NotificationRecipient) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inputStyle = {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-glass)",
    color: "var(--text-primary)",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!phone.trim() && !telegramChatId.trim()) {
      setError("Provide a phone number or a Telegram chat id");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const recipient = await createRecipient({
        name: name.trim(),
        phone_number: phone.trim() || null,
        telegram_chat_id: telegramChatId.trim() || null,
        whatsapp_enabled: !!phone.trim(),
        telegram_enabled: !!telegramChatId.trim(),
      });
      onCreated(recipient);
    } catch {
      setError("Could not add recipient — check the details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 rounded-2xl glass-tactical space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <MessageCircle size={13} style={{ color: "var(--accent)" }} />
        <p className="font-outfit font-semibold text-xs" style={{ color: "var(--text-primary)" }}>New recipient</p>
      </div>
      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 rounded-xl text-xs font-plus-jakarta outline-none"
        style={inputStyle}
      />
      <input
        placeholder="Phone number (WhatsApp), e.g. +201234567890"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full px-3 py-2 rounded-xl text-xs font-plus-jakarta outline-none"
        style={inputStyle}
      />
      <input
        placeholder="Telegram chat id"
        value={telegramChatId}
        onChange={(e) => setTelegramChatId(e.target.value)}
        className="w-full px-3 py-2 rounded-xl text-xs font-plus-jakarta outline-none"
        style={inputStyle}
      />
      {error && (
        <p className="font-plus-jakarta text-[11px]" style={{ color: "var(--alert)" }}>{error}</p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-3 py-2 rounded-xl font-outfit font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          {submitting ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-xl font-outfit font-semibold text-xs transition-all active:scale-[0.98]"
          style={{ backgroundColor: "var(--accent-subtle)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
