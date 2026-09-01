"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

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

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <Logo className="mb-4 h-10 w-10" />

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

        {message && (
          <p className="mt-6 text-center text-orange-400">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}