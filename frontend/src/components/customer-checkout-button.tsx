"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { customerToast } from "@/lib/customer-toast";

export function CustomerCheckoutButton({ profileComplete }: { profileComplete: boolean }) {
  const router = useRouter();

  function proceedToCheckout() {
    if (!profileComplete) {
      customerToast(
        "Please complete your account details before checkout.",
        "Add your full name, phone / WhatsApp, and residential address.",
      );
      window.setTimeout(() => {
        router.push("/my-account?completeProfile=1&checkout=profile_required");
      }, 1800);
      return;
    }

    router.push("/checkout");
  }

  return (
    <button
      type="button"
      onClick={proceedToCheckout}
      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-lg font-semibold text-black hover:bg-primary/90"
    >
      Proceed to Checkout <ArrowRight className="h-5 w-5" />
    </button>
  );
}
