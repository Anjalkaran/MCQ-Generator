
import { NextResponse } from 'next/server';

/**
 * @fileOverview A proxy route to fetch PDFs from external URLs.
 * This bypasses CORS restrictions that prevent react-pdf from loading external files directly.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter.' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch PDF: ${response.statusText}` }, { status: response.status });
    }

    const blob = await response.blob();
    const headers = new Headers();
    
    // Pass through the content type or default to PDF
    headers.set('Content-Type', response.headers.get('Content-Type') || 'application/pdf');
    // Ensure the browser doesn't block this response
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(blob, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('PDF Proxy error:', error);
    return NextResponse.json({ error: 'Failed to proxy PDF request.' }, { status: 500 });
  }
}
