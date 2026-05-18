# Migration Parity Matrix

## Goal

Reach full functional and user-experience parity between the legacy Base44 application and the new `yehager-libs` system before production cutover.

This migration should preserve the important behavior of the Base44 app while reimplementing it cleanly in the new architecture:

- legacy frontend: React Router app in top-level `src/`
- legacy backend/platform logic: `base44/entities` and `base44/functions`
- target frontend: `yehager-libs/frontend`
- target backend: `yehager-libs/backend`

The old system is the behavioral reference. The new system is the destination.

---

## Status legend

| Status | Meaning |
| --- | --- |
| Present | Implemented in `yehager-libs` and broadly aligned |
| Partial | Exists, but not yet at full parity |
| Missing | No complete target implementation yet |
| Verify | Present enough that behavior should be checked before deciding whether work is needed |

---

## 1. Shared frontend shell and cross-cutting UX

| Capability | Legacy source | Target source | Status | Remaining work |
| --- | --- | --- | --- | --- |
| Main layout shell | `src/components/Layout.jsx` | `frontend/src/components/site-shell.tsx` | Present | Final visual QA only |
| Navbar | `src/components/Navbar.jsx` | `frontend/src/components/site-navbar.tsx` | Present | Final visual QA only |
| Mobile menu | `src/components/MobileMenu.jsx` | `frontend/src/components/site-navbar.tsx` | Present | Final visual QA only |
| Footer | `src/components/Footer.jsx`, `src/components/PartnersMarquee.jsx` | `frontend/src/components/site-footer.tsx`, `frontend/src/components/partners-marquee.tsx` | Present | Final visual QA only |
| Authentication UX | `src/lib/AuthContext.jsx`, `src/components/ProtectedRoute.jsx` | NextAuth, `authenticated-gate.tsx`, `user-not-registered-error.tsx` | Partial | Confirm all auth edge cases match legacy behavior |
| Language switching / i18n | `src/components/LanguageSwitcher.jsx`, `src/lib/i18n/*` | `frontend/src/components/language-switcher.tsx`, `frontend/src/lib/i18n/*` | Partial | Switcher UI exists; translated surface coverage remains incomplete |
| PWA install banner | `src/components/PWAInstallBanner.jsx` | `frontend/src/components/pwa-install-banner.tsx` | Present | Verify install prompt on supported devices |
| Learn-language banners/popups | `src/components/LearnLanguagesBanner.jsx`, `LearnLanguagesPopup.jsx` | `learn-languages-banner.tsx` exists | Partial | Compare banner and popup behavior |
| Social sharing | `src/components/SocialShare.jsx` | `frontend/src/components/share-links.tsx` | Partial | Target has a simpler equivalent; dialog-level Base44 parity still needed |
| User-not-registered flow | `src/components/UserNotRegisteredError.jsx` | `frontend/src/components/user-not-registered-error.tsx` | Present | Verify copy and redirect behavior |

---

## 2. Home and catalog

| Capability | Legacy source | Target source | Status | Remaining work |
| --- | --- | --- | --- | --- |
| Home page | `src/pages/Home.jsx` | `frontend/src/app/page.tsx` | Present | Final visual QA only |
| Catalog page | `src/pages/ProductCatalog.jsx` | `frontend/src/app/catalog/page.tsx` | Present | Final visual QA only |
| Product card UI | `src/components/ProductCard.jsx` | `frontend/src/components/product-card.tsx` | Present | Final visual QA only |
| Exchange-rate display | `src/hooks/useExchangeRate.js` | exchange-rate API consumption in new frontend | Partial | Verify formatting and user-visible parity |
| Product translation | `src/hooks/useTranslatedProduct.jsx` | target unclear | Partial | Confirm translated catalog/detail experience |

---

## 3. Product detail

