import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from "react";
import { startTestJob, subscribeToTestStream } from "../services/api";

const TestingContext = createContext(null);

export const PHASES = {
  IDLE: "idle",
  CRAWLING: "crawling",
  TESTING: "testing",
  ANALYZING: "analyzing",
  DONE: "done",
  ERROR: "error",
};

const PHASE_PROGRESS = {
  [PHASES.IDLE]: 0,
  [PHASES.CRAWLING]: 25,
  [PHASES.TESTING]: 55,
  [PHASES.ANALYZING]: 85,
  [PHASES.DONE]: 100,
};

const initialState = {
  url: "",
  prompt: "",
  jobId: null,
  status: PHASES.IDLE,
  progress: 0,
  logs: [],
  bugs: [],
  report: null,
  error: null,
};

function testingReducer(state, action) {
  switch (action.type) {
    case "START_TEST":
      return { ...initialState, url: action.url, prompt: action.prompt || "", status: PHASES.CRAWLING, progress: PHASE_PROGRESS[PHASES.CRAWLING] };
    case "SET_JOB_ID":
      return { ...state, jobId: action.jobId };
    case "SET_STATUS":
      return { ...state, status: action.status, progress: PHASE_PROGRESS[action.status] ?? state.progress };
    case "SET_PROGRESS":
      return { ...state, progress: action.progress };
    case "ADD_LOG":
      return { ...state, logs: [...state.logs, action.log] };
    case "ADD_BUG":
      return { ...state, bugs: [...state.bugs, action.bug] };
    case "SET_REPORT":
      return { ...state, report: action.report, status: PHASES.DONE, progress: 100 };
    case "SET_ERROR":
      return { ...state, error: action.error, status: PHASES.ERROR };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

function normalizeConsoleArgs(args) {
  return args.map((arg) => {
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return arg.stack || arg.message;
    if (typeof arg === "object") {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(" ");
}

export function TestingProvider({ children }) {
  const [state, dispatch] = useReducer(testingReducer, initialState);
  const streamRef = useRef(null);

  const addRuntimeError = useCallback((source, message, details) => {
    const timestamp = `[${new Date().toLocaleTimeString()}]`;
    const detailText = details ? ` — ${details}` : "";
    const log = `${timestamp} ${source}: ${message}${detailText}`;
    dispatch({ type: "ADD_LOG", log });
    dispatch({ type: "SET_ERROR", error: `${message}${detailText}` });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const originalConsoleError = console.error.bind(console);
    const originalFetch = window.fetch?.bind(window);

    const handleWindowError = (event) => {
      const message = event?.message || "Unknown runtime error";
      const location = event?.filename ? ` at ${event.filename}:${event.lineno}:${event.colno}` : "";
      addRuntimeError("Runtime", message + location, event?.error?.stack || "");
    };

    const handleUnhandledRejection = (event) => {
      const reason = event?.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? "Unhandled promise rejection");
      addRuntimeError("Unhandled promise", message, reason instanceof Error ? reason.stack : "");
    };

    const consoleErrorProxy = (...args) => {
      const message = normalizeConsoleArgs(args);
      originalConsoleError(...args);
      addRuntimeError("Console", message);
    };

    const fetchProxy = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          addRuntimeError("Network", `Request failed for ${args[0]} with status ${response.status}`, response.statusText || "");
        }
        return response;
      } catch (error) {
        addRuntimeError("Network", `Request failed for ${args[0]}`, error instanceof Error ? error.message : String(error));
        throw error;
      }
    };

    console.error = consoleErrorProxy;
    window.fetch = fetchProxy;
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      console.error = originalConsoleError;
      if (originalFetch) {
        window.fetch = originalFetch;
      }
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [addRuntimeError]);

  const startTest = useCallback(async (url, prompt = "") => {
    dispatch({ type: "START_TEST", url, prompt });
    try {
      const { jobId } = await startTestJob(url, prompt);
      dispatch({ type: "SET_JOB_ID", jobId });
      dispatch({ type: "ADD_LOG", log: `[${new Date().toLocaleTimeString()}] Job ${jobId} started for ${url}${prompt ? ` (Target: ${prompt})` : ""}` });

      streamRef.current?.close?.();
      streamRef.current = subscribeToTestStream(jobId, {
        onLog: (log) => dispatch({ type: "ADD_LOG", log }),
        onStatus: (status) => dispatch({ type: "SET_STATUS", status }),
        onBug: (bug) => dispatch({ type: "ADD_BUG", bug }),
        onReport: (report) => dispatch({ type: "SET_REPORT", report }),
        onError: (error) => dispatch({ type: "SET_ERROR", error }),
      });
    } catch (err) {
      dispatch({ type: "SET_ERROR", error: err.message || "Failed to start test" });
    }
  }, []);

  const reset = useCallback(() => {
    streamRef.current?.close?.();
    dispatch({ type: "RESET" });
  }, []);

  const value = { ...state, startTest, reset };

  return <TestingContext.Provider value={value}>{children}</TestingContext.Provider>;
}

export function useTesting() {
  const ctx = useContext(TestingContext);
  if (!ctx) throw new Error("useTesting must be used within a TestingProvider");
  return ctx;
}
