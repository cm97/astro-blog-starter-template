type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    /** Logged-in admin username, set by src/middleware.ts once a session cookie is verified. */
    adminUser?: string;
  }
}
