import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type');
    
    if (contentType && contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file');
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      
      // Convert file to base64 for simple storage/display
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const mimeType = file.type;
      
      // Create a data URL for the uploaded image
      const dataUrl = `data:${mimeType};base64,${base64}`;
      
      return NextResponse.json({ 
        url: dataUrl, 
        mimeType: mimeType 
      });
      
    } else if (contentType && contentType.includes('application/json')) {
      // Handle JSON uploads (URL or base64)
      const body = await request.json();
      
      if (body.url) {
        // Handle URL upload - for now just return the URL
        return NextResponse.json({ 
          url: body.url, 
          mimeType: 'image/jpeg' 
        });
      } else if (body.base64) {
        // Handle base64 upload
        const dataUrl = `data:image/jpeg;base64,${body.base64}`;
        return NextResponse.json({ 
          url: dataUrl, 
          mimeType: 'image/jpeg' 
        });
      }
    } else {
      // Handle binary upload
      const buffer = await request.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      
      return NextResponse.json({ 
        url: dataUrl, 
        mimeType: 'image/jpeg' 
      });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
