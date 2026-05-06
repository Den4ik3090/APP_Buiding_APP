// CSS/SCSS Module type declaration
declare module "*.module.scss" {
  const classes: Record<string, string>;
  export default classes;
}

// Asset type declarations for webpack loaders

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

// file-saver has no bundled types; declare minimal used API
declare module "file-saver" {
  export function saveAs(data: Blob | string, filename?: string): void;
}
