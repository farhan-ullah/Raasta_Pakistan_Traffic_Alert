import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";

import App from "./App";
import { getWebApiOrigin } from "./constants/apiOrigin";
import "./index.css";

const apiOrigin = getWebApiOrigin();
setBaseUrl(apiOrigin || null);

createRoot(document.getElementById("root")!).render(<App />);
