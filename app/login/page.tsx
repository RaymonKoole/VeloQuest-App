export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <h1 className="mb-2 text-3xl font-bold text-white">
          Welkom terug
        </h1>

        <p className="mb-8 text-neutral-400">
          Log in op jouw VeloQuest account.
        </p>

        <form className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-neutral-300">
              E-mailadres
            </label>

            <input
              type="email"
              placeholder="naam@email.nl"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-neutral-300">
              Wachtwoord
            </label>

            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600"
          >
            Inloggen
          </button>
        </form>
      </div>
    </main>
  );
}
