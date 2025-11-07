import type { AppProps } from "next/app";
import { useEffect } from "react";
import { datadogRum } from "@datadog/browser-rum";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize Datadog RUM (L5 Analytics Tool)
    const ddAppId = process.env.NEXT_PUBLIC_DD_APP_ID;
    const ddClientToken = process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN;
    const env = process.env.NEXT_PUBLIC_ENV || "development";
    const version = process.env.NEXT_PUBLIC_COMMIT_SHA || "unknown";

    if (ddAppId && ddClientToken) {
      datadogRum.init({
        applicationId: ddAppId,
        clientToken: ddClientToken,
        site: "datadoghq.com",
        service: "prompt-defenders",
        env,
        version,
        sessionSampleRate: 100,
        sessionReplaySampleRate: 20,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: "mask-user-input",
      });

      datadogRum.startSessionReplayRecording();

      console.log("✅ Datadog RUM initialized (L5 Analytics)");
    } else {
      console.warn(
        "⚠️  Datadog RUM not initialized. Set NEXT_PUBLIC_DD_APP_ID and NEXT_PUBLIC_DD_CLIENT_TOKEN."
      );
    }
  }, []);

  return <Component {...pageProps} />;
}
