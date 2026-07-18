# AI-Native Research IDE 개발 계획서

> 문서 상태: Draft v1.1
> 작성일: 2026-07-18  
> 목표: LaTeX 기반 논문 작성 과정에서 주장, 근거, 논리 구조, 문체와 재현성을 함께 관리하는 오픈소스 연구 IDE를 구축한다.

### 2026-07-18 구현 결정: Web-first + optional desktop

공동 편집과 팀 공유 요구를 반영해 주 제품을 local-first 웹서비스로 전환한다. Electron은 별도 제품이 아니라 동일한 React 앱에 로컬 파일 저장과 `latexmk` 컴파일 권한을 추가하는 선택형 desktop shell로 유지한다.

- 웹: 즉시 접속, 링크 공유, Yjs 기반 실시간 공동 편집, IndexedDB offline cache
- 데스크톱: 웹 기능 + 로컬 폴더 직접 접근 + 전체 LaTeX PDF 컴파일
- Alpha 협업: secret room link + Yjs/WebRTC + presence/remote cursor
- Team 협업: 인증, owner/editor/commenter/viewer 역할, Hocuspocus WebSocket, Yjs binary persistence
- 배포: Vercel 웹 프런트엔드. 초기 협업은 P2P이며 서버 영속화 단계에서 별도 collaboration service 또는 Vercel WebSocket 계층을 추가

AI provider는 OpenAI-compatible adapter로 통일하며 다음 설정을 프로젝트가 아닌 세션 메모리에 둔다.

- gateway host
- exact model ID
- LLM API key
- OpenAI/OpenRouter preset

로컬 검사는 항상 실행하고, 사용자가 `Run review`를 실행할 때만 현재 main `.tex` 범위를 선택한 gateway로 전송한다. 모델 결과는 schema validation과 diff 승인을 거쳐야 적용된다.

### 2026-07-18 Alpha 구현 현황

현재 `Axiomate` 공개 저장소와 Vercel 웹 alpha에는 다음 범위가 구현되어 있다.

- CodeMirror LaTeX 편집, KaTeX semantic preview, Electron 로컬 폴더 열기/저장 및 제한된 `latexmk` 컴파일
- evidence/logic/math/writing 로컬 검사, 승인형 patch, claim ledger와 프로젝트 symbol 검사
- PDF.js 기반 로컬 PDF page text 추출, exact passage 선택과 claim-evidence 연결
- question → gap → contribution → method → experiment → result → limitation → conclusion argument map
- review/patch/compile run history와 venue/voice/English/avoid-phrase style profile
- OpenAI/OpenRouter/custom OpenAI-compatible gateway, exact model ID와 세션 전용 LLM key
- Yjs/WebRTC secret link 공동 편집, IndexedDB cache, presence와 remote cursor
- GitHub Actions 검사와 Vercel 배포
- Supabase Marketplace 이메일 로그인, RLS로 격리된 개인 LaTeX 프로젝트 수동 스냅샷
- 인증된 Vercel Function과 AI Gateway를 통한 managed review, Vercel Analytics와 Speed Insights

서비스 승격 범위에는 개인 계정과 명시적 클라우드 스냅샷만 얇게 추가한다. 조직 권한과 서버 영속 공동 편집은 여전히 제외한다. PDF 원문도 브라우저 로컬에만 유지하며 클라우드나 공동 편집방으로 전송하지 않는다.

---

## 1. 요약

이 제품은 단순한 `LaTeX 편집기 + AI 채팅`이 아니다. 로컬 논문 프로젝트를 이해하고, 문헌 근거를 추적하며, 검증 가능한 패치로 논문을 작성하는 연구용 IDE다.

핵심 가치 제안은 다음과 같다.

1. AI가 생성한 사실성 문장이 근거 없이 원고에 들어가지 않도록 한다.
2. 논문을 문장의 집합이 아니라 연구 질문부터 결론까지 이어지는 논증 구조로 관리한다.
3. 문체를 획일적인 AI 문체로 바꾸지 않고 저자의 스타일과 투고처 규칙을 유지한다.
4. 모든 AI 변경을 diff, 근거, 실행 기록과 함께 검토할 수 있게 한다.
5. `.tex`, `.bib`, 이미지, 코드와 Git 저장소를 원본으로 유지한다.

제품의 초기 포지셔닝은 다음과 같다.

> **논문의 주장·근거·논리·문체를 함께 검사하고 수정하는 오픈소스 Research IDE**

첫 공개 버전은 다음 다섯 기능과 링크 기반 공동 편집에 집중한다. 로그인과 클라우드 저장은 핵심 작업 흐름을 대체하지 않는 선택형 개인 스냅샷으로 제한한다.

- Claim Ledger: 주장과 근거 추적
- Argument Map: 논증 구조 관리
- Paper Linter: 논문 전체 일관성 검사
- Evidence-grounded Rewrite: 근거와 저자 스타일을 보존하는 수정
- Mathematical Co-worker: 수식, 기호, 차원과 주변 설명을 상시 점검하고 선제적으로 제안

---

## 2. 문제 정의

### 2.1 현재 연구 작성 도구의 문제

기존 도구는 작업을 다음과 같이 분리한다.

- LaTeX 편집기: 원고 작성과 컴파일
- PDF 리더: 문헌 읽기와 주석
- 문헌 관리자: 서지정보와 BibTeX 관리
- AI 채팅: 요약, 문장 수정, 아이디어 생성
- Git 또는 클라우드: 버전 관리와 협업
- 코드 및 노트북: 실험과 결과 생성

이 분리는 다음 문제를 만든다.

- AI가 보고 있는 문맥과 실제 논문 프로젝트가 다르다.
- 인용이 존재해도 해당 문장을 실제로 뒷받침하는지 검증하기 어렵다.
- 문단별 수정은 가능하지만 논문 전체의 논리적 연결이 약해진다.
- AI가 저자의 목소리를 일반적인 학술 문체로 덮어쓴다.
- 표와 그림의 수치가 코드, 본문, 초록 사이에서 달라질 수 있다.
- 수정 이유와 사용된 근거가 남지 않는다.

### 2.2 해결하려는 핵심 문제

이 제품은 아래 질문에 답해야 한다.

1. 이 문장은 사실인가?
2. 어떤 문헌이나 실험 결과가 이 문장을 뒷받침하는가?
3. 인용된 문헌이 실제로 이 수준의 주장을 하는가?
4. 이 문장은 논문 전체 논증에서 어떤 역할을 하는가?
5. 서론에서 약속한 기여가 실험과 결론에서 검증되는가?
6. 수정된 문장이 저자의 문체와 투고처 규칙을 유지하는가?
7. AI가 무엇을 읽고 왜 변경했는지 재현할 수 있는가?

### 2.3 해결하지 않는 문제

제품은 연구자의 판단을 대체하지 않는다.

- 연구 결과의 진위를 자동으로 보증하지 않는다.
- 존재하지 않는 근거를 모델의 확신도로 대신하지 않는다.
- peer review 통과를 보장하지 않는다.
- 통계적 타당성 전체를 범용적으로 자동 판정하지 않는다.
- 사용자 승인 없이 원고 전체를 자동 변경하지 않는다.

