# Google Sheets 저장 기능 업데이트

1. `hanmadi-google-sheets-update.zip`을 압축 해제합니다.
2. 폴더 안의 **파일과 하위 폴더들**을 기존 `yeseul-garden/hanmadi` 저장소의 최상위에 업로드합니다. ZIP 파일 자체를 올리거나 상위 폴더째 넣지 마세요.
3. `index.html`은 기존 파일을 교체하고, `integrations/google-sheets/`가 반드시 추가되도록 합니다. 이 ZIP에는 `event-config.js`가 없으므로 기존 공개 행사 설정은 유지됩니다.
4. 커밋 제목 예시: `Add Google Sheets response collection`.
5. GitHub Pages 배포가 완료되면 사이트를 새로고침합니다. 기존 페이지의 체험 답변은 유지되지 않을 수 있습니다.
6. 새 행사 만들기 마지막 단계의 **저장할 곳 선택·연결하기 → Google 시트에 답변 모으기**으로 들어갑니다. 시트 URL·`hanmadi` 탭·배포 사이트 주소를 입력하고, 봇용 참가자 ID가 필요하면 필수 입력을 켭니다.
7. 연결 코드를 만들고 복사한 뒤 Google 연결 화면에 한 번 붙여 넣습니다. 권한 승인·배포 후 받은 주소를 Hanmadi에 입력합니다. 개인 설정이 포함된 연결 코드는 GitHub에 올리지 않습니다.
8. **연결하고 테스트하기 → 이 저장 방식으로 계속** 후 참가자 QR을 공유합니다.
9. 휴대폰 두 대에서 제출하고 시트·기존 인증 봇까지 확인합니다.

기존 한글 열 9개는 지원합니다. 답변이 없는 탭에서 초기화를 실행하면 오른쪽에 `activity_status`, `client_id`, `payload_hash` 3개 열이 추가됩니다. 테스트 행은 `activity_status=test`, 실제 제출은 `submitted`입니다. 봇은 실제 제출만 처리해야 합니다.

현재 업데이트는 **시트 기록 기능**입니다. 전체 답변은 Google Sheets에서 확인합니다. 참가자 화면 미리보기의 전체 답변 목록·공감·타이머·접수 상태는 기기 간 동기화하지 않습니다. 실제 마감은 Apps Script의 스크립트 속성 `HANMADI_ACCEPTING=false`로 설정합니다.

자세한 설명: `docs/google-sheets.md`.
