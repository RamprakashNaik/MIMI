import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { accessToken, refreshToken, messageId } = await req.json();

    if (!accessToken || !messageId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
    });

    const payload = response.data.payload;
    const headers = payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
    const date = headers.find(h => h.name === 'Date')?.value || '';

    // Extract body
    let body = "";
    if (payload?.parts) {
      const textPart = payload.parts.find(p => p.mimeType === 'text/plain') || payload.parts[0];
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString();
      }
    } else if (payload?.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString();
    }

    return NextResponse.json({
      id: response.data.id,
      subject,
      from,
      date,
      body,
      snippet: response.data.snippet
    });
  } catch (error: any) {
    console.error('Gmail Message Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
