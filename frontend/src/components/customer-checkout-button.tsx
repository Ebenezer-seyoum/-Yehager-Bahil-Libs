"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CustomerCheckoutButton({ profileComplete }: { profileComplete: boolean }) {
  const router = useRouter();

  function proceedToCheckout() {
    if (!profileComplete) {
      toast("Please complete your account details before checkout.", {
        description: "Add your full name, phone / WhatsApp, and residential address.",
        duration: 3600,
        className: "!border-red-950 !bg-[#4a0505] !text-red-50",
        descriptionClassName: "!text-red-100",
      });
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
