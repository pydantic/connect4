import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web'
import * as logfire from '@pydantic/logfire-browser'
import { Component, JSX, onMount } from 'solid-js'

interface ClientInstrumentationProviderProps {
  children: JSX.Element
}

export const ClientInstrumentationProvider: Component<ClientInstrumentationProviderProps> = ({
  children,
}: ClientInstrumentationProviderProps) => {
  onMount(() => {
    // use our FastAPI proxy to send traces to Logfire
    const url = new URL('/api/client-traces', window.location.href)
    logfire.configure({
      traceUrl: url.toString(),
      serviceName: 'frontend',
      environment: import.meta.env.MODE === 'development' ? 'dev' : 'prod',
      serviceVersion: '0.1.0',
      // for development purposes, we want to see traces as soon as they happen, so maxExportBatchSize is set to 1.
      // in production, we want to batch traces and send them in batches
      batchSpanProcessorConfig: {
        maxExportBatchSize: 1,
      },
      instrumentations: [
        getWebAutoInstrumentations({
          '@opentelemetry/instrumentation-fetch': {
            propagateTraceHeaderCorsUrls: /.*/,
          },
          // disable user interaction instrumentation, clicks are not relevant for us
          '@opentelemetry/instrumentation-user-interaction': {
            enabled: true,
          },
          // useful in general, disabling it for the demo purposes
          '@opentelemetry/instrumentation-document-load': {
            enabled: false,
          },
        }),
      ],
      diagLogLevel: logfire.DiagLogLevel.ALL,
    })
  })

  return children
}
