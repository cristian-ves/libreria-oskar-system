function requestUrl(input) {
  if (typeof input === 'string' || input instanceof URL) return new URL(input.toString());
  return new URL(input.url);
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockExternalFetch(t, responder, { allowLocal = false } = {}) {
  const nativeFetch = globalThis.fetch;
  const calls = [];

  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = requestUrl(input);
    if (allowLocal && ['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
      return nativeFetch(input, options);
    }

    calls.push({ url, options });
    const response = await responder(url, options);
    if (response === undefined) {
      throw new Error(`Solicitud HTTP no simulada: ${url.origin}`);
    }
    return response;
  });

  return calls;
}

function googleBooksResponse(isbn, volumeInfo = {}) {
  return jsonResponse({
    items: [{
      volumeInfo: {
        industryIdentifiers: [{ type: 'ISBN_13', identifier: isbn }],
        title: 'Libro fixture de Google',
        authors: ['Autora de prueba'],
        publisher: 'Editorial fixture',
        description: 'Descripción proporcionada por la respuesta simulada.',
        ...volumeInfo,
      },
      saleInfo: { listPrice: { amount: 12.5 } },
    }],
  });
}

module.exports = { requestUrl, jsonResponse, mockExternalFetch, googleBooksResponse };
