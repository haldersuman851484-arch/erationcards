import type { GuideStep } from "./useGuideSchema";

/**
 * Numbered step cards shared by the /guides/* pages — same markup the first
 * three guides used inline, extracted so every new guide renders steps
 * identically (and stays crawler-visible: a plain <ol>, no JS).
 */
export default function GuideSteps({ heading, steps }: { heading: string; steps: GuideStep[] }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-slate-900 mb-4">{heading}</h2>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-4 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">{s.name}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{s.text}</p>
              <p lang="bn" className="text-sm text-slate-600 leading-relaxed mt-1.5">
                {s.bn}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
