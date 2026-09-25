import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { TestingProvider } from "./context/TestingContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TestingProvider>
      <App />
    </TestingProvider>
  </React.StrictMode>
);