핵심 원칙은 "할루시네이션이 발생하지 않는다"가 아니라 다음이다.

> **검증되지 않은 내용이 검증된 것처럼 원고에 들어가지 않는다.**

---

## 3. 목표 사용자

### 3.1 초기 핵심 사용자

- CS/ML 분야에서 LaTeX와 Git을 사용하는 대학원생 및 연구자
- ACL, NeurIPS, ICML, ICLR, CVPR 계열 논문을 작성하는 사용자
- 영어가 모국어가 아니지만 기술적 정확성과 자신의 문체를 유지하고 싶은 연구자
- 여러 `.tex` 파일과 `.bib`, 실험 코드를 함께 관리하는 사용자

CS/ML 연구자를 우선하는 이유는 다음과 같다.

- LaTeX와 Git 사용 비율이 높다.
- 논문 템플릿과 구조가 비교적 표준화되어 있다.
- 실험 결과 파일과 원고를 연결하기 쉽다.
- 오픈소스 초기 사용자를 확보하기 유리하다.

### 3.2 후속 사용자

- 자연과학 및 공학 연구자
- 학위논문 작성자
- 연구실 단위 self-host 사용자
- 공동 저자와 지도교수
- 학술 편집자 및 연구 지원 조직

### 3.3 핵심 Jobs-to-be-Done

- “내 논문의 핵심 주장 중 근거가 약한 부분을 찾고 싶다.”
- “이 문헌이 현재 문장을 정말 뒷받침하는지 확인하고 싶다.”
- “서론, 실험, 결론의 논리가 서로 맞는지 검토하고 싶다.”
- “내 문체를 유지하면서 영어 표현을 개선하고 싶다.”
- “Reviewer 코멘트를 빠짐없이 원고 수정과 연결하고 싶다.”
- “표와 초록의 숫자가 실험 결과와 일치하는지 확인하고 싶다.”

---

## 4. 제품 원칙

### 4.1 Evidence before prose

사실성 문장을 생성할 때는 먼저 근거를 식별한다. 근거를 찾지 못하면 문장 생성을 거절하거나 `unsupported` 상태로 명확히 표시한다.

### 4.2 Local files are the source of truth

`.tex`, `.bib`, 이미지와 코드가 원본이다. 전용 메타데이터를 삭제해도 논문은 정상적으로 컴파일되어야 한다.

### 4.3 Patch, not replacement

AI는 문서 전체를 덮어쓰지 않는다. 범위가 명확한 패치를 만들고 사용자가 diff를 승인한다.

### 4.4 Structure before style

논리 구조 문제가 있는 문단을 문체만 매끄럽게 만들어 숨기지 않는다. 논증, 근거, 내용, 문체 순서로 검사한다.

### 4.5 Abstention is a feature

근거 부족, 원문 미확보, 파싱 실패, 불확실성이 높은 경우 AI는 멈추고 이유를 설명한다.

### 4.6 Model-agnostic

특정 모델 사업자에 종속되지 않는다. 초기에는 OpenAI-compatible API를 지원하고 이후 provider adapter를 확장한다.

### 4.7 Inspectable by default

프롬프트, 참조한 파일, 도구 호출, 결과, diff, 검증 결과를 실행 기록에 남긴다. API 키와 민감 데이터는 기록하지 않는다.

---

## 5. 핵심 제품 구조

제품은 다섯 개 엔진과 하나의 공통 실행 계층으로 구성한다.

```text
Project Files
  ├─ .tex / .bib / figures
  ├─ source PDFs / notes
  └─ experiment outputs
          │
          ▼
Project Index & Paper Model
          │
   ┌──────┼──────────┬──────────┬─────────────┐
   ▼      ▼          ▼          ▼             ▼
Evidence Argument  Writing  Mathematical  Reproducibility
Engine   Engine    Engine     Co-worker        Engine
   └──────┴──────────┴──────────┴─────────────┘
                  │
                  ▼
       Agent Run → Patch → Checks
                  │
                  ▼
             User Approval
```

### 5.1 Paper Model

LaTeX 원문을 다음 의미 단위로 색인한다.

- 문서와 포함 파일
- section/subsection
- paragraph/sentence
- label/ref/cite
- equation/symbol
- table/figure
- theorem/definition
- bibliography entry
- comment 및 TODO

각 노드는 안정적인 ID와 원본 위치를 가진다. 파일 수정 후에도 가능한 한 ID를 유지해 Claim과 근거 연결이 끊어지지 않게 한다.

### 5.2 Evidence Engine

역할:

- PDF와 참고문헌을 프로젝트에 등록
- PDF 텍스트와 페이지 위치 추출
- 원고 문장을 claim 단위로 분해
- claim과 source passage를 연결
- citation entailment 및 과도한 일반화 검사
- 근거 상태 표시

초기 근거 상태:

```ts
type EvidenceStatus =
  | "supported"
  | "partially_supported"
  | "unsupported"
  | "contradicted"
  | "not_checked"
  | "author_hypothesis"
  | "project_result";
```

근거 판정은 모델 점수 하나로 결정하지 않는다. 다음 정보를 함께 저장한다.

- source identifier
- PDF page
- exact passage 또는 table/figure reference
- claim과 근거의 관계
- 제한 조건
- 판정 이유
- 사용 모델과 실행 시점

### 5.3 Argument Engine

논문 전체를 다음 노드와 관계로 관리한다.

주요 노드:

- Research Question
- Background
- Problem
- Gap
- Hypothesis
- Contribution
- Method
- Experiment
- Result
- Limitation
- Conclusion

주요 관계:

- motivates
- addresses
- tests
- supports
- contradicts
- qualifies
- derives-from
- summarized-by

Argument Engine은 다음 규칙을 검사한다.

- 기여가 실제 section과 실험에 연결되는가
- hypothesis를 검증하는 experiment가 존재하는가
- conclusion이 result의 범위를 넘어서는가
- abstract의 핵심 claim이 본문에서 뒷받침되는가
- limitation이 결론의 적용 범위와 일치하는가
- 서론의 gap과 related work의 설명이 일치하는가

초기에는 완전 자동 그래프를 목표로 하지 않는다. AI가 초안을 만들고 사용자가 노드와 관계를 수정할 수 있게 한다.

### 5.4 Writing Engine

Writing Engine은 다음 세 입력을 사용한다.

1. 문장의 논증 역할
2. 저자 스타일 프로필
3. 투고처 스타일 프로필

지원할 초기 작업:

- clarity
- concision
- academic tone
- causal-language weakening
- claim qualification
- paragraph cohesion
- terminology consistency
- Korean-to-English technical translation

모든 rewrite는 다음을 반환한다.

```ts
interface RewriteSuggestion {
  original: string;
  replacement: string;
  reason: string;
  preservedClaims: string[];
  changedClaims: string[];
  evidenceImpact: "none" | "recheck_required";
}
```

문장 수정이 claim의 의미나 강도를 바꾸면 자동으로 근거 재검사를 실행한다.

### 5.5 Mathematical Co-worker Engine

Mathematical Co-worker는 수식을 생성해주는 버튼이 아니라, 프로젝트의 수학적 언어를 계속 이해하고 동료 연구자처럼 이상 징후와 개선점을 먼저 제안하는 계층이다.

