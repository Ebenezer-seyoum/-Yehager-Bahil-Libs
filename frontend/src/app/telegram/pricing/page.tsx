import { Suspense } from "react";
import { TelegramPricingPage } from "../pricing/[productId]/page";

export default function TelegramPricingEntryPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#0d1b2a]" />}><TelegramPricingPage /></Suspense>;
}
