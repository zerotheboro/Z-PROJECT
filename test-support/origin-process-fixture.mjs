// Sanitized demo-only child process. Tokens travel only through private IPC,
// never command-line arguments, stdout, persisted files or assertion messages.
import { createOriginPrototype } from "../dist-stage2/origin-test-api.mjs";
process.on("message", async request => {
  const service = createOriginPrototype({ onBoundary: async (boundary, uid) => {
    if (boundary === request.crashAt) {
      await new Promise(resolve => process.send({ event: "boundary", uid, boundary }, resolve));
      process.exit(71);
    }
  } });
  try {
    const value = request.operation === "prepare" ? await service.prepare(request.input) : request.operation === "finalize" ?
      await service.finalize(request.token, request.input) : await service.recover(request.token);
    await service.close(); process.send({ event: "result", value }, () => { process.disconnect(); process.exit(0); });
  } catch (error) {
    await service.close(); process.send({ event: "error", code: typeof error?.code === "string" ? error.code : "fixture_failure" }, () => { process.disconnect(); process.exit(1); });
  }
});
