"use client";

import { LEARN_LANGUAGES_URL } from "@/lib/taxonomy";
import { useT } from "@/lib/i18n/I18nContext";

export function LearnLanguagesBanner({ className = "" }: { className?: string }) {
  const { t } = useT();

  return (
    <a
      href={LEARN_LANGUAGES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block w-full overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 shadow-lg shadow-amber-900/20 transition-all hover:from-orange-600 hover:via-amber-500 hover:to-yellow-500 ${className}`}
    >
      <div className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/30 text-sm font-bold text-black backdrop-blur-sm sm:h-11 sm:w-11 sm:text-base">
          ET
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-bold leading-tight text-black sm:text-base">{t("banner.learnTitle")}</p>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-black/75 sm:text-xs">{t("banner.learnSub")}</p>
        </div>
        <div className="flex-shrink-0 whitespace-nowrap rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-neutral-800 sm:px-4 sm:py-2 sm:text-sm">
          {t("btn.startLearning")} <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
        </div>
      </div>
    </a>
  );
}
