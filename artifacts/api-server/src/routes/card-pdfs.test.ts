import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { Readable } from "node:stream";

// ── In-memory GCS mock ──────────────────────────────────────────────────────
// Keeps storage.ts (uploadToStorage/serveFromStorage) fully real so the
// Content-Disposition / RFC 5987 logic is actually exercised.
const memoryStore = new Map<string, { buffer: Buffer; contentType: string }>();

vi.mock("@google-cloud/storage", () => {
  class FakeFile {
    constructor(private name: string) {}
    async save(buffer: Buffer, opts: { contentType: string }) {
      memoryStore.set(this.name, { buffer, contentType: opts.contentType });
    }
    async exists() {
      return [memoryStore.has(this.name)];
    }
    async getMetadata() {
      const entry = memoryStore.get(this.name)!;
      return [{ contentType: entry.contentType, size: entry.buffer.length }];
    }
    createReadStream() {
      const entry = memoryStore.get(this.name)!;
      return Readable.from(entry.buffer);
    }
  }
  class FakeBucket {
    file(name: string) {
      return new FakeFile(name);
    }
  }
  class Storage {
    bucket(_name: string) {
      return new FakeBucket();
    }
  }
  return { Storage };
});

// ── DB mock (declared before any import that pulls in @workspace/db) ───────
const fakeOrder: Record<string, unknown> = {
  id: 1,
  orderNumber: "TEST000001",
  // Legacy-confirmed order: the old payment era must still be allowed to upload.
  paymentStatus: "confirmed",
  paymentMethod: "upi",
  rationCardPdfs: [] as unknown[],
};
const updateSet = vi.fn().mockReturnThis();
vi.mock("@workspace/db", () => {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(async () => [fakeOrder]),
  };
  const updateChain = {
    set: updateSet,
    where: vi.fn().mockResolvedValue(undefined),
  };
  return {
    db: {
      select: vi.fn(() => selectChain),
      update: vi.fn(() => updateChain),
      insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    },
    ordersTable: {},
    RationCardPdfsSchema: {
      safeParse: (v: unknown) => ({ success: true, data: v ?? [] }),
    },
    FamilyCardsSchema: {
      safeParse: (v: unknown) => ({ success: true, data: v ?? [] }),
    },
    ALLOWED_CARD_TYPES: ["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II", "ABHA", "E-SHRAM", "GENERAL", "AYUSHMAN BHARAT", "AADHAAR", "VOTER ID", "PAN", "APAAR ID", "DRIVING LICENCE", "BJP MEMBERSHIP CARD", "CUSTOM ID CARD"],
  };
});

// Required env vars before app loads
process.env["SESSION_SECRET"] = "test-secret-for-unit-tests";
process.env["MYSQL_DATABASE_URL"] = "mysql://unused:unused@localhost/unused";
process.env["ADMIN_EMAIL"] = "admin@test.com";
process.env["ADMIN_PASSWORD"] = "test-password";
process.env["PRIVATE_OBJECT_DIR"] = "/test-bucket/private";

const { default: app } = await import("../app.js");
const { sanitizePdfFilename } = await import("./card-pdfs.js");

const PDF_BUFFER = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
const PNG_BUFFER = Buffer.from("\x89PNG\r\n\x1a\nnot a pdf at all", "latin1");

// Bengali filename as the server sees it: browsers send UTF-8 bytes, busboy
// decodes them as latin1 — simulate that mojibake for sanitizer unit tests.
const BENGALI = "রেশন কার্ড.pdf";
const BENGALI_MOJIBAKE = Buffer.from(BENGALI, "utf8").toString("latin1");

beforeEach(() => {
  memoryStore.clear();
  fakeOrder.rationCardPdfs = [];
  updateSet.mockClear();
});

// ── Unit tests: sanitizePdfFilename ─────────────────────────────────────────
describe("sanitizePdfFilename", () => {
  it("re-decodes latin1 mojibake so Bengali/UTF-8 names survive exactly", () => {
    expect(sanitizePdfFilename(BENGALI_MOJIBAKE, 0)).toBe(BENGALI);
  });

  it("keeps plain ASCII names untouched", () => {
    expect(sanitizePdfFilename("my-card.pdf", 0)).toBe("my-card.pdf");
  });

  it("keeps invalid-UTF-8 latin1 input as-is (U+FFFD guard)", () => {
    // 0xE9 alone ("é" in latin1) is not valid UTF-8 — must not be replaced.
    expect(sanitizePdfFilename("caf\xe9.pdf", 0)).toBe("caf\xe9.pdf");
  });

  it("strips control characters", () => {
    expect(sanitizePdfFilename("bad\x00\x1fname\x7f.pdf", 0)).toBe("badname.pdf");
  });

  it("collapses dot runs (blocks ..-based traversal in the name)", () => {
    expect(sanitizePdfFilename("a....b..pdf", 0)).toBe("a.b.pdf");
  });

  it("strips path components (posix and windows)", () => {
    expect(sanitizePdfFilename("/etc/passwd/card.pdf", 0)).toBe("card.pdf");
    expect(sanitizePdfFilename("C:\\Users\\x\\card.pdf", 0)).toBe("card.pdf");
    expect(sanitizePdfFilename("../../evil.pdf", 0)).toBe("evil.pdf");
  });

  it("strips characters that break URLs/storage keys", () => {
    expect(sanitizePdfFilename('a"b#c?d%e.pdf', 0)).toBe("abcde.pdf");
  });

  it("caps very long names while keeping the .pdf suffix", () => {
    const long = "x".repeat(300) + ".pdf";
    const out = sanitizePdfFilename(long, 0);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith(".pdf")).toBe(true);
  });

  it("falls back to card-<index>.pdf for empty or degenerate names", () => {
    expect(sanitizePdfFilename("", 3)).toBe("card-3.pdf");
    expect(sanitizePdfFilename("...", 2)).toBe("card-2.pdf");
    expect(sanitizePdfFilename(".pdf", 1)).toBe("card-1.pdf");
    expect(sanitizePdfFilename("pdf", 4)).toBe("card-4.pdf");
  });

  it("appends .pdf when the extension is missing", () => {
    expect(sanitizePdfFilename("mycard", 0)).toBe("mycard.pdf");
  });
});

