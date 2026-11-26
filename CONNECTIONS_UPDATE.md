# Google Sheets와 Supabase 연결 업데이트

1. `hanmadi-connections-update.zip`을 풀고 안의 파일과 폴더를 GitHub 저장소 최상위에 업로드하세요. ZIP 자체나 상위 폴더를 올리지 않습니다.
2. `index.html`을 교체하고 `integrations/`, `vendor/`, `licenses/` 폴더가 함께 올라가는지 확인하세요. 업데이트 ZIP은 기존 `event-config.js`를 교체하지 않습니다.
3. 커밋 제목 예: `Add Google Sheets and Supabase connections`.
4. GitHub Pages 배포가 끝나면 새로고침하세요. 연결 설정은 배포된 웹사이트에서 진행합니다.

## 먼저 Google Sheets 테스트

앱에서 **내 설문 만들기 → 연결과 확인 → 저장할 곳 선택·연결하기 → Google 시트에 답변 모으기**을 선택하세요. 시트 URL과 `hanmadi` 탭을 입력하고 **연결 코드 만들기 → 복사**를 누릅니다. Google 연결 화면에 코드 하나를 붙여 넣고 권한 승인·배포한 뒤 **연결하고 테스트하기 → 이 저장 방식으로 계속**을 누릅니다.

테스트는 `activity_status=test`, 실제 제출은 `submitted`로 저장됩니다. 실제 참가자의 ID로 휴대폰에서 제출하고 기존 봇 인증까지 확인하세요. 자세한 순서: `docs/google-sheets-test.md`.

Sheets v2는 답변 저장과 약 15초 간격의 답변·로고·제목·접수 상태·타이머 공유를 지원합니다. 운영자 연결 키로 화면 설정을 변경합니다. 기존 Google 연결 코드도 새 버전으로 배포해야 합니다. [업데이트 순서](docs/shared-screens-update.md)를 확인하세요.

## 그다음 Supabase 테스트

1. Supabase SQL Editor에서 `integrations/supabase/install.sql`을 실행합니다.
2. Authentication에서 Anonymous Sign-Ins를 켜고 운영자 이메일 계정을 생성합니다.
3. 앱에서 **Supabase로 답변 실시간 공유**을 선택하고 프로젝트 URL·공개용 키·운영자 계정을 입력합니다.
4. **운영자 계정으로 연결 → 새 행사 또는 기존 행사 → 이 저장 방식으로 계속**을 누릅니다.
5. 접수를 켜고 QR을 두 휴대폰에서 열어 답변·공감·타이머 공유를 확인합니다.

이어서는 처음 화면의 **기존 행사 이어서**를 사용하세요. 자세한 설정: `docs/supabase.md`.

공개용 키나 시트 주소를 앱 소스에 고정하지 않습니다. 개인 설정이 들어간 연결 코드, 비밀번호, Secret key는 GitHub에 올리지 않습니다.

로컬 DB와 자동 UI 테스트는 완료했습니다. 이 ZIP을 만드는 것만으로 GitHub 배포·Google Apps Script 설치·Supabase DB 설치가 완료되지는 않습니다. 실제 계정에서의 연결과 휴대폰 리허설은 별도로 진행하세요.

연결 코드 준비에 필요한 파일은 최신 Hanmadi 화면 안에 포함됩니다. 별도 설치 파일 주소를 가져오지 않아도 코드를 만들 수 있습니다. 실제 시트 기록에는 Google 연결 도구 설치가 필요합니다.

이번 업데이트는 연결 코드 복사, 모달 글꼴과 한글 줄바꿈, 초보자용 버튼·안내 문구도 개선합니다. 자동 복사가 막히면 ‘코드 전체 선택’ 후 복사 단축키 또는 길게 누르기로 복사하세요.
