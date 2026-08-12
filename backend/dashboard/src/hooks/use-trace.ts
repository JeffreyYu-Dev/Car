import { useEffect, useState } from "react";
import { subscribeToTraces, type Trace } from "#/lib/api";

// Keeps a single trace live: starts from the initial fetch (via the route
// loader) and applies further updates from the SSE stream as the request's
// stages complete, so an in-flight query's detail page updates in place
// exactly like the list does.
export function useTrace(initial: Trace) {
  const [trace, setTrace] = useState(initial);

  useEffect(() => {
    setTrace(initial);
  }, [initial]);

  useEffect(() => {
    const unsubscribe = subscribeToTraces((updated) => {
      if (updated.id === initial.id) setTrace(updated);
    });
    return unsubscribe;
  }, [initial.id]);

  return trace;
}
