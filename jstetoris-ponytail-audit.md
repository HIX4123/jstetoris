# JSTetoris Ponytail audit 적용 결과

기준 커밋은 [434086d](https://github.com/HIX4123/jstetoris/commit/434086d2193cb443672c5eaea3868474b495fa56)이며, 적용일은 2026-09-11입니다. 이번 문서는 최초 audit의 삭제 제안을 실제 적용 결과로 다시 작성한 것입니다.

문서와 lockfile을 제외한 코드·스타일·테스트·설정은 **순수 269줄 감소**했습니다. 직접 개발 의존성은 17개에서 16개로 줄었고, `sass` 제거에 따라 lockfile의 패키지 항목 26개와 473줄을 제거했습니다. CSS 파일 이름 변경은 내용의 이동으로 계산했습니다.

## 적용 내역

| 항목 | 실제 변경 | 관련 파일 |
| --- | --- | --- |
| `shrink:` 블록 좌표 중복 | `pieceCellsFor`를 내보내 미리보기와 회전 테스트에서 공유. O 미리보기는 기존처럼 y + 1 보정 | [engine.ts](src/game/engine.ts), [render.ts](src/game/render.ts), [srsPlus.test.ts](src/game/rotation/srsPlus.test.ts) |
| `native:` Sass 전처리 | 미사용 믹스인 삭제, 사용 중인 스타일 3개를 CSS로 변경, 두 `@use`를 `@import`로 대체, 미사용 색상 변수 삭제 | [main.css](src/styles/main.css), [variables.css](src/styles/variables.css), [package.json](package.json) |
| `shrink:` DOM 누락 검사 | 로컬 `required<T>()`에 조회와 오류 처리를 모음. 미리보기와 모드 버튼 개수 검사는 유지 | [render.ts](src/game/render.ts) |
| `delete:` 미사용 상태·타입 | `attackSent`, `lastKickIndex`, `GameConfig`, `GameSnapshot.handling`, 두 Breakdown의 `keepsB2B` 제거. 마지막 사용처가 사라진 회전 결과의 `kickIndex`도 제거 | [engine.ts](src/game/engine.ts), [types.ts](src/game/types.ts), [scoring.ts](src/game/scoring.ts), [srsPlus.ts](src/game/rotation/srsPlus.ts) |
| `shrink:` TypeScript 옵션 복제 | 테스트 설정이 앱 설정을 상속. `types`·`tsBuildInfoFile`을 덮어쓰고 `exclude: []`로 테스트 포함 | [tsconfig.test.json](tsconfig.test.json) |
| `shrink:` 핸들링 저장 중복 | 기존 `readJson`·`writeJson`을 재사용하며 기본값과 정규화 유지 | [storage.ts](src/game/storage.ts) |
| `stdlib:` 파일 재귀 탐색 | `readdir({ recursive: true, withFileTypes: true })`와 `isFile()` 필터·`parentPath` 경로 조합으로 대체 | [generate-dist-pdf.mjs](scripts/generate-dist-pdf.mjs) |
| `shrink:` 줄 삭제 중간 자료구조 | 행 번호 배열과 `Set`을 제거하고 남길 행을 직접 필터링. 삭제할 행이 없으면 보드를 변경하지 않음 | [engine.ts](src/game/engine.ts) |
| `delete:` 전달용 점수 API | `loadHighScore`·`saveHighScore` 제거. 테스트도 `loadBestMetric`·`saveBestMetric`을 직접 호출 | [storage.ts](src/game/storage.ts), [storage.test.ts](src/game/storage.test.ts) |

## 검증

로컬 실행 환경이 응답하지 않아 GitHub Actions의 임시 검증 작업으로 실행했습니다. [성공한 실행 기록](https://github.com/HIX4123/jstetoris/actions/runs/34612969501)은 코드 변경 커밋 [9a7805f](https://github.com/HIX4123/jstetoris/commit/9a7805ffb159e2d2f724d2d7836cd09983acbc81)을 기준으로 합니다.

| 검사 | 결과 |
| --- | --- |
| npm으로 Sass 제거 및 lockfile 갱신 | 통과. 생성된 변경을 최종 lockfile에 반영 |
| `npm ci --ignore-scripts --no-audit --no-fund` | 통과 |
| `npm test` | 5개 파일, 47개 테스트 통과 |
| `npm run lint` | 통과. 다중 TypeScript 프로젝트에 대한 resolver 안내 출력 |
| `npm run build:pdf` | 내부 타입 검사와 Vite 빌드 통과 후 UTF-8 파일 3개의 PDF 생성 성공 |

검증 환경은 Node.js 24.20.0입니다. 최종 정리 커밋에서는 검증된 실행 코드에 대한 추가 변경 없이 npm이 생성한 lockfile과 두 Markdown 문서를 반영하고 임시 검증 workflow를 제거했습니다.

최초 audit에서는 미리보기 7개와 T/S 회전 좌표 8개의 일치, 1,024개 보드 패턴에 대한 줄 삭제 대체식의 등가성, 기본 재귀 탐색과 기존 탐색의 파일 경로 일치를 확인했습니다. 이번 적용의 전체 테스트 결과와 구분해 기록합니다. 브라우저의 시각적 회귀 검사는 수행하지 않았습니다.

## 유지한 동작과 문서

기존 v1 저장 기록을 읽는 경로, 실제 B2B 판정 함수, `getHandling`, DOM 누락 시 오류 처리, PDF 리포트와 폰트, Terser 이름 보존 정책은 유지했습니다. 점수 규칙·회전 규칙·입력 동작을 바꾸는 작업은 포함하지 않았습니다.

[README](README.md)는 현재 CSS 구조, 실행 방법, 세 게임 모드, 조작키, 핸들링 설정, 로컬 기록, 개발 명령과 PDF 생성 절차에 맞춰 다시 작성했습니다.

net: -269 lines, -1 direct dependency applied.
