import JSZip from 'jszip';

export async function extractConversationsFromZip(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);

  const conversationsFile = zip.file('conversations.json');
  if (conversationsFile) {
    return await conversationsFile.async('string');
  }

  const jsonFiles = Object.keys(zip.files).filter((f) => f.endsWith('.json'));
  if (jsonFiles.length > 0) {
    return await zip.files[jsonFiles[0]].async('string');
  }

  throw new Error('지원하는 파일을 찾을 수 없습니다');
}
