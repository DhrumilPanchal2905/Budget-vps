import type { ReactNode } from "react";
import { AppState, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SWRConfig } from "swr";
import { fetcher } from "@/lib/api";
import { ThemeProvider, ToastProvider } from "@/ui";
import { AuthProvider } from "./session";

// SWR: refetch when the app comes back to the foreground (native) / tab gets focus (web).
const nativeFocus =
  Platform.OS === "web"
    ? {}
    : {
        isVisible: () => AppState.currentState === "active",
        initFocus(callback: () => void) {
          let state = AppState.currentState;
          const sub = AppState.addEventListener("change", (next) => {
            if (state.match(/inactive|background/) && next === "active") callback();
            state = next;
          });
          return () => sub.remove();
        },
      };

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <SWRConfig
        value={{
          fetcher,
          revalidateOnFocus: true,
          dedupingInterval: 1500,
          keepPreviousData: true,
          shouldRetryOnError: (err: Error) => {
            const status = (err as Error & { status?: number })?.status;
            return !status || status >= 500;
          },
          errorRetryCount: 2,
          ...nativeFocus,
        }}
      >
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </SWRConfig>
    </SafeAreaProvider>
  );
}
