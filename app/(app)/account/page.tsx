"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Status = { type: "success" | "error"; message: string } | null;

function StatusMessage({ status }: { status: Status }) {
  if (!status) {
    return null;
  }

  return (
    <p
      className={`mt-3 text-sm ${
        status.type === "success" ? "text-green-400" : "text-red-400"
      }`}
    >
      {status.message}
    </p>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameStatus, setNameStatus] = useState<Status>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailStatus, setEmailStatus] = useState<Status>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setEmail(session.user.email || "");
      setName(session.user.user_metadata?.full_name || "");
      setCreatedAt(session.user.created_at || null);
      setLoading(false);
    }

    loadUser();
  }, [router]);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    setNameSaving(true);
    setNameStatus(null);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: name },
    });

    setNameSaving(false);
    setNameStatus(
      error
        ? { type: "error", message: error.message }
        : { type: "success", message: "Naam bijgewerkt." }
    );
  }

  async function handleEmailSave(e: React.FormEvent) {
    e.preventDefault();
    setEmailStatus(null);

    if (!newEmail) {
      setEmailStatus({ type: "error", message: "Vul een nieuw e-mailadres in." });
      return;
    }

    setEmailSaving(true);

    const { error } = await supabase.auth.updateUser({ email: newEmail });

    setEmailSaving(false);

    if (error) {
      setEmailStatus({ type: "error", message: error.message });
      return;
    }

    setEmailStatus({
      type: "success",
      message:
        "Bevestigingsmail verstuurd. Klik op de link in je (nieuwe en/of huidige) mailbox om de wijziging af te ronden.",
    });
    setNewEmail("");
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 8) {
      setPasswordStatus({
        type: "error",
        message: "Wachtwoord moet minimaal 8 tekens lang zijn.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "Wachtwoorden komen niet overeen." });
      return;
    }

    setPasswordSaving(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setPasswordSaving(false);

    if (error) {
      setPasswordStatus({ type: "error", message: error.message });
      return;
    }

    setPasswordStatus({ type: "success", message: "Wachtwoord gewijzigd." });
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return <p className="text-neutral-400">Account laden...</p>;
  }

  return (
    <>
      <h1 className="text-3xl font-bold">⚙️ Account</h1>

      <p className="mt-1 text-neutral-400">
        Beheer je accountgegevens, e-mailadres en wachtwoord.
      </p>

      <div className="mt-6 space-y-6">
        {/* Accountgegevens */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-lg font-semibold">Accountgegevens</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-neutral-500">Huidig e-mailadres</p>
              <p className="mt-1 text-neutral-200">{email}</p>
            </div>

            {createdAt && (
              <div>
                <p className="text-xs text-neutral-500">Account aangemaakt op</p>
                <p className="mt-1 text-neutral-200">
                  {new Date(createdAt).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Naam */}
        <form
          onSubmit={handleNameSave}
          className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
        >
          <h2 className="text-lg font-semibold">Naam</h2>

          <p className="mt-1 text-sm text-neutral-500">
            Deze naam wordt gebruikt in je welkomstbericht op het dashboard.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="mb-1 block text-xs text-neutral-500">Naam</label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              disabled={nameSaving}
              className="rounded-xl bg-[#d59a57] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {nameSaving ? "Opslaan..." : "Opslaan"}
            </button>
          </div>

          <StatusMessage status={nameStatus} />
        </form>

        {/* E-mailadres */}
        <form
          onSubmit={handleEmailSave}
          className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
        >
          <h2 className="text-lg font-semibold">E-mailadres wijzigen</h2>

          <p className="mt-1 text-sm text-neutral-500">
            Je ontvangt een bevestigingsmail voordat de wijziging ingaat.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="mb-1 block text-xs text-neutral-500">Nieuw e-mailadres</label>

              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nieuw@voorbeeld.nl"
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              disabled={emailSaving}
              className="rounded-xl bg-[#d59a57] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {emailSaving ? "Versturen..." : "Wijzigen"}
            </button>
          </div>

          <StatusMessage status={emailStatus} />
        </form>

        {/* Wachtwoord */}
        <form
          onSubmit={handlePasswordSave}
          className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
        >
          <h2 className="text-lg font-semibold">Wachtwoord wijzigen</h2>

          <p className="mt-1 text-sm text-neutral-500">Minimaal 8 tekens.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Nieuw wachtwoord</label>

              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">Bevestig nieuw wachtwoord</label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordSaving}
            className="mt-4 rounded-xl bg-[#d59a57] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {passwordSaving ? "Opslaan..." : "Wachtwoord wijzigen"}
          </button>

          <StatusMessage status={passwordStatus} />
        </form>

        {/* Uitloggen */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-lg font-semibold">Sessie</h2>

          <p className="mt-1 text-sm text-neutral-500">
            Log uit op dit apparaat.
          </p>

          <button
            onClick={handleLogout}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
          >
            Uitloggen
          </button>
        </div>
      </div>
    </>
  );
}
