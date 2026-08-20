# Bluebox Test App

A small Node.js/Express application built to evaluate **Bluebox AI** using real OpenTelemetry telemetry.

The project was used to test the complete observability workflow — from instrumenting an application and exporting telemetry to Bluebox, to troubleshooting metric ingestion, generating controlled failures, and investigating those failures through Bluebox.

## What I Tested

- OpenTelemetry integration with Node.js/Express
- OTLP trace and metric ingestion
- Failure detection and investigation
- GitHub/source-code correlation

## Tech Stack

- Node.js
- Express.js
- OpenTelemetry
- OpenTelemetry Node auto-instrumentation
- OTLP / Protobuf
- Dynatrace / Bluebox AI
- GitHub

## Application

The application exposes two normal endpoints:

```text
GET /
GET /api/users
```

Run locally with:

```bash
npm install
npm start
```

The application runs at:

```text
http://localhost:3000
```

## OpenTelemetry Setup

OpenTelemetry is initialized before Express so HTTP and Express requests can be automatically instrumented.

The application uses:

- NodeSDK
- Node auto-instrumentations
- OTLP trace exporter
- OTLP protobuf metric exporter
- OTLP log exporter
- Periodic metric reader

The final metric exporter uses the protobuf implementation:

```javascript
const { OTLPMetricExporter } =
  require("@opentelemetry/exporter-metrics-otlp-proto");
```

## Custom Test Metric

To verify that metrics were actually reaching Bluebox, the application uses:

```text
bluebox_test_requests
```

The counter records incoming requests with `method` and `route` dimensions.

This provided a deterministic way to generate traffic and verify metric ingestion independently of traces.

## Metric Export Issue

During the initial setup, traces were being exported successfully while metric export failed with:

```text
OTLPExporterError: Unsupported Media Type
```

The metric reader reported:

```text
PeriodicExportingMetricReader: metrics export failed
```

The failure was specific to the metric export path.

The metrics exporter was changed to:

```text
@opentelemetry/exporter-metrics-otlp-proto
```

The protobuf metrics exporter was also explicitly declared as a dependency.

### Validation

After the change, `bluebox_test_requests` appeared in the Bluebox tenant.

Multiple export cycles were observed, confirming that the metric pipeline was working. The earlier `Unsupported Media Type` / `OTLPExporterError` messages were no longer observed during successful validation runs.

## Git Commits

```text
0295228 Fix OpenTelemetry metric export protocol
ffbc953 Declare OpenTelemetry metrics proto exporter dependency
7b141f0 Add OpenTelemetry request metrics
```

## Failure Detection Testing

After validating telemetry ingestion, controlled HTTP 500 failures were used to test Bluebox's failure detection and investigation capabilities.

Two findings were generated:

```text
P-26081
P-26082
```

These were deliberately generated test failures and were not intended to represent a production incident.

### P-26081

The first controlled test generated failures through:

```text
GET /api/error
```

Bluebox detected a failure-rate increase and investigated the resulting telemetry.

### P-26082

A second controlled failure test used:

```text
GET /api/test-failure
```

The endpoint intentionally generated:

```text
HTTP 500
```

with:

```text
Controlled Bluebox test failure
```

The response was verified locally using:

```bash
curl -i http://localhost:3000/api/test-failure
```

Bluebox subsequently detected a 100% failure-rate increase for the affected traffic.

## Investigation Results

The P-26082 investigation showed:

| Endpoint | Result |
|---|---|
| `GET /api/test-failure` | 100% failures |
| `GET /api/error` | 100% failures |
| `GET /` | 0% failures |
| `GET /api/users` | 0% failures |

The failing spans were correlated with HTTP 500 responses from `GET /api/test-failure`.

The requests occurred at regular intervals, consistent with the controlled test traffic.

## GitHub Correlation

An important part of the evaluation was comparing Bluebox telemetry with the connected GitHub repository.

The relevant commits around the incident were:

```text
0295228 Fix OpenTelemetry metric export protocol
ffbc953 Declare OpenTelemetry metrics proto exporter dependency
7b141f0 Add OpenTelemetry request metrics
```

These commits were related to OpenTelemetry configuration and telemetry collection rather than application routing.

The temporary failure endpoints used during testing were not part of the final repository state.

This helped prevent the controlled test failures from being incorrectly attributed to the OpenTelemetry changes.

## Final Application State

After completing the failure tests, the temporary failure endpoints were removed.

The final application contains:

```text
GET /
GET /api/users
```

while retaining the OpenTelemetry instrumentation and `bluebox_test_requests` metric.

The final repository state is:

```text
7b141f0 Add OpenTelemetry request metrics
ffbc953 Declare OpenTelemetry metrics proto exporter dependency
0295228 Fix OpenTelemetry metric export protocol
```

`main` and `origin/main` are synchronized.

## Environment Variables

The OTLP endpoint and authentication credentials are configured through environment variables.

Example:

```text
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_ENDPOINT=<OTLP_ENDPOINT>
OTEL_EXPORTER_OTLP_HEADERS=<AUTHORIZATION_HEADER>
```

Never commit `.env` or OTLP authentication tokens to GitHub.

## Evaluation Outcome

The evaluation demonstrated an end-to-end observability workflow:

```text
Node.js Application
        ↓
OpenTelemetry
        ↓
OTLP Export
        ↓
Bluebox / Dynatrace
        ↓
Telemetry Ingestion
        ↓
Failure Detection
        ↓
Investigation
        ↓
GitHub Correlation
        ↓
Root-Cause Analysis
```

The main technical issue encountered was the OTLP metric export `415 Unsupported Media Type` error. Switching the metrics exporter to the protobuf implementation resolved the issue, and successful metric ingestion was subsequently verified.

The controlled failure tests also demonstrated Bluebox's ability to detect and investigate failure-rate increases using service metrics, spans, endpoint-level behavior, and repository context.

## Documentation

A detailed technical evaluation report covers:

- Implementation details
- OpenTelemetry troubleshooting
- Metric ingestion validation
- P-26081 and P-26082 investigations
- Evidence and root-cause analysis
- GitHub correlation
- Controlled failure testing
- Screenshots
- Limitations and observations
- Final results

## Security Note

Never commit `.env` or OTLP authentication tokens to the repository.

Use environment variables or a secret-management system for credentials.

## Project Purpose

This repository is a **test and evaluation application** created to explore Bluebox AI's observability and investigation workflow with OpenTelemetry.

It is not intended to represent a production application.
