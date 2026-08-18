export type NotesDisplayState = "loading" | "slow" | "error" | "populated" | "empty";
export type NoteDetailErrorState = "not-found" | "error";

export function getNotesDisplayState({
  isLoading,
  isSlow,
  isError,
  count,
}: {
  isLoading: boolean;
  isSlow?: boolean;
  isError: boolean;
  count: number | undefined;
}): NotesDisplayState {
  if (isLoading) return isSlow ? "slow" : "loading";
  if (isError) return "error";
  return count ? "populated" : "empty";
}

export function getNoteDetailErrorState(errorCode?: string): NoteDetailErrorState {
  return errorCode === "NOT_FOUND" ? "not-found" : "error";
}
