import { useCallback, useEffect, useRef, useState } from "react";
import { analyzePromptReadiness } from "../lib/promptReadinessApi";
import { CLOSED_GENERATION_POLICY, normalizeReadinessResponse } from "../lib/promptReadinessContract";

const INITIAL_STATE = {
  data: null,
  error: null,
  inFlight: false,
  latestRequestId: 0,
  sentSignature: null,
};

/**
 * Keeps the readiness panel in sync with the active chat's answers.
 *
 * - Debounces rapid answer edits; `requestImmediateRefresh()` makes the next change
 *   (e.g. Add Details > Save) refresh immediately.
 * - Every request gets a monotonically increasing `client_revision`. Only the response to
 *   the newest request is applied; older ones are aborted or ignored.
 * - Data is scoped to `scopeKey` (chat + thread), so a previous chat's score never shows
 *   in another chat.
 * - Permission is exposed only while the result is fresh for the exact current inputs.
 *   Otherwise it is closed.
 *
 * The chat state in App.jsx remains the source of truth for answers. This hook only reads them.
 *
 * @param {{
 *   enabled: boolean,
 *   scopeKey: string|null,
 *   threadId: string|null,
 *   answers: import("../lib/promptReadinessContract").ReadinessAnswerItem[],
 *   contextAdditions: import("../lib/promptReadinessContract").ContextAddition[],
 *   additionalContext: string,
 *   debounceMs?: number,
 *   analyze?: typeof analyzePromptReadiness,
 * }} params
 */
export default function usePromptReadiness({
  enabled,
  scopeKey,
  threadId,
  answers = [],
  contextAdditions = [],
  additionalContext = "",
  debounceMs = 400,
  analyze = analyzePromptReadiness,
}) {
  const active = Boolean(enabled && scopeKey && threadId);
  const signature = active
    ? JSON.stringify([scopeKey, threadId, answers, contextAdditions, additionalContext || ""])
    : null;

  const [state, setState] = useState(INITIAL_STATE);

  const inputsRef = useRef(null);
  inputsRef.current = { scopeKey, threadId, answers, contextAdditions, additionalContext, signature };

  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const immediateRef = useRef(false);
  const analyzeRef = useRef(analyze);
  analyzeRef.current = analyze;
  const dataScopeRef = useRef(null);
  dataScopeRef.current = state.data?.scopeKey ?? null;

  const send = useCallback(async () => {
    const inputs = inputsRef.current;
    clearTimeout(timerRef.current);
    if (!inputs?.signature) return;

    abortRef.current?.abort();
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    abortRef.current = controller;

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    setState((s) => ({
      ...s,
      inFlight: true,
      error: null,
      latestRequestId: requestId,
      sentSignature: inputs.signature,
    }));

    let raw;
    try {
      raw = await analyzeRef.current(
        {
          thread_id: inputs.threadId,
          client_revision: requestId,
          answers: inputs.answers,
          context_additions: inputs.contextAdditions,
          additional_context: inputs.additionalContext || "",
        },
        { signal: controller?.signal }
      );
    } catch (err) {
      if (requestId !== requestIdRef.current || err?.name === "AbortError") return;
      setState((s) => ({
        ...s,
        inFlight: false,
        error: { requestId, message: err?.message || "Readiness check failed." },
      }));
      return;
    }

    // Superseded by a newer request: ignore.
    if (requestId !== requestIdRef.current) return;

    const result = normalizeReadinessResponse(raw, { threadId: inputs.threadId, clientRevision: requestId });
    if (!result.ok) {
      setState((s) => ({ ...s, inFlight: false, error: { requestId, message: result.error } }));
      return;
    }

    setState((s) => ({
      ...s,
      inFlight: false,
      error: null,
      data: { ...result.value, requestId, signature: inputs.signature, scopeKey: inputs.scopeKey },
    }));
  }, []);

  // Schedule a readiness check whenever the relevant inputs change.
  useEffect(() => {
    if (!signature) {
      clearTimeout(timerRef.current);
      abortRef.current?.abort();
      abortRef.current = null;
      // Invalidate any in-flight request so a late response cannot be applied.
      requestIdRef.current += 1;
      setState((s) => (s.inFlight || s.sentSignature ? { ...s, inFlight: false, sentSignature: null } : s));
      return undefined;
    }
    const firstForScope = dataScopeRef.current !== inputsRef.current.scopeKey;
    const delay = immediateRef.current || firstForScope ? 0 : debounceMs;
    immediateRef.current = false;
    timerRef.current = setTimeout(send, delay);
    return () => clearTimeout(timerRef.current);
  }, [signature, debounceMs, send]);

  // Abort outstanding work on unmount.
  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      abortRef.current?.abort();
    },
    []
  );

  const refresh = useCallback(() => {
    send();
  }, [send]);

  const requestImmediateRefresh = useCallback(() => {
    immediateRef.current = true;
  }, []);

  const data = state.data && state.data.scopeKey === scopeKey && active ? state.data : null;
  const isUpdating = active && (state.inFlight || state.sentSignature !== signature);
  const error =
    active && state.error && state.error.requestId === state.latestRequestId && !isUpdating
      ? state.error.message
      : null;
  const isFresh = Boolean(
    data &&
      !isUpdating &&
      !error &&
      data.requestId === state.latestRequestId &&
      data.signature === signature
  );

  let status;
  if (!active) status = "disabled";
  else if (error) status = "error";
  else if (!data) status = "loading";
  else if (!isFresh) status = "stale";
  else status = data.readiness.available ? "ready" : "unavailable";

  return {
    enabled: active,
    status,
    data,
    error,
    isFresh,
    isUpdating,
    permission: isFresh ? data.generationPolicy : CLOSED_GENERATION_POLICY,
    refresh,
    requestImmediateRefresh,
  };
}
