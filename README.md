# JSTetoris

Vite, TypeScript, CSS로 만든 브라우저 테트리스입니다. 홀드, 고스트, 다음 블록 5개 미리보기, SRS+ 회전, DAS·ARR·SDF 설정과 모드별 로컬 기록을 제공합니다.

## 실행

Vite 7의 Node.js 요구 범위는 `^20.19.0 || >=22.12.0`입니다. 이번 정리 작업은 Node.js 24.20.0에서 검증했습니다.

```sh
npm ci
npm run dev
```

접속 주소는 Vite가 터미널에 출력합니다. 프로덕션 결과는 `npm run build` 후 `npm run preview`로 확인합니다.

## 게임 모드

| 모드 | 종료 조건 | 기록 기준 |
| --- | --- | --- |
| Marathon | 블록을 더 이상 생성할 수 없을 때 | 높은 점수 |
| 40 Lines | 누적 40줄을 지우면 완주; 그 전에 막히면 게임 오버 | 완주한 게임의 짧은 시간 |
| BLITZ | 2분이 지나거나 블록을 더 이상 생성할 수 없을 때 | 높은 점수 |

모드는 대기 상태나 게임 종료 후에 바꿀 수 있습니다. 진행 중이거나 일시정지 상태에서는 모드 선택이 잠깁니다.

## 조작과 핸들링

| 동작 | 키 |
| --- | --- |
| 좌우 이동 | ← / → |
| 소프트 드롭 | ↓ |
| 하드 드롭 | Space |
| 시계 방향 회전 | ↑ / X |
| 반시계 방향 회전 | Z |
| 180도 회전 | A |
| 홀드 | C / 왼쪽·오른쪽 Shift |
| 시작·재개 | Enter |
| 일시정지·재개 | P |
| 다시 시작 | R |

| 설정 | 기본값 | 범위 | 의미 |
| --- | --- | --- | --- |
| DAS | 165 ms | 0–300 ms | 좌우 키를 누른 뒤 자동 반복이 시작될 때까지의 시간 |
| ARR | 0 ms | 0–100 ms | 좌우 자동 반복 간격. 0이면 벽이나 장애물까지 즉시 이동 |
| SDF | 20 G | 1–40 G | 소프트 드롭 중력. 현재 자연 중력보다 느려지지는 않음 |

설정은 `localStorage`에 저장됩니다. 최고 기록과 상위 20개 리더보드는 모드별로 관리하며, 기존 v1 점수·리더보드는 Marathon 기록으로 읽습니다. 저장소 접근에 실패해도 게임은 계속 실행됩니다.

## 개발 명령

| 명령 | 작업 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run typecheck` | 앱·Vite 설정·테스트 타입 검사 |
| `npm run build` | 타입 검사 후 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm test` | Vitest 테스트 1회 실행 |
| `npm run test:watch` | Vitest 변경 감시 |
| `npm run lint` | ESLint 검사 |
| `npm run format` | Prettier 포맷팅 |
| `npm run rg -- "TODO" src` | 프로젝트에 포함된 ripgrep으로 검색 |
| `npm run build:pdf` | 빌드 후 코드 PDF 생성 |

게임 상태와 규칙은 `src/game/engine.ts`, 입력은 `input.ts`, 화면과 DOM 제어는 `render.ts`, 점수·공격량은 `scoring.ts`, 저장과 정규화는 `storage.ts`에서 관리합니다. 블록 좌표는 엔진의 `pieceCellsFor`를 렌더러와 회전 테스트가 공유합니다.

스타일은 `src/styles/main.css`에서 `variables.css`와 `reset.css`를 가져옵니다. Sass 전처리기는 사용하지 않습니다. 테스트 설정은 앱의 TypeScript 옵션을 상속하고 테스트용 타입과 파일 제외 범위만 조정합니다.

## PDF 코드 리포트

`npm run build:pdf`는 다음 순서로 실행됩니다.

1. 타입 검사와 Vite 빌드
2. `dist` 아래 UTF-8 텍스트 파일을 레포의 Prettier 설정으로 포맷하고 해당 파일에 다시 저장
3. `artifacts/build-report.pdf` 생성

PDF에는 파일 트리, 파일별 바이트 수와 `sha12`, 파일 구분 헤더, 코드 줄 번호, 공백·탭·들여쓰기 표시, 회색조 문법 강조와 괄호 깊이 강조가 포함됩니다.

`sha12`는 선행 들여쓰기를 4칸 기준으로 정규화한 텍스트의 SHA-256 앞 12자리입니다. 원본 파일에 `sha256sum`이나 `certutil -hashfile`을 적용한 값과는 다를 수 있습니다.

기본 폰트는 `assets/fonts/D2CodingLigature-*.ttf`입니다. 폰트를 불러오지 못하면 기본 폰트와 ASCII 기호로 대체합니다. `PDF_FORCE_ASCII=1`로 이 대체 경로를 선택할 수도 있습니다.

UTF-8이 아닌 파일은 `[skip]` 로그와 함께 제외합니다. Prettier가 처리하지 못하는 파일은 `[format-skip]` 경고 후 원문을 사용하며, 출력할 텍스트 파일이 없으면 실패로 종료합니다. VS Code의 사용자 설정은 읽지 않습니다.

## 최근 정리와 검증

Ponytail audit의 9개 항목을 적용했습니다. 문서와 lockfile을 제외한 코드·스타일·테스트·설정은 순수 269줄 줄었으며, 직접 개발 의존성 `sass`와 관련 lockfile 패키지 항목 26개를 제거했습니다.

[GitHub Actions 검증](https://github.com/HIX4123/jstetoris/actions/runs/34612969501)에서 테스트 47개, ESLint, 앱·설정·테스트 타입 검사, 프로덕션 빌드와 PDF 생성이 통과했습니다. 상세 변경 내용과 검증 범위는 [Ponytail audit 적용 결과](jstetoris-ponytail-audit.md)에 정리했습니다.
