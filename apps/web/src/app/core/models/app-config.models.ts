/**
 * Build-time feature flags, one entry per menu module. Edit
 * `public/app-config.json` and rebuild to produce a client-specific app.
 */
export interface ModuleFlags {
  /** When false the module is hidden from the menu and its route is blocked. */
  active: boolean;
  /** When false the scanner button is hidden in that module's toolbar. */
  scanner: boolean;
}

export interface AppConfig {
  modules: Record<string, ModuleFlags>;
}
