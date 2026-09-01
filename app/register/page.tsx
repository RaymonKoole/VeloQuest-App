"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Account aangemaakt! Controleer je e-mail om je account te bevestigen."
    );

    setName("");
    setEmail("");
    setPassword("");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <Logo className="mb-4 h-10 w-10" />

        <h1 className="mb-2 text-3xl font-bold text-white">
          Maak een account
        </h1>

        <p className="mb-8 text-neutral-400">
          Word onderdeel van de VeloQuest community.
        </p>

        <form onSubmit={handleRegister} className="space-y-5">
          <input
            type="text"
            placeholder="Naam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white"
          />

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
            className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 transition"
          >
            Account aanmaken
          </button>
        </form>

        {message && (
          <p className="mt-6 text-sm text-center text-orange-400">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
