import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EXTENSION_ID, type Capture } from "@proofbridge/core";
import { DataProvider } from "@/lib/data";
import InboxPage from "./page";

vi.mock("next/navigation", () => ({ usePathname: () => "/inbox" }));

const capture: Capture = {
  id: "cap_abcdefghij",
  kind: "opportunity",
  method: "visible-text",
  title: "Captured listing",
  text: "Requirements:\n- TypeScript\n<img src=x onerror=alert(1)>",
  pageUrl: "https://jobs.example.org/42",
  capturedAt: "2026-10-22T10:00:00.000Z",
  confirmedAt: "2026-10-22T10:00:01.000Z",
};

let n = 0;
const renderInbox = () => render(<DataProvider dbName={`inbox-test-${++n}`}><InboxPage /></DataProvider>);
const withRuntime = (sendMessage: (id: string, msg: unknown) => Promise<unknown>) =>
  vi.stubGlobal("chrome", { runtime: { sendMessage } });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Capture Inbox", () => {
  it("explains the fallback when the extension is not installed, without any network call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderInbox();
    expect(await screen.findByText(/extension was not detected/)).toBeTruthy();
    expect(screen.getByLabelText(/Import a capture file/)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("asks only the pinned extension id and shows captured markup as inert text", async () => {
    const send = vi.fn(async () => ({ ok: true, type: "captures", captures: [capture] }));
    withRuntime(send);
    const { container } = renderInbox();
    expect(await screen.findByRole("article", { name: "Captured listing" })).toBeTruthy();
    expect(send).toHaveBeenCalledWith(EXTENSION_ID, { protocol: "proofbridge.capture", version: 1, type: "list" });
    fireEvent.click(screen.getByText("Show captured text"));
    expect(screen.getByText(/onerror=alert\(1\)/).tagName).toBe("PRE");
    expect(container.querySelector("img")).toBeNull();
  });

  it("rejects malformed extension responses instead of rendering them", async () => {
    withRuntime(async () => ({ ok: true, type: "captures", captures: [{ ...capture, pageUrl: "javascript:alert(1)" }] }));
    renderInbox();
    expect(await screen.findByText("The extension sent a response this app does not understand.")).toBeTruthy();
    expect(screen.queryByRole("article")).toBeNull();
  });
});
