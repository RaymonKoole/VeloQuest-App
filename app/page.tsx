import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <h1 className="text-5xl font-bold mb-6">VeloQuest</h1>

        <p className="text-neutral-400 text-lg mb-10">
          Ontdek. Fiets. Verzamel.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-xl bg-[#d59a57] px-6 py-3 font-semibold hover:opacity-90 transition"
          >
            Inloggen
          </Link>

          <Link
            href="/register"
            className="rounded-xl border border-neutral-700 px-6 py-3 hover:bg-neutral-900 transition"
          >
            Account maken
          </Link>
        </div>
      </div>
    </main>
  );
}