export default async (request: Request) => {
  const url = new URL(request.url);
  const icalUrl = url.searchParams.get('url');

  if (!icalUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(icalUrl);
    const text = await response.text();

    return new Response(text, {
      headers: {
        'Content-Type': 'text/calendar',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    return new Response(`Failed to fetch calendar: ${error}`, { status: 500 });
  }
};

export const config = {
  path: '/api/calendar-proxy',
};