핵심 역할:

- 수식의 구조를 Math AST로 파싱
- 기호, 첨자, 함수, 집합과 연산자의 정의 위치 추적
- section 간 표기법과 shape/domain 일관성 검사
- 수식과 바로 앞뒤 자연어 설명의 의미 일치 검사
- 컴파일은 되지만 의미적으로 의심스러운 표현 탐지
- 사용자가 선택한 수식의 설명, 수정, 전개와 LaTeX patch 제안

#### 수식 컨텍스트 모델

각 수식은 문자열 하나가 아니라 다음 문맥과 함께 관리한다.

```ts
interface EquationContext {
  equationId: string;
  latex: string;
  location: SourceRange;
  symbols: SymbolUse[];
  precedingText: string;
  followingText: string;
  referencedDefinitions: string[];
  relatedEquations: string[];
  assumptions: string[];
}

interface SymbolDefinition {
  id: string;
  latex: string;
  canonicalName?: string;
  kind: "scalar" | "vector" | "matrix" | "tensor" | "set" | "function" | "operator";
  shape?: string;
  domain?: string;
  unit?: string;
  definitionLocation: SourceRange;
}
```

#### 선제적으로 탐지할 문제

결정적으로 확인 가능한 항목:

- 정의되지 않은 기호 또는 정의 전 사용
- 같은 기호가 다른 의미로 재사용됨
- bold/vector/matrix 표기가 section마다 달라짐
- 첨자 범위나 summation index가 누락됨
- 식의 좌변과 우변 shape가 맞지 않을 가능성
- 단위 또는 차원이 불일치함
- 함수의 입력/출력 domain이 기존 정의와 다름
- equation label, ref 또는 numbering 오류
- 본문의 “최소화한다”와 수식의 `\max`처럼 설명과 연산이 충돌함
- 본문에서 언급한 항이 실제 수식에 없음

AI 판단이 필요한 항목:

- 갑자기 등장한 항이나 설명되지 않은 regularizer
- 지나치게 복잡한 표기 또는 불필요하게 중복된 정의
- 논문의 기존 관례보다 어색한 변수명
- 전개 단계가 생략되어 독자가 따라가기 어려운 구간
- 조건, expectation 대상 또는 확률분포가 모호한 표현
- 경계 조건과 특수 케이스가 설명되지 않은 수식
- 부호, 계수, 괄호 위치가 주변 유도 과정과 달라 보이는 경우
- 정리의 statement와 proof sketch가 맞지 않을 가능성

AI 기반 항목은 오류로 단정하지 않고 `suggestion` 또는 `needs_review`로 표시한다.

#### 제안 형식

모든 선제 제안에는 왜 제안했는지와 영향 범위를 표시한다.

```ts
interface MathSuggestion {
  severity: "error" | "warning" | "suggestion";
  category: "notation" | "dimension" | "definition" | "derivation" | "text_equation_mismatch";
  message: string;
  rationale: string;
  relatedLocations: SourceRange[];
  proposedPatch?: ProposedPatch;
  validation?: {
    compilePassed: boolean;
    symbolicCheck?: "equivalent" | "not_equivalent" | "inconclusive";
    numericalCheck?: "passed" | "failed" | "not_run";
  };
}
```

예시:

```text
Suggestion
Equation (4)에서는 z를 벡터로 정의했지만 이 식에서 일반 이탤릭 z를 사용했습니다.

Possible fix
z → \mathbf{z}

Affected locations
Equation (4), Equation (7), Methods 2문단
```

```text
Needs review
본문은 L_rec을 최소화한다고 설명하지만 Equation (9)에서는 양의 계수로
최종 objective에 더하고 있습니다. 부호가 의도된 것인지 확인이 필요합니다.

이 제안은 오류를 확정하지 않으며 자동 적용되지 않습니다.
```

#### 수식 편집 동작

사용자는 수식 위에서 다음 작업을 바로 실행할 수 있다.

- Explain: 기호와 항별 의미 설명
- Simplify notation: 의미를 유지하며 표기 단순화
- Expand derivation: 생략된 중간 전개 제안
- Check dimensions: shape/unit 검사
- Check consistency: 논문 전체 정의와 비교
- Test numerically: 샘플 값을 사용한 sanity check
- Convert: 자연어/이미지/MathML을 LaTeX로 변환
- Rename symbol: 정의, 사용처와 본문 설명을 함께 변경
- Suggest explanation: 수식 전후에 필요한 해설 문장 제안

수식 변경은 항상 rendered before/after, source diff와 영향받는 참조 위치를 함께 보여준다.

#### 검증 수준

검증은 비용과 확실성에 따라 단계적으로 실행한다.

```text
Level 1: LaTeX parse + compile
Level 2: symbol/definition/shape 규칙
Level 3: 본문과 수식 의미 비교
Level 4: 선택적 symbolic equivalence
Level 5: 선택적 numerical sanity check
```

MVP는 Level 1~3을 구현한다. SymPy 같은 CAS를 이용한 Level 4~5는 지원 가능한 수식 범위가 제한적이므로 후속 버전에서 opt-in으로 추가한다.

#### 동료처럼 행동하기 위한 개입 원칙

- 입력 중 매 순간 팝업을 띄우지 않는다.
- 결정적 오류는 editor diagnostic으로 즉시 표시한다.
- 의미적 의심은 사용자가 문단을 마치거나 compile한 뒤 조용히 제안한다.
- 동일 유형 제안을 반복하지 않고 묶어서 보여준다.
- 사용자가 무시한 표기 관례는 프로젝트 규칙으로 학습한다.
- 오류 가능성이 낮은 의견은 `idea`로 분리한다.
- 사용자 승인 없이 수식이나 주변 본문을 변경하지 않는다.
- 형식적 증명이 없는 경우 “동치”, “정확함”, “증명됨”이라고 단정하지 않는다.

### 5.6 Reproducibility Engine

MVP 이후 도입한다.

- 표/그림과 결과 파일 연결
- 결과 파일과 생성 스크립트 연결
- Git commit 및 dataset version 기록
- 원고의 수치와 결과 파일의 수치 비교
- 변경된 결과가 초록/본문/결론에 미치는 영향 탐지

초기에는 CSV/JSON 결과와 LaTeX table의 명시적 mapping만 지원한다.

### 5.7 Agent Runtime

Agent Runtime은 AI에게 자유로운 파일 시스템 접근을 주지 않는다. 타입이 정의된 도구만 제공한다.

초기 도구:

```text
read_project_map
read_section
search_project
list_references
read_source_passage
find_claims
inspect_claim_evidence
propose_latex_patch
compile_project
inspect_compile_errors
run_paper_checks
inspect_equation_context
check_symbol_consistency
check_equation_dimensions
propose_equation_patch
```

모든 실행은 다음 상태를 따른다.

```text
requested
  → planned
  → awaiting_plan_approval (선택)
  → running
  → patch_ready
  → validating
  → awaiting_patch_approval
  → applied | rejected | failed
```

---

## 6. 주요 사용자 경험

### 6.1 프로젝트 열기

1. 사용자가 로컬 폴더를 연다.
2. 앱이 main document, include 관계와 bibliography를 탐지한다.
3. 기존 명령 또는 기본 설정으로 첫 컴파일을 실행한다.
4. Paper Model을 생성한다.
5. 선택적으로 source PDF 폴더를 등록한다.

