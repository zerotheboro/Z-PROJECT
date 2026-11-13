import { createServer } from "vite";
import react from "@vitejs/plugin-react";
if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" || !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"))
  throw new Error("Run through scripts/run-sanitized.mjs using Node 24.");
process.env.VITE_ECONOMICS_VIDEO_PREVIEW = "owner-approved";
const previewPath = "/__economics-video-preview/";
const html = '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Edulience — Local Video Preview</title></head><body><div id="root"></div><script type="module">import React from "react";import{createRoot}from"react-dom/client";import Preview from "/src/quiz/economics9708/VideoMethodPreview.tsx";import "/src/index.scss";import "/src/quiz/TrainingExperience.scss";createRoot(document.getElementById("root")).render(React.createElement(Preview));</script></body></html>';
const server = await createServer({ configFile: false, envDir: false, plugins: [react(), {
  name: "owner-video-preview-only", configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      const pathname = req.url?.split("?")[0];
      if (pathname !== previewPath && pathname !== "/") return next();
      try { res.statusCode = 200; res.setHeader("Content-Type", "text/html"); res.end(await vite.transformIndexHtml(previewPath, html)); }
      catch (error) { next(error); }
    });
  }
}], server: { host: "127.0.0.1", port: 5175, strictPort: true } });
await server.listen();
console.log(`Owner-approved video preview: http://127.0.0.1:5175${previewPath}`);
console.log("No Firebase, backend, Training completion, scoring or quota calls. Full videos are preview-only; not scored evidence.");
