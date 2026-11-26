# Google Form → Google Sheets → 우주형 뷰

Google Form에서 답변을 받고, 연결된 Sheet의 기존 기록과 새 응답을 Hanmadi 우주형 뷰로 표시합니다. LDAP ID는 작성자로 공개됩니다. 접수 시간 제한은 없으며, 응답 수집을 닫는 작업은 Google Form에서 합니다. Hanmadi는 읽기 전용 화면입니다.

## Form 구성

아래 두 항목을 필수로 만드세요.

1. **LDAP ID** — 단답형, 예시 `ashley.jeon`. 직접 입력한 ID이며 본인 인증은 아닙니다.
2. **AI Self-Learning 페이지에 어떤 콘텐츠가 담기면 좋을 것 같나요? AI를 내 업무에서 더 잘 사용하기 위해 필요한 아이디어나 사이트에 개선할 점이 있다면 알려주세요.** — 장문형.

LDAP ID와 답변이 행사 화면에 공개된다는 안내를 추가하세요. Form 응답에서 스프레드시트를 연결합니다.

## 읽기 연결 설치

1. 응답 Sheet에서 확장 프로그램 → Apps Script를 열고 `integrations/google-forms/Code.gs` 내용을 붙여넣습니다.
2. 프로젝트 설정 → 스크립트 속성에 `SHEET_ID`(시트 URL의 ID), `TAB_NAME`(실제 응답 탭 이름), `SITE_ORIGIN`(예: `https://yeseul-garden.github.io`, 경로와 끝 슬래시 제외)을 넣습니다.
3. 헤더가 다르면 `LDAP_HEADER`, `ANSWER_HEADER` 속성을 시트 첫 행의 정확한 항목명으로 지정합니다.
4. `readFormResponses`를 실행해 시트 읽기 권한을 승인합니다.
5. 웹 앱으로 배포합니다. 실행 주체는 본인, 액세스는 모든 사용자로 설정합니다. 회사 계정에서 이 배포가 허용되어야 합니다.
6. `public/form-source.js`의 `endpoint`에 웹 앱 `/exec` 주소를, `formUrl`에 응답용 Form 링크를 넣습니다. Sheet ID는 이 공개 파일에 넣지 않습니다.
7. `python3 scripts/build-pages.py`로 빌드하고 기존 GitHub Pages 배포 방식으로 `public`을 반영합니다.

설정된 사이트를 열면 우주형 발표 화면으로 시작합니다. 기존 응답을 가져오고 화면이 활성화된 동안 15초마다 확인합니다. 이 확인 주기는 접수 타이머와 별개입니다. 화면에는 연결 상태와 Form 링크가 표시됩니다. 같은 사람이 여러 번 제출해도 각 행을 각각 표시합니다. 빈 ID나 빈 답변 행은 제외하며, 시트에서 삭제하거나 수정한 기록도 다음 확인 때 반영합니다.

응답 시트를 웹에 게시할 필요는 없습니다. 다만 이 웹 앱의 읽기 주소를 아는 사람은 선택된 LDAP ID와 답변을 조회할 수 있습니다. 사이트 출처 검사는 접근 인증이 아닙니다. 다른 열은 반환하지 않습니다.

연결 해제는 `endpoint`를 빈 문자열로 바꾸면 됩니다. 현재는 설정 파일로 연결하며, 관리자 화면의 기존 Sheets 저장 기능과는 별도입니다.

## 확인

`node tests/google-forms.test.cjs`는 헤더 매핑, 중복 제출 보존, 빈 응답, 다른 열 제외를 검증합니다. 실제 Google 계정의 권한 승인, 배포 및 브라우저 연결은 Form/Sheet 링크와 배포 주소가 준비된 뒤 확인해야 합니다.