성공 기준:

- 기존 Git 저장소 구조를 변경하지 않는다.
- 사용자가 3분 안에 원고와 PDF preview를 볼 수 있다.
- 실패 시 실제 compiler log와 해결 가능한 오류를 구분해 보여준다.

### 6.2 근거 기반 문단 작성

1. 사용자가 section과 작성 목적을 선택한다.
2. AI가 사용 가능한 source를 검색한다.
3. 관련 passage와 claim 후보를 Evidence Cards로 제시한다.
4. 사용자가 사용할 근거를 선택한다.
5. AI가 paragraph outline을 제시한다.
6. 승인 후 LaTeX patch를 생성한다.
7. citation entailment, style, compile 검사를 실행한다.
8. 사용자가 diff를 승인한다.

### 6.3 논문 전체 리뷰

검사 우선순위:

```text
Critical: 근거 없는 핵심 claim, 모순, 잘못된 수치
Major: 논증 연결 누락, 과도한 결론, 핵심 비교 누락
Minor: 문체, 반복, 용어 불일치, formatting
```

각 진단은 다음을 포함한다.

- 문제 위치
- 문제 유형
- 판단 근거
- 영향받는 다른 section
- 수정 제안
- 자동 수정 가능 여부

### 6.4 수식 작성과 선제 제안

1. 사용자가 equation을 작성하거나 기존 수식을 수정한다.
2. 앱은 LaTeX compile과 함께 기호 정의, shape, domain과 주변 설명을 확인한다.
3. 확실한 문제는 inline diagnostic으로 표시한다.
4. 의미적으로 의심스러운 부분은 입력을 방해하지 않는 suggestion inbox에 모은다.
5. 사용자가 제안을 열면 관련 정의, 이전 수식과 판단 이유를 함께 보여준다.
6. 수정안은 수식만이 아니라 필요한 주변 설명과 symbol 사용처를 포함한 patch로 제안한다.
7. 적용 전후 렌더링, source diff와 검증 수준을 보여준다.
8. 승인 후 전체 프로젝트를 다시 컴파일하고 영향받은 수식을 재검사한다.

대표 시나리오:

```text
사용자가 Equation (7)에 새로운 loss term을 추가
  → 새 기호 λ가 정의되지 않았음을 탐지
  → λ의 의미와 범위를 정의할 위치를 제안
  → Methods 설명에도 동일 term을 언급하도록 제안
  → 전체 objective의 minimize/maximize 방향을 재검사
  → diff 승인 후 컴파일
```

### 6.5 Reviewer response

1. reviewer comment를 붙여넣거나 파일로 추가한다.
2. comment를 atomic request로 분해한다.
3. 각 request를 원고 위치, 필요한 분석, 수정 diff와 연결한다.
4. response letter 초안을 만든다.
5. 원고 수정과 답변의 불일치를 검사한다.

이 기능은 MVP 이후 구현한다.

---

## 7. UI 설계

### 7.1 기본 레이아웃

```text
┌──────────────┬──────────────────────────┬───────────────────┐
│ Project      │ Editor / PDF             │ Research Agent    │
│              │                          │                   │
│ Files        │ Source                   │ Task              │
│ Outline      │ Preview                  │ Evidence          │
│ Claims       │ Diff                     │ Checks            │
│ Sources      │                          │ Run history       │
└──────────────┴──────────────────────────┴───────────────────┘
```

### 7.2 핵심 화면

#### Editor

- CodeMirror 기반 LaTeX 편집
- syntax highlighting
- error diagnostics
- cite/ref autocomplete
- source ↔ PDF navigation
- claim evidence 상태를 gutter에 표시
- equation 위에 explain/check/suggest action 제공
- 결정적 수식 오류와 의미적 제안을 시각적으로 구분

#### Evidence Card

- claim
- source title
- page 및 passage
- support status
- limitation/context
- 원문 PDF 열기

#### Argument Map

- 초기에는 복잡한 자유 배치 그래프보다 계층형 outline을 사용
- 노드별 연결 누락과 진단 표시
- 클릭 시 관련 원고 위치로 이동

#### Diff Review

- 파일별 patch
- 변경 이유
- 사용된 근거
- claim 의미 변화 여부
- compile/check 결과
- 전체 승인 또는 hunk별 승인

#### Diagnostics

- severity와 category로 필터
- 동일 문제 묶기
- false positive 처리
- suppress 사유 기록

#### Equation Inspector

- rendered equation과 LaTeX source 동시 표시
- 사용된 기호와 정의 위치
- 추론된 shape/domain/unit
- 관련 수식과 본문 설명
- notation, derivation, consistency 제안
- before/after render와 source diff

### 7.3 UX에서 피해야 할 것

- 항상 열려 있는 범용 채팅창에 모든 기능을 몰아넣기
- AI가 긴 답변을 출력한 뒤 사용자가 수동 복사하게 하기
- 지원 점수를 근거 없이 퍼센트로 표시하기
- 자동 생성 문헌을 검증 없이 `.bib`에 추가하기
- 자동 수정과 실제 적용을 같은 버튼으로 처리하기
- 초기 버전부터 자유로운 canvas UI를 구현하기

---

## 8. 기술 아키텍처

### 8.1 권장 스택

초기 생산성을 기준으로 다음을 권장한다.

| 영역 | 선택 | 이유 |
|---|---|---|
| Desktop shell | Electron | 로컬 파일, compiler process, 배포를 TypeScript 중심으로 빠르게 구현 |
| UI | React + TypeScript | 생태계와 기여자 접근성 |
| Build | Vite | 단순한 개발 환경 |
| Editor | CodeMirror 6 | 확장성과 비교적 작은 번들 |
| PDF | PDF.js | 페이지 렌더링과 텍스트 위치 활용 |
| State | Zustand 또는 React state | 초기 상태 관리 최소화 |
| Storage | SQLite | claims, sources, runs, FTS 검색 |
| LaTeX | latexmk 우선, Tectonic fallback | 기존 프로젝트 호환성과 간편한 기본값 균형 |
| Parsing | LaTeX parser + 보수적 fallback | section/cite/ref 구조 추출 |
| Math model | Math AST + project symbol table | 수식 구조와 기호 정의/사용 추적 |
| AI provider | OpenAI-compatible adapter | 초기 구현 범위 축소 |
| Validation | Zod/JSON Schema | agent tool 입력과 구조화 출력 검증 |
| Test | Vitest + Playwright | unit/integration/E2E |

Tauri는 앱이 검증된 뒤 패키지 크기와 보안을 최적화할 때 재평가한다. 초기부터 Rust와 TypeScript 경계를 운영하지 않는다.

### 8.2 프로세스 경계

```text
Renderer
  - Editor, PDF, Claims, Diff UI
        │ typed IPC
Main Process
  - Project access
  - SQLite
  - AI orchestration
  - Compiler runner
        │ restricted process execution
LaTeX Worker
  - latexmk / tectonic
  - timeout / resource limits
```

Renderer에서 직접 파일 시스템, API key 또는 shell에 접근하지 않는다.

### 8.3 컴파일 전략

