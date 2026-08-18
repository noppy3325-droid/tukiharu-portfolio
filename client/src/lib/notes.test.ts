import { describe, expect, it } from "vitest";
import { getNoteDetailErrorState, getNotesDisplayState } from "./notes";

describe("getNotesDisplayState", () => {
  it("shows a loading state before a response arrives", () => {
    expect(getNotesDisplayState({ isLoading: true, isError: false, count: undefined })).toBe("loading");
  });

  it("offers a recovery state when loading continues for too long", () => {
    expect(getNotesDisplayState({ isLoading: true, isSlow: true, isError: false, count: undefined })).toBe("slow");
  });

  it("shows an error state instead of treating a failed request as an empty list", () => {
    expect(getNotesDisplayState({ isLoading: false, isError: true, count: undefined })).toBe("error");
  });

  it("shows populated and empty states after a successful response", () => {
    expect(getNotesDisplayState({ isLoading: false, isError: false, count: 2 })).toBe("populated");
    expect(getNotesDisplayState({ isLoading: false, isError: false, count: 0 })).toBe("empty");
  });
});

describe("getNoteDetailErrorState", () => {
  it("identifies a missing note from the tRPC NOT_FOUND code", () => {
    expect(getNoteDetailErrorState("NOT_FOUND")).toBe("not-found");
  });

  it("treats other failures as a retrieval error", () => {
    expect(getNoteDetailErrorState("INTERNAL_SERVER_ERROR")).toBe("error");
    expect(getNoteDetailErrorState()).toBe("error");
  });
});
