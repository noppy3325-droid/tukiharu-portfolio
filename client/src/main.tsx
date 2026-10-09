import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import "./comment-interactions.css";
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});
const client = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers: { "X-Portfolio-Request": "1" },
      fetch: (input, init) =>
        fetch(input, { ...init, credentials: "same-origin" }),
    }),
  ],
});
createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={client} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