// ── API tests: upload route ─────────────────────────────────────────────────
describe("POST /api/orders/:orderNumber/upload-card-pdf", () => {
  it("rejects an image by mimetype with a clean 400", async () => {
    const res = await request(app)
      .post("/api/orders/TEST000001/upload-card-pdf")
      .field("cardIndex", "0")
      .attach("pdf", PNG_BUFFER, { filename: "photo.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Only PDF files/i);
    expect(memoryStore.size).toBe(0);
  });

  it("rejects an image renamed to .pdf (content %PDF check)", async () => {
    const res = await request(app)
      .post("/api/orders/TEST000001/upload-card-pdf")
      .field("cardIndex", "0")
      .attach("pdf", PNG_BUFFER, { filename: "photo.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Only PDF files/i);
    expect(memoryStore.size).toBe(0);
  });

  it("rejects an oversize file with a clean 400, not a 500", async () => {
    const big = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(21 * 1024 * 1024)]);
    const res = await request(app)
      .post("/api/orders/TEST000001/upload-card-pdf")
      .field("cardIndex", "0")
      .attach("pdf", big, { filename: "big.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too large/i);
  });

  it("rejects an invalid cardIndex", async () => {
    const res = await request(app)
      .post("/api/orders/TEST000001/upload-card-pdf")
      .field("cardIndex", "-1")
      .attach("pdf", PDF_BUFFER, { filename: "card.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cardIndex/i);
  });

  it("stores a real PDF and returns originalFilename + pdfUrl", async () => {
    const res = await request(app)
      .post("/api/orders/TEST000001/upload-card-pdf")
      .field("cardIndex", "0")
      .attach("pdf", PDF_BUFFER, { filename: "my card.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(200);
    expect(res.body.originalFilename).toBe("my card.pdf");
    expect(res.body.pdfUrl).toBe(
      `/api/uploads/card-pdfs/TEST000001/0/${encodeURIComponent("my card.pdf")}`
    );
    // Stored under the per-order/per-card key ending in the original name
    expect(memoryStore.has("private/uploads/card-pdfs/TEST000001/0/my card.pdf")).toBe(true);
    // DB was updated with the new entry
    const setArg = updateSet.mock.calls[0][0];
    expect(setArg.rationCardPdfs[0]).toMatchObject({
      cardIndex: 0,
      originalFilename: "my card.pdf",
    });
  });

  it("preserves a Bengali filename end-to-end through upload", async () => {
    const res = await request(app)
      .post("/api/orders/TEST000001/upload-card-pdf")
      .field("cardIndex", "1")
      .attach("pdf", PDF_BUFFER, { filename: BENGALI, contentType: "application/pdf" });
    expect(res.status).toBe(200);
    expect(res.body.originalFilename).toBe(BENGALI);
  });
});

// ── API tests: serve route ──────────────────────────────────────────────────
describe("GET /api/uploads/card-pdfs/:orderNumber/:cardIndex/:filename", () => {
  it("rejects traversal attempts with 400", async () => {
    for (const bad of [
      "/api/uploads/card-pdfs/TEST000001/0/..%2F..%2Fsecret.pdf",
      "/api/uploads/card-pdfs/..%2E/0/card.pdf",
      "/api/uploads/card-pdfs/TEST000001/0/..evil.pdf",
      "/api/uploads/card-pdfs/TEST000001/0/a%5Cb.pdf",
    ]) {
      const res = await request(app).get(bad);
      expect(res.status, bad).toBe(400);
    }
  });

  it("never serves a bare dot-segment filename (Express normalizes it away)", async () => {
    const res = await request(app).get("/api/uploads/card-pdfs/TEST000001/0/%2e%2e");
    expect([400, 404]).toContain(res.status);
  });

  it("serves a UTF-8 filename with correct RFC 5987 Content-Disposition", async () => {
    memoryStore.set(`private/uploads/card-pdfs/TEST000001/0/${BENGALI}`, {
      buffer: PDF_BUFFER,
      contentType: "application/pdf",
    });
    const res = await request(app).get(
      `/api/uploads/card-pdfs/TEST000001/0/${encodeURIComponent(BENGALI)}`
    );
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    const cd = res.headers["content-disposition"];
    expect(cd).toContain(`filename*=UTF-8''${encodeURIComponent(BENGALI)}`);
    // ASCII fallback contains only printable ASCII
    const fallback = /filename="([^"]*)"/.exec(cd)?.[1] ?? "";
    expect(/^[\x20-\x7e]*$/.test(fallback)).toBe(true);
    expect(res.body.equals(PDF_BUFFER)).toBe(true);
  });

  it("returns 404 for a missing file", async () => {
    const res = await request(app).get("/api/uploads/card-pdfs/TEST000001/0/missing.pdf");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/uploads/:filename (legacy flat URLs)", () => {
  it("still serves legacy flat files", async () => {
    memoryStore.set("private/uploads/legacy-screenshot.png", {
      buffer: PNG_BUFFER,
      contentType: "image/png",
    });
    const res = await request(app).get("/api/uploads/legacy-screenshot.png");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
  });

  it("rejects traversal on the legacy route", async () => {
    const res = await request(app).get("/api/uploads/%2e%2e%2fsecret.png");
    expect(res.status).toBe(400);
  });
});
