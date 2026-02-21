import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
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

  throw new Error('ZIP 안에서 지원 가능한 JSON 파일을 찾을 수 없습니다.');
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
        { error: '파일 크기가 50MB를 초과합니다.' },
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
        { error: '파싱된 메시지가 없습니다. 파일 형식을 확인해주세요.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      {
        error: '파일 파싱에 실패했습니다.',
        details: (error as Error).message,
      },
      { status: 422 }
    );
  }
}
