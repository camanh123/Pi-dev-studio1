import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initPiSdk } from "./pi/init";

const piInit = initPiSdk();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App piInit={piInit} />
  </React.StrictMode>,
);
