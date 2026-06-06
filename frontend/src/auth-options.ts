import type { NextAuthOptions } from "next-auth";
import { authConfig } from "./auth.config";

export const authOptions: NextAuthOptions = {
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
};
