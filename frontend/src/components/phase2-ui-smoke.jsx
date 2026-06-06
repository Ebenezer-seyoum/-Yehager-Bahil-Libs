"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

export function Phase2UiSmoke() {
  return (
    <div className="flex flex-1 flex-col bg-cinema">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-20">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Phase 2 (minimal)</p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            UI Primitives Wired
          </h1>
          <p className="text-muted-foreground">Radix/shadcn dependencies installed, providers mounted, smoke test ready.</p>
        </div>

        <Card className="bg-card/90">
          <CardHeader>
            <CardTitle>Theme + Components</CardTitle>
            <CardDescription>Buttons, card tokens, and toast systems are now active.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                toast({
                  title: "Toast ready",
                  description: "Radix toast primitives are mounted in Providers.",
                })
              }
            >
              Show Toast
            </Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
          </CardContent>
          <CardFooter>
            <span className="text-sm text-muted-foreground">Next step: full page/component port from Base44 flows.</span>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
