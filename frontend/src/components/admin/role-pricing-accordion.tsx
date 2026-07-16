"use client";

import type { ReactNode } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

export type RolePricingAccordionGroup = {
  value: string;
  label: string;
  description?: string;
  content: ReactNode;
};

export function RolePricingAccordion({
  groups,
  defaultValue = "woman",
}: {
  groups: RolePricingAccordionGroup[];
  defaultValue?: string;
}) {
  return (
    <AccordionPrimitive.Root type="single" collapsible defaultValue={defaultValue} className="space-y-3">
      {groups.map((group) => (
        <AccordionPrimitive.Item
          key={group.value}
          value={group.value}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between gap-4 bg-slate-50/70 px-5 py-4 text-left transition-colors hover:bg-white [&[data-state=open]>svg]:rotate-180">
              <span>
                <span className="block text-sm font-black uppercase tracking-widest text-slate-900">
                  {group.label}
                </span>
                {group.description ? (
                  <span className="mt-1 block text-xs font-semibold normal-case tracking-normal text-slate-500">
                    {group.description}
                  </span>
                ) : null}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden border-t border-slate-200 text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="px-4 pb-4 pt-4 sm:px-5">{group.content}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
