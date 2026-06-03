const SUPABASE_URL = 'https://ykhzmxgorxntuquinkjo.supabase.co';

export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);

  const pathSegments = params.path ?? [];
  const targetPath = '/' + (Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments);
  const targetURL = new URL(SUPABASE_URL + targetPath);
  targetURL.search = url.search;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') ?? '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const reqHeaders = new Headers(request.headers);
  reqHeaders.delete('host');

  const isBodyless = ['GET', 'HEAD'].includes(request.method);

  const upstream = await fetch(targetURL.toString(), {
    method: request.method,
    headers: reqHeaders,
    body: isBodyless ? null : request.body,
    ...(!isBodyless ? { duplex: 'half' } : {}),
    redirect: 'follow',
  });

  const respHeaders = new Headers(upstream.headers);
  respHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}
