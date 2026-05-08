export {};

declare global {
  interface ImportMeta {
    /**
     * Vite-only API used by Angular's Vite dev server/build.
     * We declare it here so TS (angular-compiler) accepts `import.meta.glob(...)`.
     */
    glob: (
      pattern: string,
      options?: {
        eager?: boolean;
        as?: 'url' | 'raw';
        import?: string;
        query?: string;
      }
    ) => Record<string, unknown>;
  }
}

