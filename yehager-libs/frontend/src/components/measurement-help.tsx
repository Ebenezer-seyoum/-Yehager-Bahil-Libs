export function MeasurementHelp() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">Measurement help</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Need guidance before ordering? Watch the tailoring tutorial and review the core measurements before saving.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href="https://www.youtube.com/watch?v=wVZ8JAjMGEY"
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary"
        >
          Women&apos;s tutorial
        </a>
        <a
          href="https://www.youtube.com/watch?v=-KNbh12GalU"
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary"
        >
          Men&apos;s tutorial
        </a>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-secondary p-3">
          <p className="text-xs font-semibold">Before you start</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>Use a soft tailor&apos;s tape.</li>
            <li>Measure over fitted clothing.</li>
            <li>Keep the tape snug, not tight.</li>
          </ul>
        </div>
        <div className="rounded-lg bg-secondary p-3">
          <p className="text-xs font-semibold">Best practice</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>Ask someone to help if possible.</li>
            <li>Stand naturally while measuring.</li>
            <li>Double-check before saving.</li>
          </ul>
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        <li>Chest / bust: fullest part, tape level to the floor.</li>
        <li>Waist: natural waistline, measured while relaxed.</li>
        <li>Hips: fullest part of hips and seat.</li>
        <li>Shoulder width: outer shoulder to outer shoulder across the back.</li>
      </ul>
    </div>
  );
}
