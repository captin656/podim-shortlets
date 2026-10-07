import { Zap, Wifi, ShieldCheck, KeyRound, Droplets, BadgeCheck } from "lucide-react";

// A bento grid: tiles are deliberately different sizes so the hierarchy reads at a glance.
export function WhyPodium() {
  return (
    <section id="why" aria-labelledby="why-title" className="section bg-mist">
      <div className="container-x">
        <h2 id="why-title" className="max-w-4xl text-display-lg">
          The basics, done properly.
        </h2>
        <p className="mt-4 max-w-[46ch] text-lead text-ink-mute">In Enugu, a good stay comes down to a few things working every single day.</p>

        <div className="mt-12 grid gap-4 sm:mt-16 sm:gap-6 md:grid-cols-6">
          <div className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-4xl bg-ink p-8 text-white md:col-span-4 md:min-h-[420px] md:p-12">
            <Zap size={34} strokeWidth={1.4} className="text-accent" aria-hidden />
            <div>
              <p className="text-display-md">Power that doesn’t blink.</p>
              <p className="mt-4 max-w-[40ch] text-lead text-white/70">Generator and inverter backup switch over on their own. Work, cook and charge without checking the time.</p>
            </div>
          </div>

          <div className="flex min-h-[280px] flex-col justify-between rounded-4xl bg-white p-8 md:col-span-2 md:min-h-[420px]">
            <Wifi size={30} strokeWidth={1.4} aria-hidden />
            <div>
              <p className="text-title">Wi-Fi for video calls</p>
              <p className="mt-2 text-ink-mute">Fast fibre-grade internet in every unit, with a backup line.</p>
            </div>
          </div>

          <div className="flex min-h-[240px] flex-col justify-between rounded-4xl bg-white p-8 md:col-span-2">
            <ShieldCheck size={28} strokeWidth={1.4} aria-hidden />
            <div>
              <p className="text-title">Secure by design</p>
              <p className="mt-2 text-ink-mute">Gated compound, CCTV and 24-hour security.</p>
            </div>
          </div>

          <div className="flex min-h-[240px] flex-col justify-between rounded-4xl bg-white p-8 md:col-span-2">
            <Droplets size={28} strokeWidth={1.4} aria-hidden />
            <div>
              <p className="text-title">Running water</p>
              <p className="mt-2 text-ink-mute">Treated borehole supply with a storage tank behind it.</p>
            </div>
          </div>

          <div className="flex min-h-[240px] flex-col justify-between rounded-4xl bg-accent p-8 text-white md:col-span-2">
            <BadgeCheck size={28} strokeWidth={1.4} aria-hidden />
            <div>
              <p className="text-title">Caution fee comes back</p>
              <p className="mt-2 text-white/85">It’s always shown separately and refunded after checkout.</p>
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-4xl bg-white p-8 md:col-span-6 md:flex-row md:items-center md:justify-between md:p-10">
            <div className="flex items-start gap-5">
              <KeyRound size={30} strokeWidth={1.4} className="mt-1 shrink-0" aria-hidden />
              <div>
                <p className="text-title">Book in a minute, get your code by message</p>
                <p className="mt-2 max-w-[60ch] text-ink-mute">Pay online by card, bank transfer or USSD. Your gate code and Wi-Fi details arrive by email and SMS the moment payment clears.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
