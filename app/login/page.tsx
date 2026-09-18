"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetSending, setResetSending] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/dashboard");
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();

    setResetMessage("");

    if (!resetEmail) {
      setResetMessage("Vul je e-mailadres in.");
      return;
    }

    setResetSending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/account`,
    });

    setResetSending(false);

    // Altijd dezelfde melding tonen, ongeacht of het e-mailadres bestaat —
    // anders zou deze pagina te gebruiken zijn om te achterhalen welke
    // e-mailadressen een account hebben.
    setResetMessage(
      error
        ? error.message
        : "Als dit e-mailadres bekend is, is er een resetlink naartoe gestuurd."
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <img src="/logo.png" alt="VeloQuest" className="mb-4 h-12 w-auto" />

        {mode === "login" ? (
          <>
            <h1 className="mb-2 text-3xl font-bold text-white">
              Welkom terug
            </h1>

            <p className="mb-8 text-neutral-400">
              Log in op jouw VeloQuest-account.
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              <input
                type="email"
                placeholder="E-mailadres"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white"
              />

              <input
                type="password"
                placeholder="Wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-[#d59a57] py-3 font-semibold text-white hover:opacity-90 transition"
              >
                Inloggen
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setResetEmail(email);
                setResetMessage("");
              }}
              className="mt-4 text-sm text-neutral-400 hover:text-neutral-200"
            >
              Wachtwoord vergeten?
            </button>

            {message && (
              <p className="mt-6 text-center text-orange-400">
                {message}
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className="mb-2 text-3xl font-bold text-white">
              Wachtwoord vergeten
            </h1>

            <p className="mb-8 text-neutral-400">
              Vul je e-mailadres in en we sturen je een link om een nieuw wachtwoord in te stellen.
            </p>

            <form onSubmit={handleResetRequest} className="space-y-5">
              <input
                type="email"
                placeholder="E-mailadres"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white"
              />

              <button
                type="submit"
                disabled={resetSending}
                className="w-full rounded-xl bg-[#d59a57] py-3 font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
              >
                {resetSending ? "Versturen..." : "Verstuur resetlink"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode("login");
                setResetMessage("");
              }}
              className="mt-4 text-sm text-neutral-400 hover:text-neutral-200"
            >
              ← Terug naar inloggen
            </button>

            {resetMessage && (
              <p className="mt-6 text-center text-orange-400">
                {resetMessage}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
