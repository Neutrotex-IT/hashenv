import axios, { AxiosError } from 'axios';

type ValidationErrorItem = { msg?: string; message?: string };

type ApiErrorBody = {
  error?: string;
  message?: string;
  errors?: ValidationErrorItem[] | string[];
};

function extractValidationMessages(errors: ApiErrorBody['errors']): string[] {
  if (!errors || !Array.isArray(errors) || errors.length === 0) {
    return [];
  }

  return errors
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      return item.msg || item.message || '';
    })
    .filter(Boolean);
}

function extractApiErrorMessage(responseData: unknown): string | undefined {
  if (!responseData || typeof responseData !== 'object') {
    return undefined;
  }

  const data = responseData as ApiErrorBody;
  if (data.error) {
    return data.error;
  }
  if (data.message) {
    return data.message;
  }

  const validationMessages = extractValidationMessages(data.errors);
  if (validationMessages.length > 0) {
    return validationMessages.join('. ');
  }

  return undefined;
}

async function readBlobErrorMessage(data: Blob): Promise<string | undefined> {
  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as ApiErrorBody;
    return extractApiErrorMessage(parsed);
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
    if (responseData && typeof responseData === 'object' && !(responseData instanceof Blob)) {
      const message = extractApiErrorMessage(responseData);
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
      const message = extractApiErrorMessage(responseData);
      if (message) return message;
    }
  }

  if (error instanceof Error && error.message && error.message !== fallback) {
    return error.message;
  }

  return fallback;
}

export async function assertBlobDownloadResponse(
  response: { data: Blob; headers: Record<string, unknown>; status?: number },
  fallback: string
): Promise<void> {
  // Successful downloads set Content-Disposition: attachment even when
  // Content-Type is application/json (e.g. secrets.json / Flutter secrets).
  const disposition = String(
    response.headers['content-disposition'] ?? response.headers['Content-Disposition'] ?? ''
  ).toLowerCase();
  if (disposition.includes('attachment')) {
    return;
  }

  // Axios only invokes this on resolved responses. A 2xx body with
  // application/json is a real secrets file, not an error envelope — do not
  // treat Content-Type alone as failure (that broke JSON / flutter_secrets).
  const status = response.status ?? 200;
  if (status < 400) {
    return;
  }

  const contentType = String(
    response.headers['content-type'] ?? response.headers['Content-Type'] ?? ''
  );
  if (!contentType.includes('application/json')) {
    return;
  }

  const message = await readBlobErrorMessage(response.data);
  throw new Error(message || fallback);
}