| Capability | Legacy source | Target source | Status | Remaining work |
| --- | --- | --- | --- | --- |
| Product detail route | `src/pages/ProductDetail.jsx` | `frontend/src/app/product/[id]/page.tsx` | Partial | Core composition is much closer; dialog-level parity and translation parity remain |
| Multi-image gallery | legacy detail page | target detail page | Partial | Add active-image switching parity |
| Image zoom | `src/components/ImageZoom.jsx` | target unclear | Missing | Port |
| Image magnifier | `src/components/ImageMagnifier.jsx` | target unclear | Missing | Port |
| Family-role pricing selector | `ProductDetail.jsx` | target detail page | Missing | Add role selector and role-specific add-to-cart behavior |
| Inline measurement create/update | `ProductDetail.jsx`, `MeasurementForm.jsx` | target detail page only selects existing measurement | Missing | Port or redesign equivalent flow |
| Event banner on product page | `EventBanner.jsx` | `frontend/src/app/product/[id]/page.tsx` | Partial | Event context is visible; exact Base44 treatment still needed |
| Event participant status update when adding to cart | `ProductDetail.jsx` | backend/cart/event flow | Verify | Ensure matching behavior exists |
| Share product | `SocialShare.jsx` | `frontend/src/components/share-links.tsx` | Partial | Replace simpler share links with Base44-style interaction if exact parity is required |
| Create event from product | `ProductDetail.jsx` | target unclear | Missing | Add target UX and backend action if retained |

---

## 4. Cart

| Capability | Legacy source | Target source | Status | Remaining work |
| --- | --- | --- | --- | --- |
| Cart route | `src/pages/Cart.jsx` | `frontend/src/app/cart/page.tsx` | Partial | Compare overall UI and edge states |
| Item card UX | `src/components/CartItemCard.jsx` | target unclear | Partial | Compare measurement snapshot, event labels, quantity edits, removal |
| Family-group generated cart items | family-group flow | backend/cart flow exists | Verify | Ensure labeling and downstream checkout parity |

---

## 5. Checkout and payments

| Capability | Legacy source | Target source | Status | Remaining work |
| --- | --- | --- | --- | --- |
| Checkout route | `src/pages/Checkout.jsx` | `frontend/src/app/checkout/page.tsx` | Partial | Full UX parity still needed |
| Mail vs pickup choice | `Checkout.jsx` | target checkout | Partial | Port richer UX |
| Shipping address validation | `Checkout.jsx` | target checkout | Partial | Restore field-level validation and feedback |
| Event-owner shipping choice | `Checkout.jsx` | target checkout | Missing | Add UI and backend support if absent |
| Pickup locations | `Checkout.jsx` | target checkout | Missing | Add |
| Pickup person details | `Checkout.jsx` | target checkout | Missing | Add |
| Currency selector | `components/checkout/CurrencySelector.jsx` | target unclear | Missing | Port if currency parity is required |
| Stripe flow | `base44/functions/createCheckoutSession` | `orders/checkout-intent` + `payments/stripe/checkout-session` | Partial | Compare old/new payload and post-payment behavior |
| ETB bank-transfer UX | `components/checkout/EtbPayment.jsx` | target checkout only has simplified option | Missing | Port full proof-upload workflow |
| Payment proof upload | Base44 file upload integration | backend upload route exists | Partial | Wire full ETB UI into new backend |
| Cart clearing after ETB completion | `EtbPayment.jsx` | target backend unclear | Verify | Ensure parity |
| Payment-generated audit/alerts | legacy webhook/functions | target backend partially present | Partial | Verify all side effects |
| Customer/admin payment emails | legacy webhook | no notification provider exists in target backend yet | Missing | Add provider-backed notification infrastructure before claiming parity |

---

## 6. Orders and tailoring

| Capability | Legacy source | Target source | Status | Remaining work |
| --- | --- | --- | --- | --- |
| My Orders route | `src/pages/MyOrders.jsx` | `frontend/src/app/my-orders/page.tsx` | Partial | New page is less rich |
| Orders/events tabs | `MyOrders.jsx` | target page | Present | Visual parity pass |
| Progress bars | `MyOrders.jsx` | target page | Missing | Port |
| Pickup-specific details | `MyOrders.jsx` | target page | Partial | Restore full detail |
| Carrier tracking links | `MyOrders.jsx` | target page | Missing/Partial | Restore |
| Shipping-document links | `MyOrders.jsx` | target page | Missing/Partial | Restore |
| Tailoring status route | `src/pages/TailoringStatus.jsx` | `frontend/src/app/tailoring-status/page.tsx` | Missing | Current target is placeholder only |
| Tailoring timeline UI | `TailoringStatus.jsx` | target route | Missing | Port full screen |