초기 지원 순서:

1. 프로젝트에 기존 compile command가 있으면 사용자가 명시적으로 등록
2. `latexmk`가 있으면 `latexmk -pdf`
3. 없으면 Tectonic 사용 안내

보안 규칙:

- shell escape 기본 비활성화
- 명령 allowlist
- 프로젝트 디렉터리를 working directory로 고정
- timeout 적용
- 환경 변수 최소 전달
- 민감 환경 변수 제거
- 출력 크기 제한

클라우드 또는 다중 사용자 컴파일은 별도 sandbox 설계 전에는 지원하지 않는다.

### 8.4 저장 구조

```text
paper-project/
  main.tex
  sections/
  figures/
  references.bib
  sources/                 # 선택, 사용자가 관리
  .paper/
    project.json
    index.sqlite           # 기본 gitignore 권장
    claims.json            # 공유 가능한 경우 선택
    argument.json          # 공유 가능한 경우 선택
    styles/
    runs/                  # 민감정보 제거된 실행 기록
```

`.paper/` 사용 여부는 프로젝트별로 선택할 수 있다. 캐시와 API 관련 설정은 사용자 app data 영역에 둔다.

### 8.5 주요 데이터 모델

```ts
interface Claim {
  id: string;
  text: string;
  kind: "factual" | "interpretation" | "hypothesis" | "project_result";
  location: SourceRange;
  role?: ArgumentRole;
  evidenceLinks: EvidenceLink[];
  status: EvidenceStatus;
  updatedAt: string;
}

interface EvidenceLink {
  sourceId: string;
  page?: number;
  passage: string;
  relation: "supports" | "partially_supports" | "contradicts" | "context";
  limitations?: string[];
  assessmentRunId: string;
}

interface ArgumentNode {
  id: string;
  type: ArgumentNodeType;
  summary: string;
  claimIds: string[];
  locationIds: string[];
}

interface AgentRun {
  id: string;
  taskType: string;
  inputScope: string[];
  sourceIds: string[];
  toolCalls: ToolCallRecord[];
  patchId?: string;
  checks: CheckResult[];
  status: RunStatus;
}
```

### 8.6 Parser 전략

LaTeX 전체 문법을 처음부터 완전히 해석하지 않는다.

단계별 처리:

1. 파일 포함 관계와 main document 탐지
2. section, cite, label, ref, figure, table, equation 추출
3. source range 보존
4. 파서 실패 영역은 opaque block으로 유지
5. 원문 보존형 patch 적용

AST 전체를 재출력해 사용자의 formatting을 바꾸지 않는다. 가능한 한 텍스트 범위 기반 patch를 사용한다.

---

## 9. AI 및 할루시네이션 방지 설계

### 9.1 생성 정책

문장을 다음 세 종류로 구분한다.

1. 외부 사실: 문헌 근거 필요
2. 프로젝트 결과: 프로젝트 artifact 근거 필요
3. 저자의 해석/가설: 명시적 표현과 사용자 승인 필요

AI가 사실성 문장을 제안할 때 EvidenceLink가 없으면 기본적으로 원고 적용을 차단한다. 사용자는 명시적으로 `author assertion`으로 전환할 수 있다.

### 9.2 Citation verification pipeline

```text
Claim extraction
  → cited source resolution
  → source passage retrieval
  → entailment assessment
  → scope/condition comparison
  → contradiction search within library
  → status + explanation
```

검사 시 title과 abstract만 확보된 문헌은 `full_text_unavailable`로 표시한다. abstract만으로 본문의 상세 실험 결과를 검증하지 않는다.

### 9.3 문헌 추가 정책

- DOI, OpenAlex ID 또는 사용자가 제공한 PDF 중 하나를 요구
- bibliographic metadata를 모델이 자유 생성하지 않음
- source API나 원본 PDF에서 metadata 추출
- 불확실한 필드는 빈 값과 경고로 유지
- 중복 문헌과 cite key 충돌 검사

### 9.4 모델 출력 신뢰 경계

모델은 다음을 제안할 수 있지만 확정하지 않는다.

- claim 분해
- evidence 관계
- argument role
- rewrite
- review finding

확정은 schema validation, deterministic checks, source 확인, 사용자 승인을 거친다.

### 9.5 프롬프트 인젝션 방어

PDF와 웹에서 추출한 텍스트는 신뢰할 수 없는 데이터로 취급한다.

- source text 내부 지시를 실행하지 않음
- 도구 권한을 system policy로 제한
- source content와 tool instruction 채널을 분리
- 외부 문서가 요청한 URL이나 명령을 자동 실행하지 않음
- 모델이 읽은 source 목록을 실행 기록에 남김

### 9.6 불확실성 표현

숫자 하나의 confidence score보다 설명 가능한 상태를 우선한다.

```text
Supported: source passage가 claim과 조건까지 일치
Partially supported: 방향은 일치하지만 범위가 더 좁음
Unsupported: 직접 근거를 찾지 못함
Contradicted: 등록된 source와 충돌
Not checked: 원문 미확보 또는 파싱 실패
```

---

## 10. Paper Linter 규칙

### 10.1 MVP 규칙

#### Deterministic

- undefined label/ref
- unused label
- missing bibliography entry
- duplicate cite key
- undefined acronym 후보
- terminology variant
- abstract와 body 사이 숫자 불일치 후보
- figure/table이 본문에서 참조되지 않음
- 컴파일 warning/error
- undefined mathematical symbol
- symbol defined after first use
- symbol kind/shape inconsistency
- inconsistent vector/matrix notation
- summation index 또는 bound 누락 후보
- equation과 본문 사이 명백한 연산 불일치

#### AI-assisted

- unsupported factual claim
- citation does not support claim
- claim scope exceeds evidence
- introduction contribution not evaluated
- conclusion overstates result
- paragraph lacks clear role
- repeated motivation or claim
- missing limitation 후보
- unexplained equation term
- ambiguous expectation/distribution scope
- suspicious sign or coefficient
- missing derivation step
- equation-text semantic mismatch

### 10.2 규칙 결과 형식

```ts
interface CheckResult {
  ruleId: string;
  severity: "critical" | "major" | "minor" | "info";
  location: SourceRange;
  message: string;
  rationale: string;
  relatedLocations?: SourceRange[];
  evidenceLinks?: EvidenceLink[];
  fix?: ProposedPatch;
}
```

### 10.3 False positive 관리

- 진단별 dismiss 가능
- dismiss 사유 선택 또는 입력
- 동일 텍스트/claim ID에 대한 suppress 저장
- 사용자 dismiss를 평가 데이터로 익명 전송하지 않음
- opt-in telemetry 도입 전에는 로컬에만 저장

---

## 11. Style System

### 11.1 Author Style Profile

초기에는 모델 fine-tuning 없이 예시와 명시 규칙을 사용한다.

- 사용자가 승인한 샘플 문단
- 피해야 할 표현
- 선호 용어
- 문장 길이 범위
- 능동/수동태 선호
- claim 강도
- 영국식/미국식 영어

스타일 프로필은 사람이 읽고 편집할 수 있는 Markdown 또는 JSON으로 저장한다.

### 11.2 Venue Profile

초기 제공:

- generic CS conference
- ACL-style writing guidance
- NeurIPS/ICML-style empirical paper
- thesis

템플릿의 저작권과 학회 정책을 확인하고, 규칙 자체와 공식 템플릿 파일을 분리한다.

### 11.3 Rewrite 검증

rewrite 전후에 다음을 비교한다.

- 수치
- citation
- negation
- modality: may/can/will
- causal language
- 조건과 범위
- technical term
- 수식 및 command

의미 변화가 감지되면 단순 style fix가 아니라 substantive change로 표시한다.

---

## 12. 오픈소스 전략

### 12.1 라이선스

신규 구현이라면 Apache-2.0을 기본 후보로 한다.

- 연구실과 기업이 채택하기 쉽다.
- 특허 조항이 명확하다.
- 플러그인 생태계 형성에 유리하다.

AGPL 코드를 직접 가져오면 전체 배포 조건이 달라질 수 있으므로, Overleaf 또는 TeXlyre 코드 사용 전 라이선스 검토가 필요하다. 초기에는 UI 아이디어와 공개 인터페이스만 참고하고 코드는 독립 구현한다.

### 12.2 저장소 공개 구성

```text
README.md
LICENSE
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
docs/
  architecture.md
  evidence-model.md
  agent-tools.md
  threat-model.md
examples/
  minimal-paper/
  evidence-demo/
```

### 12.3 기여 단위

외부 기여자가 쉽게 참여할 영역:

- linter rule
- venue profile
- LaTeX parser fixture
- provider adapter
- literature metadata adapter
- sample/evaluation paper
- UI localization

플러그인 런타임은 v1 전에는 만들지 않는다. 먼저 내부 패키지 경계를 안정화한다.

---

## 13. 개발 단계와 일정

1~3명의 핵심 개발자를 기준으로 한 14주 계획이다. 한 명이 개발할 경우 20~24주를 예상한다.

### Phase 0 — 기술 검증 및 제품 스파이크 (1~2주)

목표: 가장 위험한 기술 문제를 먼저 확인한다.

작업:

- Electron에서 로컬 프로젝트 열기
- CodeMirror로 `.tex` 편집
- `latexmk` 실행 및 PDF.js preview
- compile error를 source line으로 연결
- 작은 샘플 프로젝트에서 section/cite/ref 추출
- AI가 한 파일에 patch를 제안하고 적용 전 diff 표시
- PDF 한 편에서 page-aware passage 추출
- equation 하나에서 기호를 추출하고 주변 본문과 함께 표시

종료 기준:

- 샘플 논문을 열고 수정·컴파일·preview 가능
- AI patch가 원본 formatting을 불필요하게 변경하지 않음
- PDF passage가 페이지 번호와 함께 표시됨
- 수식 변경의 rendered before/after와 source diff를 함께 표시 가능
- 주요 기술 리스크와 대체안 기록

### Phase 1 — Local LaTeX Workspace (3~4주)

목표: AI 없이도 사용할 수 있는 최소 편집 환경을 만든다.

작업:

- 프로젝트 열기 및 최근 프로젝트
- file tree
- main document 설정
- editor tabs
- PDF preview
- compile command 설정
- source ↔ PDF 이동
- compile diagnostics
- 안전한 파일 저장과 외부 변경 감지
- 기본 설정 및 API key 안전 저장

종료 기준:

- 실제 공개 LaTeX 프로젝트 10개 중 8개 이상을 설정 후 컴파일
- 앱 crash 없이 외부 Git 변경을 감지
- shell escape가 기본 비활성화

### Phase 2 — Paper Model & Safe Agent Editing (3주)

목표: 프로젝트 전체를 읽고 통제된 diff를 만드는 AI 편집을 제공한다.

작업:

- include 관계와 section index
- cite/ref/figure/table/equation index
- project symbol table과 symbol definition/use index
- equation context와 주변 설명 연결
- project search
- agent tool schema
- task panel
- 계획과 참조 파일 표시
- multi-file patch format
- hunk별 diff 승인
- patch 후 자동 compile
- agent run history

종료 기준:

- “Methods의 용어를 전체 프로젝트에서 통일” 작업 수행
- patch 적용 실패 시 원본 보존
- 어떤 파일과 source를 읽었는지 확인 가능
- compile 실패 patch는 명확히 경고
- 프로젝트 전체 symbol rename이 정의와 사용처를 제한된 patch로 제안 가능

### Phase 3 — Claim Ledger & Evidence Engine (3주)

목표: 주장과 근거를 연결하고 unsupported claim을 가시화한다.

작업:

- source PDF 등록
- PDF text/page extraction
- bibliography와 PDF 연결
- claim extraction
- Evidence Card
- claim ↔ passage 연결
- evidence status
- citation entailment check
- 근거 기반 paragraph draft
- source 미확보와 검증 실패 상태

종료 기준:

- 사용자가 claim에서 원문 PDF passage로 이동 가능
- 존재하지 않는 citation metadata를 AI가 임의 생성하지 않음
- full text 미확보 상태가 명확히 표시됨
- 평가 세트에서 unsupported claim 탐지 성능 측정 가능

### Phase 4 — Argument Map & Paper Linter (2주)

목표: 논문 전체 구조와 일관성을 검사한다.

작업:

- argument node 초안 생성
- outline 기반 Argument Map UI
- contribution ↔ experiment ↔ result 연결
- deterministic linter rules
- AI-assisted linter rules
- severity, dismiss, suppress
- 전체 리뷰 보고서
- 수식 symbol/notation/definition deterministic checks
- equation-text mismatch와 unexplained term 선제 제안
- Equation Inspector

종료 기준:

- 핵심 기여와 실험 연결 누락을 표시
- 초록/본문 숫자 불일치 후보 탐지
- 각 AI 진단에 rationale과 관련 위치 제공
- false positive를 개별 dismiss 가능
- 수식 제안마다 판단 근거와 관련 정의 위치 제공

### Phase 5 — Writing Style & Alpha Release (2주)

목표: 문체 보존 rewrite와 오픈소스 alpha를 공개한다.

작업:

- author style profile
- generic venue profiles
- rewrite modes
- semantic change detector
- onboarding과 example project
- 설치 패키지
- privacy/security 문서
- contributor documentation
- crash report와 telemetry는 opt-in으로만 제공

종료 기준:

- macOS alpha 설치 가능
- 신규 사용자가 예제 프로젝트에서 10분 안에 첫 evidence-grounded patch 수행
- 핵심 workflow E2E 테스트 통과
- 알려진 제약과 데이터 처리 방식을 README에 공개

---

## 14. MVP 범위

### 반드시 포함

- macOS 우선 desktop app
- 로컬 폴더 기반 LaTeX 프로젝트
- `.tex` 편집 및 PDF preview
- `latexmk` 컴파일
- 프로젝트 구조 색인
- source PDF 등록과 page-aware text
- claim extraction 및 Evidence Card
- 근거 상태
- AI patch와 diff 승인
- 핵심 Paper Linter 규칙
- 저자 스타일 기반 rewrite
- 수식 explain/check/edit와 프로젝트 symbol 일관성 검사
- 입력을 방해하지 않는 선제적 math suggestion inbox
- OpenAI-compatible API 설정
- Yjs 기반 secret link 공동 편집, presence와 remote cursor
- 선택형 이메일 로그인과 사용자 소유 프로젝트 수동 스냅샷
- 인증된 Vercel AI Gateway review와 기본 운영 지표

