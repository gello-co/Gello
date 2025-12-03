declare module '*.svg' {
  /**
   * A path to the SVG file
   */
  const path: `${string}.svg`;
  export = path;
}

declare module '*.module.css' {
  /**
   * A record of class names to their corresponding CSS module classes
   */
  const classes: { readonly [key: string]: string };
  export = classes;
}

declare namespace NodeJS {
  interface ProcessEnv {
    APP_SUPABASE_URL?: string;
    APP_SUPABASE_PUBLISHABLE_KEY?: string;
    APP_SUPABASE_SERVICE_ROLE_KEY?: string;
    BUN_PUBLIC_SUPABASE_URL?: string;
    BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    NODE_ENV?: string;
    PORT?: string;
  }
}

declare module 'bun' {
  interface Env {
    APP_SUPABASE_URL?: string;
    APP_SUPABASE_PUBLISHABLE_KEY?: string;
    APP_SUPABASE_SERVICE_ROLE_KEY?: string;
    BUN_PUBLIC_SUPABASE_URL?: string;
    BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    NODE_ENV?: string;
    PORT?: string;
  }
}
