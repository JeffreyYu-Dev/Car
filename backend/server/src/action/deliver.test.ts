import { describe, expect, test } from "bun:test";
import { runActionModule } from "./deliver";

describe("runActionModule", () => {
  test("parses well-formed JSON and maps critical severity to a dashboard alert", () => {
    const result = runActionModule(
      JSON.stringify({ message: "Pull over safely, engine overheating.", severity: "critical" }),
    );

    expect(result.severity).toBe("critical");
    expect(result.deliveryChannel).toBe("dashboard_alert");
    expect(result.message).toBe("Pull over safely, engine overheating.");
    expect(result.usedFallback).toBe(false);
  });

  test("maps reminder severity to a dashboard reminder", () => {
    const result = runActionModule(
      JSON.stringify({ message: "Schedule service soon.", severity: "reminder" }),
    );

    expect(result.deliveryChannel).toBe("dashboard_reminder");
  });

  test("maps advisory severity to a passive memo", () => {
    const result = runActionModule(
      JSON.stringify({ message: "Avoid aggressive acceleration.", severity: "advisory" }),
    );

    expect(result.deliveryChannel).toBe("memo");
  });

  test("strips a markdown code fence around the JSON payload", () => {
    const result = runActionModule(
      '```json\n{"message": "Check tire pressure.", "severity": "reminder"}\n```',
    );

    expect(result.severity).toBe("reminder");
    expect(result.usedFallback).toBe(false);
  });

  test("falls back to a heuristic classification for unparseable output", () => {
    const result = runActionModule("Do not drive, this is unsafe. Pull over immediately.");

    expect(result.usedFallback).toBe(true);
    expect(result.severity).toBe("critical");
    expect(result.deliveryChannel).toBe("dashboard_alert");
  });

  test("fallback defaults to reminder when no severity keywords are found", () => {
    const result = runActionModule("Some unstructured response text.");

    expect(result.usedFallback).toBe(true);
    expect(result.severity).toBe("reminder");
  });
});
