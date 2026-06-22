import axios, { AxiosError } from 'axios';

async function readBlobErrorMessage(data: Blob): Promise<string | undefined> {
  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.error || parsed.message;
  } catch {
    return undefined;
  }
}

export async function getApiErrorMessage(
  error: unknown,
  fallback: string
): Promise<string> {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    if (responseData instanceof Blob) {
      const message = await readBlobErrorMessage(responseData);
      if (message) return message;
    }
    if (responseData && typeof responseData === 'object' && 'error' in responseData) {
      const message = (responseData as { error?: string }).error;
      if (message) return message;
    }
  }

  if (error instanceof Error && error.message && error.message !== fallback) {
    return error.message;
  }

  return fallback;
}

export function getApiErrorMessageSync(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    if (responseData && typeof responseData === 'object' && !(responseData instanceof Blob)) {
      const message = (responseData as { error?: string }).error;
      if (message) return message;
    }
  }

  if (error instanceof Error && error.message && error.message !== fallback) {
    return error.message;
  }

  return fallback;
}

export async function assertBlobDownloadResponse(
  response: { data: Blob; headers: Record<string, unknown> },
  fallback: string
): Promise<void> {
  const contentType = String(response.headers['content-type'] ?? '');
  if (!contentType.includes('application/json')) {
    return;
  }

  const message = await readBlobErrorMessage(response.data);
  throw new Error(message || fallback);
}
