import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export const runtime = 'edge';
import { parseAuto } from '@/lib/parsers/detector';

async function extractZip(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  // ChatGPT export: ZIP 안에 conversations.json
  const conversationsFile = zip.file('conversations.json');
  if (conversationsFile) {
    return await conversationsFile.async('string');
  }

  // 다른 JSON 파일 찾기
  const jsonFiles = Object.keys(zip.files).filter(
    (f) => f.endsWith('.json') && !zip.files[f].dir
  );
  if (jsonFiles.length > 0) {
    return await zip.files[jsonFiles[0]].async('string');
  }

  throw new Error('Cannot find supported JSON files within the ZIP.');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 파일 크기 제한: 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB.' },
        { status: 413 }
      );
    }

    let raw: string;

    if (file.name.endsWith('.zip')) {
      const buffer = await file.arrayBuffer();
      raw = await extractZip(buffer);
    } else {
      raw = await file.text();
    }

    const parsed = parseAuto(raw);

    // 파싱 결과 검증
    if (parsed.messages.length === 0) {
      return NextResponse.json(
        { error: 'No parsed messages found. Please check the file format.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse file.',
        details: (error as Error).message,
      },
      { status: 422 }
    );
  }
}
