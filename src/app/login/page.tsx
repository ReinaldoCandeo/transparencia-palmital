import { PortalLayout } from "@/components/portal/PortalLayout";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <PortalLayout>
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
          Acesso Restrito
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é restrita a administradores do sistema. No momento, o painel de 
          administração está em construção (Fase 2) e o acesso público foi bloqueado.
        </p>
      </div>
    </PortalLayout>
  );
}
