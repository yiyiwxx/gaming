function normalizeBasePath(value: string | undefined) {
  const trimmed = (value ?? "").trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

export function getAppBasePath() {
  return normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
}

export function withBasePath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAppBasePath()}${normalizedPath}`;
}

export function buildAppUrl(origin: string, path: string) {
  const normalizedOrigin = origin.replace(/\/$/, "");
  return path ? `${normalizedOrigin}${withBasePath(path)}` : `${normalizedOrigin}${getAppBasePath()}`;
}

export function getRequestOrigin(request: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function getRequestAppUrl(request: Request, path: string) {
  return buildAppUrl(getRequestOrigin(request), path);
}
