import type { AuthUser } from "../lib/auth/token.js";

export type AppBindings = {
  Variables: {
    requestId: string;
    authUser?: AuthUser;
  };
};