### 명시적으로 제외

- 조직·팀 관리
- 자동 동기화 및 서버 기반 공동 편집 영속화
- 세분화된 owner/editor/commenter/viewer 권한
- 모바일 앱
- WYSIWYG editor
- 자체 모델 학습
- 모든 학문 분야 최적화
- 자동 논문 제출
- Zotero 양방향 동기화
- 브라우저 확장
- 플러그인 marketplace
- 완전 자동 reviewer response

---

## 15. 초기 백로그

### Epic A — Workspace

- [ ] Electron/Vite/React scaffold
- [ ] secure IPC baseline
- [ ] open local folder
- [ ] file tree and editor tabs
- [ ] file save and external change handling
- [ ] project settings

### Epic B — LaTeX

- [ ] main document detection
- [ ] compile runner
- [ ] compile log parser
- [ ] PDF preview
- [ ] SyncTeX navigation
- [ ] section/cite/ref index

### Epic C — Safe AI Editing

- [ ] provider interface
- [ ] encrypted API key storage
- [ ] agent tool schemas
- [ ] task/run state machine
- [ ] patch parser and validator
- [ ] diff review
- [ ] post-patch compile check

### Epic D — Sources and Evidence

- [ ] source PDF import
- [ ] page-aware text extraction
- [ ] bibliography/source resolution
- [ ] claim extraction
- [ ] Evidence Card UI
- [ ] claim/source linking
- [ ] citation support assessment

### Epic E — Argument and Lint

- [ ] argument node model
- [ ] argument outline UI
- [ ] deterministic checks
- [ ] AI-assisted checks
- [ ] diagnostic list and navigation
- [ ] dismiss/suppress workflow

### Epic F — Mathematical Co-worker

- [ ] equation Math AST prototype
- [ ] project symbol table
- [ ] symbol definition/use navigation
- [ ] notation and definition checks
- [ ] equation-text context builder
- [ ] proactive math suggestion inbox
- [ ] Equation Inspector
- [ ] equation patch before/after render

### Epic G — Writing

- [ ] author style schema
- [ ] style profile editor
- [ ] rewrite modes
- [ ] before/after semantic checks
- [ ] venue profile baseline

### Epic H — Release

- [ ] example projects
- [ ] onboarding
- [ ] privacy and threat model
- [ ] packaging and update strategy
- [ ] contribution guide
- [ ] alpha feedback template

---

## 16. 테스트 및 평가 계획

### 16.1 일반 소프트웨어 테스트

- parser unit test: 실제 LaTeX fixture
- patch property test: 적용 전후 의도하지 않은 변경 탐지
- compiler integration test
- SQLite migration test
- IPC permission test
- E2E: open → edit → compile → AI patch → approve

### 16.2 AI 평가 세트

작고 검토 가능한 공개 평가 세트를 저장소에 포함한다.

#### Citation support set

- supported claim
- partially supported claim
- unsupported claim
- contradicted claim
- 조건이 누락된 claim
- 수치가 미세하게 다른 claim

측정:

- unsupported detection recall
- supported precision
- abstention rate
- source passage correctness
- fabricated citation count: 목표 0

#### Rewrite preservation set

측정:

- 숫자 보존
- citation 보존
- negation 보존
- 조건/범위 보존
- claim strength 변화 탐지
- 사람 평가: clarity, style fit

#### Argument consistency set

- contribution 미검증
- hypothesis/experiment 불일치
- abstract/body 숫자 불일치
- result보다 강한 conclusion
- 누락된 limitation

#### Mathematical co-worker set

- 정의되지 않은 기호
- 동일 기호의 의미 충돌
- vector/matrix 표기 불일치
- shape 또는 단위가 맞지 않는 식
- sum/expectation scope가 모호한 식
- 본문 설명과 수식의 minimize/maximize 불일치
- 올바른 수식이지만 보기 드문 표기를 사용한 경우
- 의도적으로 생략된 derivation과 실제 누락을 구분해야 하는 경우

측정:

- deterministic math issue detection
- semantic suggestion precision
- false interruption rate
- 잘못된 자동 확정 수: 목표 0
- equation patch 후 compile success rate
- 수식 수정 전후 의미 변화 탐지율

### 16.3 Release gate

alpha 공개 전 최소 기준:

- fabricated citation 평가 0건
- patch 실패 시 데이터 손실 0건
- API key가 log/run history에 기록되지 않음
- critical security test 통과
- compile 성공 프로젝트에서 AI patch 후 compile 회귀율 측정
- unsupported 상태를 supported로 오판한 사례를 수동 검토

정확도 목표는 평가 세트를 만든 뒤 baseline을 측정하고 설정한다. 근거 없이 높은 숫자 목표를 먼저 선언하지 않는다.

---

## 17. 보안과 개인정보

### 17.1 기본 정책

- 프로젝트 데이터는 로컬 저장
- 외부 모델에 전송되는 범위를 실행 전에 표시
- 선택한 section/source만 전송 가능
- API key는 OS credential storage 사용
- prompt/run log에서 secret 제거
- telemetry 기본 비활성화

### 17.2 Threat model 우선순위

- 악성 LaTeX compile command
- shell escape
- 외부 PDF의 prompt injection
- path traversal patch
- symlink를 통한 프로젝트 밖 파일 접근
- renderer compromise에서 API key 접근
- 민감 논문 원문의 의도하지 않은 외부 전송

### 17.3 향후 self-host

다중 사용자 서버는 compiler sandbox, tenant isolation, encrypted storage가 준비되기 전에는 제공하지 않는다. 데스크톱 제품과 별도 프로젝트로 다룬다.

---

## 18. 성공 지표

### 18.1 제품 지표

- Time to first successful compile
- Time to first accepted AI patch
- AI patch acceptance rate
- patch 후 compile success rate
- claim 중 evidence status가 확인된 비율
- critical diagnostic 해결률
- 사용자가 되돌린 AI 변경 비율
- 선제적 math suggestion 열람·수락·dismiss 비율
- 수식 suggestion으로 방해받았다고 평가한 비율

### 18.2 품질 지표

- fabricated citation count
- incorrect support 판정률
- rewrite 의미 변경 탐지율
- argument check false positive율
- mathematical suggestion precision과 false interruption rate
- compile/data-loss regression

### 18.3 오픈소스 지표

- 설치 후 example workflow 완료율
- 재현 가능한 bug report 비율
- 외부 linter rule/fixture 기여 수
- 첫 contribution까지 걸리는 시간

GitHub star 수를 핵심 제품 품질 지표로 사용하지 않는다.

---

## 19. 주요 위험과 대응

