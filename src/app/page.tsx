"use client";

import { useEffect } from "react";
import { Eye, EyeOff, Info } from "lucide-react";
import { useViewerStore } from "@/lib/store";
import { SentryLogo } from "@/components/sentry-logo";
import { UploadZone } from "@/components/upload-zone";
import { ClipsManager } from "@/components/clips-manager";
import { MultiCamViewer } from "@/components/multi-cam-viewer";
import { LayoutSwitcher } from "@/components/layout-switcher";
import { Toggle } from "@/components/ui/toggle";

export default function HomePage() {
  const clips = useViewerStore((s) => s.clips);
  const showTelemetry = useViewerStore((s) => s.showTelemetry);
  const setShowTelemetry = useViewerStore((s) => s.setShowTelemetry);

  // Free Object URLs on unmount.
  useEffect(() => {
    return () => {
      useViewerStore.getState().clearAll();
    };
  }, []);

  const hasLabeled = clips.some((c) => c.angle !== null);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <SentryLogo className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">
                Tesla Sentry Viewer
              </h1>
              <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">
                Multi-cam dashcam blender · runs in your browser
              </p>
            </div>
          </div>
          <a
            href="https://github.com/teslamotors/dashcam"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground"
            aria-label="About Tesla dashcam telemetry"
            title="Tesla dashcam tools (reference)"
          >
            <Info className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
        {clips.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-8 sm:py-16">
            <div className="w-full max-w-xl">
              <UploadZone />
              <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                {[
                  ["1.", "Open Tesla app"],
                  ["2.", "Save clips"],
                  ["3.", "Upload here"],
                  ["4.", "Watch in sync"],
                ].map(([n, t]) => (
                  <div
                    key={n}
                    className="rounded-md border bg-card/50 p-2.5 backdrop-blur"
                  >
                    <div className="font-mono text-primary">{n}</div>
                    <div className="mt-0.5">{t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-3 min-w-0">
              {hasLabeled ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <LayoutSwitcher />
                    <Toggle
                      pressed={showTelemetry}
                      onPressedChange={setShowTelemetry}
                      size="sm"
                      variant="outline"
                      aria-label="Toggle telemetry overlay"
                    >
                      {showTelemetry ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      <span className="ml-1.5 hidden sm:inline">Telemetry</span>
                    </Toggle>
                  </div>
                  <MultiCamViewer />
                </>
              ) : (
                <div className="rounded-xl border bg-card/40 p-6 text-center">
                  <p className="text-sm">
                    Assign each clip to a camera angle to start viewing.
                  </p>
                </div>
              )}
            </div>

            <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <ClipsManager />
            </aside>
          </div>
        )}
      </main>

      <footer className="border-t py-4">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 text-center text-[11px] text-muted-foreground">
          All processing runs locally — clips never leave your device.
          Telemetry overlay requires Tesla app v4.55.6+ and firmware 2025.44.25+.
        </div>
      </footer>
    </div>
  );
}
