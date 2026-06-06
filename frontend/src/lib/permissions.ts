export function can(permissions: string[] | null | undefined, permission: string) {
  return Boolean(permissions?.includes(permission));
}

export function canAny(permissions: string[] | null | undefined, required: string[]) {
  return required.some((permission) => permissions?.includes(permission));
}