| 위험 | 영향 | 대응 |
|---|---|---|
| Citation entailment가 불안정 | 잘못된 신뢰 제공 | 상태+근거 passage 표시, abstention, 평가 세트 운영 |
| LaTeX 문법 다양성 | 파싱과 patch 실패 | 원문 보존형 patch, opaque block, fixture 확대 |
| scope가 빠르게 커짐 | 출시 지연 | 개인 스냅샷까지만 허용하고 조직·협업 서버·WYSIWYG 제외 |
| LLM 비용과 latency | 사용성 저하 | 범위 기반 context, cache, 작은 모델/큰 모델 역할 분리 |
| 저작권 있는 PDF 처리 | 배포·공유 문제 | 로컬 처리, PDF 자체를 서버/저장소에 업로드하지 않음 |
| 기존 도구와 차별성 약화 | 채택 실패 | Claim Ledger와 Argument Map을 첫 화면의 중심에 배치 |
| AI review false positive | 신뢰 하락 | rationale, 관련 위치, dismiss feedback 제공 |
| 컴파일 보안 | 로컬 또는 서버 침해 | shell escape off, 제한된 worker, 서버 컴파일 연기 |

---

## 20. 의사결정 기록

### 결정 1: 새 편집기를 처음부터 전부 만들지 않는다

CodeMirror, PDF.js, 기존 LaTeX compiler를 조합한다. 제품의 고유 개발 역량은 Evidence/Argument/Mathematical Co-worker/Agent 계층에 사용한다.

### 결정 2: 개인 클라우드는 얇게, 서버 기반 팀 권한은 MVP에서 제외한다

Yjs/WebRTC를 이용한 링크 기반 공동 편집은 MVP에 포함한다. Supabase Marketplace를 통한 이메일 로그인과 RLS 개인 스냅샷은 선택형으로 제공한다. 조직 권한, audit log와 collaboration server 영속화는 핵심 편집 경험이 검증된 뒤 추가한다.

### 결정 3: 벡터 데이터베이스를 필수 구성요소로 두지 않는다

SQLite FTS와 구조적 검색으로 시작한다. 문헌 수와 retrieval 품질 요구가 확인된 뒤 embedding index를 추가한다.

### 결정 4: multi-agent UI를 전면에 내세우지 않는다

사용자에게 여러 agent persona를 보여주는 대신 Task, Evidence, Check, Patch라는 결과 중심 UI를 제공한다.

### 결정 5: AI 생성보다 검증을 제품의 중심으로 둔다

초안 생성은 쉽게 복제되지만, claim provenance와 논증 일관성은 프로젝트가 축적될수록 가치가 커진다.

---

## 21. 첫 2주 실행 계획

### Week 1

1. 저장소와 기본 라이선스 생성
2. Electron + Vite + React scaffold
3. 로컬 폴더 열기와 파일 트리
4. CodeMirror `.tex` 편집과 안전 저장
5. `latexmk` 실행 PoC
6. PDF.js preview

주간 데모:

> 공개 LaTeX 샘플 프로젝트를 열고 한 문장을 수정한 뒤 PDF를 다시 컴파일한다.

### Week 2

1. compile log에서 파일/라인 추출
2. section/cite/ref 최소 색인
3. PDF source import와 페이지별 텍스트 추출
4. OpenAI-compatible provider PoC
5. 선택 문단 rewrite patch 생성
6. diff 승인 후 compile
7. equation 한 개의 symbol과 주변 본문 context 추출
8. 수식 수정 전후 render와 source diff 표시
9. 기술 검증 결과와 Phase 1 scope 확정

주간 데모:

> 문단과 수식 하나를 선택해 AI 수정안을 생성하고, 변경 이유, 수식 전후 render와 source diff를 검토한 뒤 적용·컴파일한다. 등록한 PDF passage 하나를 근거로 함께 표시한다.

### 2주 후 Go/No-Go 기준

Go:

- 기존 프로젝트를 손상하지 않고 편집·컴파일 가능
- patch를 작은 범위로 안정적으로 적용 가능
- PDF passage의 페이지 위치를 보존 가능
- AI 실행의 입력 범위와 결과를 사용자에게 설명 가능
- 수식 patch가 원래 LaTeX command와 equation reference를 손상하지 않음

재설계 필요:

- patch가 formatting이나 command를 반복적으로 손상
- 컴파일 방식이 대상 프로젝트 대부분과 호환되지 않음
- source passage와 페이지 연결이 안정적이지 않음

---

## 22. v0.1 완료 정의

v0.1은 다음 시나리오가 한 흐름으로 동작할 때 완료된다.

1. 사용자가 기존 LaTeX 프로젝트를 연다.
2. 앱이 구조를 색인하고 PDF를 컴파일한다.
3. 사용자가 참고문헌 PDF를 등록한다.
4. 앱이 원고의 핵심 claim을 추출한다.
5. claim마다 연결된 passage와 support 상태를 확인한다.
6. 사용자가 특정 문단의 논리와 문체 개선을 요청한다.
7. 앱이 관련 수식에서 정의되지 않은 기호와 본문 설명 불일치를 선제적으로 제안한다.
8. AI가 근거, 수식 문맥과 스타일을 고려한 patch를 제안한다.
9. 앱이 claim 의미 변화, 수식 일관성, citation, compile 상태를 검사한다.
10. 사용자가 rendered equation과 source diff를 확인하고 승인한다.
11. 실행 기록에서 사용된 근거와 변경 이유를 다시 확인한다.

이 흐름에 직접 기여하지 않는 기능은 v0.1 이후로 미룬다.

---

## 23. 후속 로드맵

### v0.2

- reviewer response workflow
- Zotero import
- OpenAlex 기반 metadata lookup
- Git commit integration
- 더 많은 venue profile
- Typst 기술 검토
- 제한된 수식 범위의 symbolic equivalence check
- numerical sanity check

### v0.3

- 결과 CSV/JSON과 표 연결
- reproducibility checks
- figure/table consistency
- 로컬 모델 adapter
- Linux/Windows 패키징

### v1.0 후보

- 안정화된 public agent tool protocol
- 연구실 self-host 동기화 옵션
- 공동 리뷰와 comment
- 공유 가능한 Claim Ledger/Argument Map
- 확장 가능한 linter rule SDK

계정 기반 팀 권한과 서버 영속화는 실제 공동 편집 사용량과 보안 요구를 측정한 뒤 Hocuspocus 기반으로 확장한다.

---

## 24. 참고 및 경쟁 환경

- OpenAI Prism: <https://openai.com/ko-KR/prism/>
- OpenPrism: <https://github.com/OpenDCAI/OpenPrism>
- TeXlyre: <https://github.com/TeXlyre/texlyre>
- Overleaf Community Edition: <https://github.com/overleaf/overleaf>
- Typst open-source compiler: <https://typst.app/open-source/>

기존 제품의 3-pane UI나 기능 목록을 복제하는 대신, 이 프로젝트는 Claim Ledger, Argument Map, 검증 가능한 patch와 재현 가능한 AI 실행 기록을 핵심 자산으로 삼는다.

---

## 25. 최종 원칙

제품 결정을 내릴 때 다음 순서를 사용한다.

```text
근거의 정확성
  > 연구자의 통제권
  > 논리적 일관성
  > 원본 파일 호환성
  > 문체 품질
  > 생성 속도
  > 기능 수
```

좋은 결과는 AI가 많은 문장을 작성하는 것이 아니다. 연구자가 더 빠르게 쓰면서도 어떤 문장이 어떤 근거에 기반하고, 어떤 논리로 결론에 도달했는지를 끝까지 설명할 수 있는 상태다.
