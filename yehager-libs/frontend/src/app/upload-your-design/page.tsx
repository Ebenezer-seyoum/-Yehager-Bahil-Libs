import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { UploadDesignWizard } from "@/components/upload-design-wizard";

export default async function UploadYourDesignPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/upload-your-design");
  }

  return <UploadDesignWizard />;
}
