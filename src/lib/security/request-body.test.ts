import { describe, expect, it, vi } from "vitest";
import { readUtf8BodyWithLimit } from "@/lib/security/request-body";

describe("readUtf8BodyWithLimit", () => {
  it("rejects a declared oversized body without reading the stream", async () => {
    const start = vi.fn();
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-length": "33" },
      body: new ReadableStream<Uint8Array>({ start }),
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readUtf8BodyWithLimit(request, 32)).resolves.toEqual({
      ok: false,
      reason: "too_large",
    });
    expect(start).toHaveBeenCalledOnce();
  });

  it("cancels a headerless stream as soon as its byte limit is exceeded", async () => {
    const cancel = vi.fn();
    const encoder = new TextEncoder();
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("1234"));
          controller.enqueue(encoder.encode("56789"));
          controller.enqueue(encoder.encode("unread"));
        },
        cancel,
      }),
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readUtf8BodyWithLimit(request, 8)).resolves.toEqual({
      ok: false,
      reason: "too_large",
    });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("decodes multibyte UTF-8 split across stream chunks", async () => {
    const bytes = new TextEncoder().encode('{"name":"Renée"}');
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes.subarray(0, 13));
          controller.enqueue(bytes.subarray(13));
          controller.close();
        },
      }),
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readUtf8BodyWithLimit(request, bytes.byteLength)).resolves.toEqual({
      ok: true,
      text: '{"name":"Renée"}',
    });
  });

  it("rejects invalid UTF-8", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: Uint8Array.from([0xc3, 0x28]),
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readUtf8BodyWithLimit(request, 8)).resolves.toEqual({
      ok: false,
      reason: "unreadable",
    });
  });
});
