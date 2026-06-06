"use client";

import { useEffect, useState } from "react";
import { LearnLanguagesPopup } from "@/components/learn-languages-popup";

export function OrderConfirmationPopupGate({ orderId, paymentStatus }: { orderId?: string | null; paymentStatus?: string | null }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!orderId || paymentStatus === "awaiting_verification") return;
    const key = `learn_popup_shown_${orderId}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    setShow(true);
  }, [orderId, paymentStatus]);

  return show ? <LearnLanguagesPopup onClose={() => setShow(false)} /> : null;
}
