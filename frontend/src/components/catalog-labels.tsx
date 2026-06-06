"use client";

import { ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/I18nContext";

export function CatalogLabels({
  activeRegion,
  activeSub,
  productCount,
}: {
  activeRegion: string | null;
  activeSub: string | null;
  productCount: number;
}) {
  const { t } = useT();

  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{t("catalog.collection")}</span>
        {activeRegion ? (
          <>
            <ChevronRight className="h-3 w-3" />
            <span>{activeRegion}</span>
          </>
        ) : null}
        {activeSub ? (
          <>
            <ChevronRight className="h-3 w-3" />
            <span>{activeSub}</span>
          </>
        ) : null}
      </div>
      <h1 className="font-heading text-4xl font-bold">{activeSub || activeRegion || t("catalog.allCollections")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {productCount} {t("catalog.pieces")}
      </p>
    </div>
  );
}
