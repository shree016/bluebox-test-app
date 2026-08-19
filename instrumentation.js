"use strict";

// Load .env before anything else reads environment variables.
try {
  require("dotenv").config();
} catch (_) {
  // dotenv not installed
}

const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");

const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");

const { OTLPMetricExporter } =
  require("@opentelemetry/exporter-metrics-otlp-proto");

const { OTLPLogExporter } =
  require("@opentelemetry/exporter-logs-otlp-http");

const { PeriodicExportingMetricReader } =
  require("@opentelemetry/sdk-node").metrics;

const { SimpleLogRecordProcessor } =
  require("@opentelemetry/sdk-node").logs;

// Trace exporter
const traceExporter = new OTLPTraceExporter();

// Metric exporter
const metricExporter = new OTLPMetricExporter();

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 60_000,
});

// Log exporter
const logExporter = new OTLPLogExporter();

const logRecordProcessor = new SimpleLogRecordProcessor(logExporter);

// Auto-instrumentations
const instrumentations = [getNodeAutoInstrumentations()];

// Assemble SDK
const sdk = new NodeSDK({
  instrumentations,
  metricReaders: [metricReader],
  logRecordProcessors: [logRecordProcessor],
});

sdk.start();

// Graceful shutdown
const shutdown = () =>
  sdk.shutdown().then(
    () => process.exit(0),
    () => process.exit(1)
  );

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);