---

## 7. Account and measurements

| Capability | Legacy source | Target source | Status | Remaining work |
| --- | --- | --- | --- | --- |
| My Account route | `src/pages/MyAccount.jsx` | `frontend/src/app/my-account/page.jsx` | Partial | Compare richer UX and validation |
| Measurement CRUD | legacy account/product flows | new account page + backend | Present | Verify all fields |
| Measurement form reuse | `MeasurementForm.jsx` | target unclear | Partial | Decide reusable target equivalent |
| Measurement guide | `MeasurementGuide.jsx` | target unclear | Missing | Port |
| Measurement video | `MeasurementVideo.jsx` | target unclear | Missing | Port |
| Unit conversion support | `useUnit`, unit helpers | target unclear | Verify | Port if user-visible in legacy |

---

## 8. Events and family groups

| Capability | Legacy source | Target source | Status | Remaining work |
| --- | --- | --- | --- | --- |
| Events route | `src/pages/Events.jsx` | `frontend/src/app/events/page.tsx` | Partial | Compare UX details |
| Join flow | `src/pages/EventJoin.jsx` | `frontend/src/app/join/[id]/page.tsx` | Verify | Confirm full parity |
| Event dashboard | `src/pages/EventDashboard.jsx` | `frontend/src/app/event/[id]/page.tsx` | Partial | Target is materially simpler |
| QR code sharing | `EventDashboard.jsx` | target dashboard | Missing | Port |
| Social-share UI | `SocialShare.jsx` | target dashboard | Missing | Port |
| Organizer-specific tracker | `EventDashboard.jsx` | target dashboard | Partial | Restore richer organizer UX |
| Family-group visibility within event dashboard | `EventDashboard.jsx` | target dashboard | Missing | Port |
| Realtime participant updates | Base44 entity subscriptions | target unclear | Missing | Replace with polling, refresh, or realtime service |
| Create family group | `CreateFamilyGroup.jsx` | `frontend/src/app/create-family-group/page.jsx` | Present | Compare UX |
| Family group route | `src/pages/FamilyGroup.jsx` | `frontend/src/app/family-group/[groupId]/page.jsx` | Partial | Core exists; visual/interaction parity incomplete |
| Add member modal | `AddFamilyMemberModal.jsx` | inline forms in target | Partial | Decide exact parity vs equivalent UX |
| Add all to cart | legacy family-group flow | target family-group flow | Present | Verify end-to-end behavior |

---

## 9. Admin area

| Capability | Legacy source | Target source | Status | Remaining work |
| --- | --- | --- | --- | --- |
| Admin dashboard shell | `src/pages/AdminDashboard.jsx` | `frontend/src/app/admin/page.jsx` | Partial | Target is much smaller |
| Metrics overview | `components/admin/MetricsOverview.jsx` | `frontend/src/app/admin/page.jsx` | Present | Refine visual parity if needed |
| Workflow pipeline | `WorkflowPipeline.jsx` | `frontend/src/components/admin-workflow-pipeline.tsx` | Present | Refine visual parity if needed |
| Revenue chart | `RevenueChart.jsx` | `frontend/src/components/admin-revenue-charts.tsx` | Present | Refine visual parity if needed |
| Order management | `OrderManagement.jsx` | `frontend/src/components/admin-orders-table.tsx` + order detail pages | Present | Further visual polish optional |
| Inventory management | `InventoryManagement.jsx` | `frontend/src/app/admin/inventory/page.jsx` | Present | Product image management still separate |
| Documents management | `DocumentsManagement.jsx` | `frontend/src/app/admin/orders/[id]/page.jsx` | Partial | Pickup/shipping document workflow exists per order; dedicated overview page still absent |
| Alerts management | `AlertsPanel.jsx` | `frontend/src/components/admin-alerts-panel.tsx` | Present | Further visual polish optional |
| Audit logs | `AuditLogPanel.jsx` | `frontend/src/components/admin-audit-table.tsx` | Present | Further visual polish optional |
| Exchange-rate controls | `ExchangeRatePanel.jsx` | `frontend/src/components/admin-exchange-rate-panel.tsx` | Present | Scheduled refresh automation remains deployment concern |
| Product activate/deactivate | legacy inventory panel | admin products API + inventory page | Present | Verify workflow against real data |
| Product featured toggle | legacy inventory panel | admin products API + inventory page | Present | Verify workflow against real data |
| Product price updates | legacy inventory panel | admin products API + inventory page | Present | Verify workflow against real data |
| Pickup/shipping document operations | `DocumentsManagement.jsx` | admin order document APIs + order detail UI | Present | Dedicated cross-order document console still optional |

