"use client";

import type { AdminWorkspaceData } from "../types";

export async function fetchAdminWorkspaceData(keys: Array<keyof AdminWorkspaceData>): Promise<AdminWorkspaceData> {
  const data: AdminWorkspaceData = {};
  const tasks: Promise<void>[] = [];

  if (keys.includes("orders")) {
    tasks.push(
      fetch("/api/backend/orders?limit=200")
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((payload) => {
          data.orders = Array.isArray(payload?.data) ? payload.data : [];
        })
        .catch(() => {
          data.orders = [];
        }),
    );
  }

  if (keys.includes("products")) {
    tasks.push(
      fetch("/api/backend/admin/products?limit=200")
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((payload) => {
          data.products = Array.isArray(payload?.data) ? payload.data : [];
        })
        .catch(() => {
          data.products = [];
        }),
    );
  }

  if (keys.includes("users")) {
    tasks.push(
      fetch("/api/v1/admin/users?limit=200")
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((payload) => {
          data.users = Array.isArray(payload?.data) ? payload.data : [];
        })
        .catch(() => {
          data.users = [];
        }),
    );
  }

  if (keys.includes("alerts")) {
    tasks.push(
      fetch("/api/v1/admin/alerts?limit=200")
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((payload) => {
          data.alerts = Array.isArray(payload?.data) ? payload.data : [];
        })
        .catch(() => {
          data.alerts = [];
        }),
    );
  }

  if (keys.includes("audit")) {
    tasks.push(
      fetch("/api/v1/admin/audit?limit=200")
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((payload) => {
          data.audit = Array.isArray(payload?.data) ? payload.data : [];
        })
        .catch(() => {
          data.audit = [];
        }),
    );
  }

  if (keys.includes("roles")) {
    tasks.push(
      fetch("/api/backend/admin/roles")
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((payload) => {
          data.roles = Array.isArray(payload?.data) ? payload.data : [];
        })
        .catch(() => {
          data.roles = [];
        }),
    );
  }

  await Promise.all(tasks);
  return data;
}
