import { cn } from '@/lib/utils';

const STEPS = [
  { n: 1, title: 'Define scope', body: 'Layout, structural, plumbing, or electrical changes?' },
  { n: 2, title: 'Confirm jurisdiction', body: 'Ada vs Canyon County (see map below)' },
  { n: 3, title: 'Design & plans', body: 'Stamped sheets when required' },
  { n: 4, title: 'Submit application', body: 'County portal + fees' },
  { n: 5, title: 'Plan review', body: '2–8+ weeks typical for layout work' },
  { n: 6, title: 'Approved → build', body: 'Rough inspections before cover-up' },
  { n: 7, title: 'Final inspection', body: 'Close permit before finish concealment' },
];

function FlowStep({
  n,
  title,
  body,
  className,
}: {
  n: number;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={cn('h-full border border-border bg-card p-5', className)}>
      <span className="ed-step-n" aria-hidden="true">{String(n).padStart(2, '0')}</span>
      <p className="ed-h4 mt-3">{title}</p>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{body}</p>
    </div>
  );
}

function CountyColumn({
  title,
  subtitle,
  cities,
  accentClass,
}: {
  title: string;
  subtitle: string;
  cities: string[];
  accentClass: string;
}) {
  return (
    <div className={cn('border p-5 md:p-6', accentClass)}>
      <h3 className="ed-h4">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-foreground">
        {cities.map((c) => (
          <li key={c} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PermitFlowGraphic() {
  return (
    <div className="space-y-10" data-testid="permit-flow-graphic">
      <div>
        <h2 className="text-sm font-normal uppercase tracking-wider text-muted-foreground mb-4">
          Typical permit path
        </h2>
        <div className="ed-cards-3 lx-permit-steps gap-3">
          {STEPS.map((step) => (
            <div key={step.n}>
              <FlowStep {...step} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-normal uppercase tracking-wider text-muted-foreground mb-4">
          Which county?
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <CountyColumn
            title="Ada County"
            subtitle="Most Boise metro remodels"
            cities={['Boise', 'Meridian', 'Eagle', 'Kuna', 'Star']}
            accentClass="border-accent/40 bg-accent/5"
          />
          <CountyColumn
            title="Canyon County"
            subtitle="Western Treasure Valley"
            cities={['Nampa', 'Middleton', 'Caldwell']}
            accentClass="border-border bg-muted/30"
          />
        </div>
      </div>

      <div className="border border-border p-5 md:p-6 bg-muted/20">
        <h2 className="text-sm font-normal text-foreground mb-3">Usually needs permits</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-muted-foreground">
          <span>Wall removal / beams</span>
          <span>Plumbing relocations</span>
          <span>Panel or circuit additions</span>
          <span>Additions & ADUs</span>
        </div>
        <h2 className="text-sm font-normal text-foreground mt-5 mb-3">Often minimal review</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-muted-foreground">
          <span>Like-for-like fixture swap</span>
          <span>Cabinet refacing (no MEP)</span>
          <span>Paint & cosmetic finishes</span>
          <span>Same-location replacements</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <h2 className="text-sm font-normal uppercase tracking-wider text-muted-foreground mb-4">
          Timeline comparison (layout changes)
        </h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 font-normal text-foreground">Phase</th>
              <th className="text-left py-2 pr-4 font-normal text-foreground">Ada County</th>
              <th className="text-left py-2 font-normal text-foreground">Canyon County</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border/60">
              <td className="py-2 pr-4">Plan preparation</td>
              <td className="py-2 pr-4">2–6 weeks</td>
              <td className="py-2">2–6 weeks</td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2 pr-4">County review</td>
              <td className="py-2 pr-4">2–8+ weeks</td>
              <td className="py-2">2–8+ weeks</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">Inspections</td>
              <td className="py-2 pr-4">During construction</td>
              <td className="py-2">During construction</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
