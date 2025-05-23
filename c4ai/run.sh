#!/bin/bash

if [ -z "${LOGFIRE_TOKEN}" ]; then
    echo "Error: LOGFIRE_TOKEN not set" >&2
else
    echo "LOGFIRE_TOKEN set, enabling OpenTelemetry tracing" >&2
    export OTEL_EXPORTER_OTLP_ENDPOINT=https://logfire-api.pydantic.dev
    export OTEL_DENO=true
    export OTEL_EXPORTER_OTLP_HEADERS="Authorization=${LOGFIRE_TOKEN}"
fi

# workaround for https://github.com/kenrick95/c4/issues/76
source=`find node_modules -name c4.js`
dest="$(dirname "$source")/c4.mjs"
cp $source $dest

deno task run
