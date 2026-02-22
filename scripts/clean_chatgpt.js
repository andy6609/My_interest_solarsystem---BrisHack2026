/**
 * ChatGPT export 데이터 정리 스크립트
 * - conversations-000.json + conversations-001.json 합치기
 * - 불필요한 필드 제거
 * - mapping 트리 -> flat messages 배열로 변환
 * - 출력: Aichat-json/chatgpt_clean.json
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../Aichat-json/chatgpt_lee_files.files');
const OUT_FILE = path.join(__dirname, '../Aichat-json/chatgpt_clean.json');

/**
 * current_node 에서 root 까지 거슬러 올라가며 대화 경로를 추출
 * (ChatGPT는 트리 구조라 분기가 있을 수 있어서, current_node 기준 경로만 사용)
 */
function extractMessages(conv) {
  const mapping = conv.mapping;
  const messages = [];
  const visited = new Set();

  let nodeId = conv.current_node;

  while (nodeId && !visited.has(nodeId)) {
    visited.add(nodeId);
    const node = mapping[nodeId];
    if (!node) break;

    const msg = node.message;
    if (msg && msg.author?.role !== 'system') {
      const parts = msg.content?.parts || [];
      const content = parts
        .filter((p) => typeof p === 'string')
        .join('\n')
        .trim();

      if (content) {
        messages.unshift({
          role: msg.author.role === 'user' ? 'user' : 'assistant',
          content,
          create_time: msg.create_time,
        });
      }
    }

    nodeId = node.parent;
  }

  return messages;
}

// 두 파일 읽기
const d0 = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'conversations-000.json'), 'utf8'));
const d1 = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'conversations-001.json'), 'utf8'));
const all = [...d0, ...d1];

// 정리
const clean = all
  .map((conv) => ({
    id: conv.id,
    title: conv.title || 'Untitled',
    create_time: conv.create_time,
    messages: extractMessages(conv),
  }))
  .filter((c) => c.messages.length > 0)
  .sort((a, b) => a.create_time - b.create_time);

fs.writeFileSync(OUT_FILE, JSON.stringify(clean, null, 2), 'utf8');

const totalMsgs = clean.reduce((acc, c) => acc + c.messages.length, 0);
console.log(`✅ 완료: ${clean.length}개 대화, ${totalMsgs}개 메시지`);
console.log(`📁 출력: ${OUT_FILE}`);
