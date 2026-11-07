import { lazy, Suspense } from "react";

const Editor = lazy(() => import("./RichTextEditor"));

export default function LazyRichTextEditor(props: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <Suspense
      fallback={
        <p className="admin-form-help" role="status">
          ノートを開いています…
        </p>
      }
    >
      <Editor {...props} />
    </Suspense>
  );
}
