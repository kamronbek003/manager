const BASE_URL = process.env.REACT_APP_API_URL;

export async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const url = `${BASE_URL}${endpoint}`;

  console.log(`[apiRequest] BASE_URL: ${BASE_URL}`);
  console.log(`[apiRequest] Full URL: ${url}`);
  console.log(`[apiRequest] Method: ${method}, Token: ${token || 'No token'}`);
  if (body) console.log(`[apiRequest] Request Body:`, JSON.stringify(body));

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });

  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  const options = {
    method,
    headers,
    ...(body && ['POST', 'PATCH', 'PUT'].includes(method.toUpperCase()) && { body: JSON.stringify(body) }),
  };

  let response;

  try {
    response = await fetch(url, options);
    console.log(`[apiRequest] Response Status: ${response.status} ${response.statusText}`);

    if (response.status === 401) {
      console.warn('[apiRequest] Unauthorized (401). Logging out...');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_name');
      window.location.reload();
      return Promise.reject({ message: 'Unauthorized. Redirecting to login.', statusCode: 401, isAuthError: true });
    }

    let responseData = null;
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    console.log(`[apiRequest] Content-Type: ${contentType}, Content-Length: ${contentLength}`);

    if (contentType && contentType.includes('application/json') && contentLength !== '0') {
      try {
        responseData = await response.json();
        console.log('[apiRequest] Parsed JSON Response:', JSON.stringify(responseData));
      } catch (jsonError) {
        console.error('[apiRequest] Failed to parse JSON response:', jsonError);
        const error = new Error(`Serverdan noto'g'ri JSON javob formati (status: ${response.status})`);
        error.statusCode = response.status;
        error.originalError = jsonError;
        throw error;
      }
    } else if (response.status === 204 || contentLength === '0') {
      console.log(`[apiRequest] Received ${response.status} status with no content.`);
    } else {
      try {
        const textResponse = await response.text();
        console.warn(`[apiRequest] Received non-JSON response:`, textResponse.substring(0, 100));
      } catch (textError) {
        console.error('[apiRequest] Failed to read response body as text:', textError);
      }
    }

    if (!response.ok) {
      console.error('[apiRequest] API request failed:', response.status, responseData);
      const errorMessage = responseData?.message || `HTTP xatolik! Status: ${response.status} ${response.statusText}`;
      const error = new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
      error.statusCode = response.status;
      error.originalError = responseData;
      throw error;
    }

    return responseData;

  } catch (error) {
    if (error.isAuthError) {
      console.log('[apiRequest] Authentication error handled, not throwing further.');
      return Promise.reject(error);
    }

    console.error(`[apiRequest] Request failed (${method} ${url}):`, error);

    let displayMessage = 'Server bilan bog\'lanishda xatolik.';
    if (error instanceof TypeError) {
      displayMessage = 'Serverga ulanib bo\'lmadi. Internet yoki server manzilini tekshiring.';
    } else if (error.message) {
      displayMessage = error.message;
    }

    const processedError = new Error(displayMessage);
    processedError.originalError = error;
    processedError.statusCode = error.statusCode;

    throw processedError;
  }
}