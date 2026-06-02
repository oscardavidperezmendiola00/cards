// types/formidable-shim.d.ts
declare module 'formidable' {
  import type { IncomingMessage } from 'http';

  export interface File {
    filepath: string;
    mimetype?: string;
    originalFilename?: string;
    size?: number;
  }
  export type Fields = Record<string, unknown>;
  export type Files  = Record<string, File | File[]>;

  export interface Options {
    multiples?: boolean;
    maxFileSize?: number;
    uploadDir?: string;
    keepExtensions?: boolean;
  }

  export interface IncomingForm {
    parse(
      req: IncomingMessage,
      callback: (err: unknown, fields: Fields, files: Files) => void
    ): void;
  }

  // v3 exporta una **factory function** (no clase)
  function formidable(options?: Options): IncomingForm;
  export default formidable;
}
