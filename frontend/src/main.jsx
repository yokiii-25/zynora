import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import "./assets/styles/global.css";
import "./assets/styles/navbar.css";
import "./assets/styles/hero.css";
import "./assets/styles/products.css";
import "./assets/styles/whyzynora.css";
import "./assets/styles/howitworks.css";
import "./assets/styles/footer.css";
import "./assets/styles/uploadplan.css";
import "./assets/styles/threeddesign.css";
import "./assets/styles/roomclassification.css";

import "./index.css";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);