---

## 10. Backend and integration parity

| Legacy capability | Current target | Status | Remaining work |
| --- | --- | --- | --- |
| Product schema | `base44/entities/Product.jsonc` | `backend/src/lib/db/schema.ts` | Present | Verify all fields are exposed where needed |
| Orders schema | `base44/entities/Order.jsonc` | `backend/src/lib/db/schema.ts` | Present | Verify all legacy-used columns exist and are wired |
| Stripe checkout | `base44/functions/createCheckoutSession` | backend order/payment services | Partial | Compare all old fields and branches |
| Stripe webhook | `base44/functions/stripeWebhook` | `backend/src/services/payments-service.ts` | Partial | Verify cart clearing, event updates, emails |
| Exchange-rate refresh | `base44/functions/refreshExchangeRate` | exchange-rate service/route | Verify | Compare behavior |
| System-alert checks | `base44/functions/checkSystemAlerts` | target unclear | Verify | Decide replacement |
| Product image updates | `base44/functions/updateProductImages` | target unclear | Verify | Decide replacement |
| Base44 export sync | legacy data | `backend/src/scripts/sync-base44.ts` | Present | Keep until cutover complete |

---

## 11. Known backend gaps for full parity

### Admin/product APIs

- possibly product-image management

### Admin/order/document APIs

- dedicated cross-order documents console if exact legacy UX is still required

### Checkout/payment APIs

- ETB payment-proof submission flow
- complete ETB order finalization path
- parity for pickup/event-owner shipping fields
- post-payment cart clearing
- participant-status updates
- customer/admin notifications

### Event APIs / UX support

- richer event dashboard aggregate payloads
- family-group summaries on event dashboards
- organizer-specific participant tracking
- replacement for Base44 realtime subscriptions

---

## 12. Recommended execution order

### Batch 1 — Revenue-critical customer flow

1. Complete checkout/payment backend contracts
2. Port full checkout UI
3. Port full ETB payment UI
4. Bring `My Orders` closer to parity
5. Replace `Tailoring Status` placeholder

### Batch 2 — Product detail and measurement parity

1. Rich product gallery
2. Zoom/magnifier
3. Family-role pricing
4. Inline measurement editing
5. Measurement guide/video

### Batch 3 — Event and family parity

1. Rich event dashboard
2. QR/social sharing
3. organizer tracker
4. family-group summary views
5. realtime replacement decision and implementation

### Batch 4 — Admin operations parity

1. Product admin APIs
2. Document admin APIs
3. Full admin dashboard UI
4. inventory/documents/order workflow parity

### Batch 5 — Shared polish and cutover readiness

1. Navigation/footer/i18n/PWA parity
2. static-page parity
3. side-by-side QA
4. smoke tests
5. remove remaining Base44 runtime dependencies

---

## 13. Definition of done

The migration is complete only when:

1. Every legacy route has an equivalent target route or an intentionally documented replacement.
2. Every critical legacy action has an equivalent backend-supported target action.
3. No target route remains a placeholder.
4. Customer checkout works for both Stripe USD and ETB transfer flows.
5. Admin operations can be performed fully from `yehager-libs`.
6. Event and family-group workflows work end to end.
7. Tailoring/order visibility matches legacy capability.
8. Base44 runtime dependencies are no longer required for normal production use.
9. Data-sync parity and smoke-test checks pass.
10. Cutover checklist is signed off.
