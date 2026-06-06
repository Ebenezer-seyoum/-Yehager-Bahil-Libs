import type { Logger } from "pino";
import type { AuthUser } from "../lib/auth/token.js";

export type AppBindings = {
  Variables: {
    requestId: string;
    /** Request-scoped logger; includes `requestId` on every line */
    log: Logger;
    authUser?: AuthUser;
  };
};
