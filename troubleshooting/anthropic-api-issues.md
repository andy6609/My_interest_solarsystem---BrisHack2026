# Anthropic API 관련 이슈 & 토의 기록

> 작성일: 2026-02-21

---

## 이슈 1: 크레딧 부족 (402)

### 증상
```
400 {"type":"error","error":{"type":"invalid_request_error",
"message":"Your credit balance is too low to access the Anthropic API."}}
```

### 원인
- Anthropic API는 구독이 아닌 **선불 충전(Pay-as-you-go)** 방식
- 첫 API 키 발급 후 크레딧이 없으면 즉시 차단

### 해결
- console.anthropic.com → Billing → Add credits (최소 $5 충전)
- 충전 후 새 API 키 발급 → `.env.local` 교체

---

## 이슈 2: Rate Limit 초과 (429)

### 증상
```
429 {"type":"error","error":{"type":"rate_limit_error",
"message":"This request would exceed your organization's rate limit
of 30,000 input tokens per minute"}}
```

### 원인
- Gemini 데이터: **1009개 질문**
- 기존 로직: 500개 초과 시 300개씩 청크로 분할 → `Promise.all`로 **동시 병렬 호출**
- 결과: 4개 청크 × ~15,000 토큰 = **~60,000 토큰 동시 전송** → 분당 한도(30,000) 2배 초과

### 1차 대응 (부분 해결)
- `Promise.all` → **순차 호출**로 변경
- 청크 크기: 300개 → **200개**로 축소
- 청크 간 **3초 대기** 추가
- 문제: 여전히 느림 (6청크 × API 응답시간 = 1~2분)

### 최종 해결 방향 (프로그레시브 분석)

#### 토의 과정
- "250개 샘플 vs 1009개 전수"를 두고 논의
- 250개 샘플은 빠르지만 소수 관심사 누락 가능
- 1009개 전수는 정확하지만 사용자 대기 시간 길어짐

#### 채택된 설계: **2단계 프로그레시브 분석**

```
Phase 1 (즉시, ~5초)
  전체 질문에서 250개 샘플 추출
  → API 단일 호출 → 초기 태양계 즉시 렌더링

Phase 2 (백그라운드)
  나머지 질문 200개씩 청크 → 순차 호출 (60초 간격)
  → 기존 트리와 병합 → 행성 점진적 업데이트
  → 우측 패널에 "분석 진행중... N%" 인디케이터 표시

Phase 3 (완료)
  "분석 완료 · 1009개 질문 반영" 표시 후 인디케이터 사라짐
```

#### 구현 계획
- `useSolarStore`에 `analysisProgress` 상태 추가
  - `status: 'idle' | 'quick' | 'full' | 'done'`
  - `progress: number` (0~100)
  - `totalProcessed: number`
- `/api/analyze` 2단계 분리
  - `?mode=quick`: 샘플 250개 → 즉시 응답
  - `?mode=full`: 전체 → 스트리밍 or 청크 순차 응답
- 우측 패널 상단에 프로그레스 바 + 토글 컴포넌트 추가

---

## 참고: 현재 Rate Limit (2026-02 기준)

| 항목 | 한도 |
|------|------|
| Input tokens/min | 30,000 |
| Output tokens/min | 8,000 |
| Requests/min | 50 |
| 적용 모델 | claude-sonnet-4-20250514 |

> 한도 증가 필요 시: anthropic.com/contact-sales 문의
