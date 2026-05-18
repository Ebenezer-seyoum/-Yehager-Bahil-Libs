"use client";

import { Globe, Scissors, Star } from "lucide-react";
import { useT } from "@/lib/i18n/I18nContext";

export function HomeWhyUs() {
  const { t } = useT();
  const features = [
    {
      icon: Scissors,
      title: t("home.whyUs.tailored.title"),
      desc: t("home.whyUs.tailored.desc"),
    },
    {
      icon: Globe,
      title: t("home.whyUs.shipping.title"),
      desc: t("home.whyUs.shipping.desc"),
    },
    {
      icon: Star,
      title: t("home.whyUs.guarantee.title"),
      desc: t("home.whyUs.guarantee.desc"),
    },
  ];

  return (
    <section className="border-t border-border py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="px-4">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-heading text-xl font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
