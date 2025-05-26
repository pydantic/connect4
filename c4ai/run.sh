#!/bin/bash

if [ -z "${LOGFIRE_TOKEN}" ]; then
    echo "Error: LOGFIRE_TOKEN not set" >&2
else
    echo "LOGFIRE_TOKEN set, enabling OpenTelemetry tracing" >&2
    export OTEL_EXPORTER_OTLP_ENDPOINT=https://logfire-api.pydantic.dev
    export OTEL_SERVICE_NAME=c4ai
    export OTEL_DENO=true
    export OTEL_EXPORTER_OTLP_HEADERS="Authorization=${LOGFIRE_TOKEN}"
    if [ -z "${RENDER}" ]; then
        # render env var not set
        export OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=dev
    else
        export OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=prod
    fi
fi

deno task run
