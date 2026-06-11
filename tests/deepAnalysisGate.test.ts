import type { NextApiRequest, NextApiResponse } from "next";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../src/lib/queue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/queue")>();
  return {
    ...actual,
    enqueueDeepAnalysis: vi.fn(),
  };
});

import { enqueueDeepAnalysis } from "../src/lib/queue";
import {
  __resetDeepAnalysisConfigForTests,
  getDeepAnalysisMode,
  PLACEHOLDER_DISCLAIMER,
} from "../src/lib/deepAnalysisConfig";
import scanHandler from "../src/pages/api/scan";
import deepHandler from "../src/pages/api/scan/deep";

function createMockRes() {
  const res: any = {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
    setHeader() {
      return res;
    },
  };
  return res as NextApiResponse & { statusCode: number; body: any };
}

let nextIp = 0;

function createMockReq(body: Record<string, unknown>): NextApiRequest {
  nextIp += 1;
  return {
    method: "POST",
    headers: { "x-forwarded-for": `10.77.0.${nextIp}` },
    socket: { remoteAddress: "127.0.0.1" },
    body,
  } as unknown as NextApiRequest;
}

beforeEach(() => {
  __resetDeepAnalysisConfigForTests();
});

afterEach(() => {
  vi.mocked(enqueueDeepAnalysis).mockReset();
});

describe("getDeepAnalysisMode", () => {
  test("defaults to disabled", () => {
    expect(getDeepAnalysisMode()).toBe("disabled");
  });

  test("enables placeholder mode case-insensitively", () => {
    vi.stubEnv("DEEP_ANALYSIS_MODE", "Placeholder");
    expect(getDeepAnalysisMode()).toBe("placeholder");
  });

  test("treats llm as misconfiguration and warns", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("DEEP_ANALYSIS_MODE", "llm");
    expect(getDeepAnalysisMode()).toBe("disabled");
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});

describe("POST /api/scan with deepAnalysis requested", () => {
  test("reports unavailable and does not enqueue when disabled", async () => {
    const res = createMockRes();
    await scanHandler(createMockReq({ input: "hello", deepAnalysis: true }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.deepAnalysis.status).toBe("unavailable");
    expect(res.body.deepAnalysis.queueId).toBeUndefined();
    expect(enqueueDeepAnalysis).not.toHaveBeenCalled();
  });

  test("labels queued placeholder analysis as a demo placeholder", async () => {
    vi.stubEnv("DEEP_ANALYSIS_MODE", "placeholder");
    vi.mocked(enqueueDeepAnalysis).mockResolvedValue("queue-123");

    const res = createMockRes();
    await scanHandler(createMockReq({ input: "hello", deepAnalysis: true }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.deepAnalysis.queueId).toBe("queue-123");
    expect(res.body.deepAnalysis.placeholder).toBe(true);
    expect(res.body.deepAnalysis.disclaimer).toBe(PLACEHOLDER_DISCLAIMER);
  });

  test("reports unavailable when the queue rejects the job", async () => {
    vi.stubEnv("DEEP_ANALYSIS_MODE", "placeholder");
    vi.mocked(enqueueDeepAnalysis).mockResolvedValue(null);

    const res = createMockRes();
    await scanHandler(createMockReq({ input: "hello", deepAnalysis: true }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.deepAnalysis.status).toBe("unavailable");
  });
});

describe("POST /api/scan/deep", () => {
  test("returns 503 when deep analysis is disabled", async () => {
    const res = createMockRes();
    await deepHandler(createMockReq({ inputHash: "abc", inputLength: 3 }), res);

    expect(res.statusCode).toBe(503);
    expect(res.body.error).toContain("unavailable");
    expect(enqueueDeepAnalysis).not.toHaveBeenCalled();
  });

  test("labels accepted placeholder jobs", async () => {
    vi.stubEnv("DEEP_ANALYSIS_MODE", "placeholder");
    vi.mocked(enqueueDeepAnalysis).mockResolvedValue("queue-456");

    const res = createMockRes();
    await deepHandler(createMockReq({ inputHash: "abc", inputLength: 3 }), res);

    expect(res.statusCode).toBe(202);
    expect(res.body.placeholder).toBe(true);
    expect(res.body.disclaimer).toBe(PLACEHOLDER_DISCLAIMER);
  });
});
