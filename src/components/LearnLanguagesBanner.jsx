import { LEARN_LANGUAGES_URL } from "@/lib/taxonomy";
import { useT } from "@/lib/i18n/I18nContext";

export default function LearnLanguagesBanner({ className = "" }) {
  const { t } = useT();
  return (
    <a
      href={LEARN_LANGUAGES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block w-full overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 hover:from-orange-600 hover:via-amber-500 hover:to-yellow-500 transition-all shadow-lg shadow-amber-900/20 ${className}`}
    >
      <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4">
        {/* ET badge circle */}
        <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-black font-heading font-bold text-sm sm:text-base">
          ET
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold text-black text-sm sm:text-base leading-tight">
            {t("banner.learnTitle")}
          </p>
          <p className="text-black/75 text-[11px] sm:text-xs leading-tight mt-0.5 truncate">
            {t("banner.learnSub")}
          </p>
        </div>

        {/* CTA pill */}
        <div className="flex-shrink-0 bg-black text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full whitespace-nowrap group-hover:bg-neutral-800 transition-colors">
          {t("btn.startLearning")} <span className="inline-block group-hover:translate-x-0.5 transition-transform">→</span>
        </div>
      </div>
    </a>
  );
}