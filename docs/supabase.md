# Supabase 연결

이 저장 방식은 행사·질문·답변·공감·운영 설정을 Supabase에 저장합니다. 참가자와 발표 화면은 같은 행사를 읽고 Postgres Changes 알림을 받아 갱신합니다. 실시간 알림을 받지 못할 때도 활성 탭은 15초마다 다시 확인합니다. Google Sheets로 복제하는 기능은 이번 버전에 포함하지 않습니다.

## 프로젝트에서 한 번 설정

1. Supabase 프로젝트를 생성합니다. **Enable Data API: 켜기**, **Grant API access to new tables automatically: 끄기**, **Enable RLS on new tables automatically: 켜기**를 권장합니다. 이번 설치 SQL은 필요한 읽기 권한과 함수 실행 권한을 명시적으로 부여하므로 자동 API 노출을 켤 필요가 없습니다.
2. **SQL Editor → New query**에서 `integrations/supabase/install.sql` 전체를 붙여 넣고 **Run**을 누릅니다. Hanmadi 앱의 연결 안내에서도 같은 SQL을 다운로드할 수 있습니다. 다른 프로젝트용 SQL이나 예전 닉네임 예약 참조 파일 대신 이 파일을 사용하세요. 이 SQL은 기존 Hanmadi 기록을 삭제하지 않고 반복 실행할 수 있습니다.
3. **Authentication → Sign In / Providers → Anonymous Sign-Ins**를 켭니다. 참가자는 가입 화면을 거치지 않지만 Supabase가 기기별 익명 계정을 발급합니다. 이것은 화면에 표시할 동물 닉네임과는 별개입니다.
4. **Authentication → Users → Add user → Create new user**에서 운영자 이메일·비밀번호로 계정을 만듭니다. 직접 만든 테스트 계정은 이메일 확인 상태도 확인하세요. 이 계정의 비밀번호는 Hanmadi 연결 화면에만 입력하며 채팅·GitHub·QR 링크에 넣지 않습니다. Supabase 대시보드에 로그인한 계정과 앱의 운영자 계정은 별개입니다.
5. **Authentication → URL Configuration**의 Site URL과 Redirect URLs에 본인의 GitHub Pages 주소를 입력합니다. 현재 버전은 이메일·비밀번호 로그인을 사용하므로 리디렉션 없이 연결되지만 이메일 확인·비밀번호 재설정용으로 이 주소를 준비해둡니다.
6. **Settings → API Keys**에서 `sb_publishable_…` 공개용 키를 복사합니다. Secret key, `service_role`, DB 비밀번호는 사용하지 않습니다.

## 새 행사 연결

1. 최신 배포 파일을 올린 후 Hanmadi에서 **내 행사 만들기 → 행사 정보 → 질문과 참여 방식 → 연결과 확인**으로 이동합니다.
2. **저장할 곳 선택·연결하기 → Supabase로 답변 실시간 공유**을 선택합니다.
3. 프로젝트 URL·공개용 키·운영자 이메일·비밀번호를 입력하고 **운영자 계정으로 연결**을 누릅니다. 로그인 성공 후 비밀번호 입력값은 지워집니다.
4. **현재 설정으로 새 행사 만들기 → 이 저장 방식으로 계속**을 누릅니다. 질문과 설정이 DB에 만들어지고 접수는 닫힌 상태로 시작합니다. 설정 마지막 단계의 **진행 화면 열기**를 누릅니다.
5. 운영 화면에서 접수를 켜고 **참가자 QR·링크**와 **발표 링크**를 공유합니다. 질문·답변·공감·현재 보기 방식·접수 상태·타이머가 이 행사에서 공유됩니다.

참가자 링크의 URL fragment에는 프로젝트 URL·공개용 키·예측하기 어려운 행사 코드만 포함됩니다. 관리자 비밀번호나 로그인 토큰은 포함되지 않습니다. 링크를 가진 사람은 이 행사에 참여할 수 있으므로 행사 참가 대상에게 공유하세요.

## 기존 행사 이어서

처음 화면의 **기존 행사 이어서**에서 같은 프로젝트 URL과 공개용 키로 연결합니다. 기존 로그인 세션이 남아 있으면 비밀번호를 다시 입력하지 않고 **운영자 계정으로 연결**을 누를 수 있습니다. 계정이 소유한 행사 목록에서 이어갈 행사를 선택하세요.

브라우저에 기억하는 연결 정보는 프로젝트 URL과 공개용 키뿐입니다. Supabase SDK는 로그인 세션 토큰을 별도 로컬 저장소에 관리합니다. 운영자와 참가자의 세션 저장 공간은 분리되어 있습니다. 공유 기기에서는 **운영자 로그아웃**을 사용하세요.

## 데이터·권한

- 공개 스키마의 `hm_events`, `hm_prompts`, `hm_responses`, `hm_signals`에는 RLS가 적용됩니다. 로그인했어도 행사 소유자이거나 행사 코드로 참여한 사용자만 읽을 수 있습니다.
- 쓰기는 권한을 검사하는 `hm_*` 함수로 제한합니다. 참가자가 일반 테이블 API로 행사 설정을 변경할 수 없습니다.
- 운영자만 질문 전환·접수 설정·숨기기·고정·완료 표시를 변경할 수 있습니다. 단순히 화면 역할을 운영자로 바꾸는 것으로 권한을 얻을 수 없습니다.
- 응답의 비공개 참가자 ID, 제출 검증값, 이름 예약과 개인별 투표 정보는 노출하지 않는 `hanmadi_private` 스키마에 보관합니다. 기본 Supabase 참가 폼에서는 별도 봇 ID를 받지 않습니다. Google Sheets 봇 인증을 쓰려면 Sheets 모드를 선택하세요.
- 공개 답변에는 개인별 투표 여부와 집계만 전달합니다. 참가자끼리 다른 사람의 봇 ID를 읽을 수 없습니다.
- 닉네임 중복은 서버에서 검사하며, 같은 참가자가 본인의 이름을 다시 사용하는 것은 허용합니다. Unicode 정규화와 공백·일부 숨은 문자 차이도 처리합니다.
- 답변 제출은 고정된 UUID로 재시도하여 중복 저장을 방지합니다. 투표는 토글 명령 대신 원하는 ON/OFF 값을 보내므로 중복 요청으로 숫자가 늘지 않습니다.
- 타이머 마감은 DB 시각으로 검사합니다. 브라우저가 꺼져 있어도 기한이 지난 새 답변은 거절됩니다. 일시정지·재개·전체 초기화도 서버에 저장됩니다.
- 질문 추가는 현재 질문과 보관 질문을 분리하고, 새 질문은 접수 OFF로 시작합니다. 다른 운영 창에서 설정을 바꾼 경우 버전을 검사해 오래된 설정으로 덮어쓰지 않습니다.
- Excel 다운로드 직전에 전체 행사 기록을 다시 불러옵니다. 불러오지 못하면 오래된 내용으로 다운로드하지 않고 오류를 표시합니다.

## 두 휴대폰으로 테스트

1. 운영자 PC에서 접수 ON. 휴대폰 A·B로 같은 QR을 열고 각각 다른 이름으로 답변합니다.
2. 운영자·A·B·발표 화면에 두 답변이 나타나는지 확인합니다.
3. A에서 B의 답변에 공감 → 모든 화면에서 1 증가. 다시 누르면 감소하는지 확인합니다.
4. 운영자가 완료 표시 → 목록 맨 아래로 이동. 완료 취소 → 원래 정렬로 돌아오는지 확인합니다.
5. 타이머 30초 시작 → 참가자 화면에서도 줄어들고, 일시정지·재개·초기화가 전달되는지 확인합니다.
6. 접수 OFF 또는 시간 만료 후 제출이 거절되는지 확인합니다. 질문 변경 시 작성 중인 내용이 유지되고 변경된 질문 확인을 요구해야 합니다.
7. 새 질문을 만든 뒤 이전 답변은 보관 기록에 남는지, 새로고침 후에도 같은 행사가 열리는지 확인합니다.
8. 운영자 Excel에 이전 질문과 현재 질문의 답변이 모두 포함되는지 확인합니다.

## 용량·운영 전 확인

Supabase Free의 Realtime 동시 연결 한도는 현재 200개입니다. 운영자·발표 화면·여러 탭도 포함됩니다. 익명 로그인은 기본적으로 IP당 시간당 30회 요청 한도가 있습니다. 행사 Wi-Fi를 함께 쓰면 같은 IP로 묶일 수 있으므로 Authentication의 Rate Limits 설정도 확인하세요. 대규모 행사 전 CAPTCHA/Turnstile과 익명 사용자 정리 정책을 검토해야 합니다. 현재 클라이언트에는 CAPTCHA 위젯을 포함하지 않았으므로 CAPTCHA를 필수로 설정한 프로젝트에서는 익명 접속에 추가 구현이 필요합니다. 이 버전은 500명 동시 접속 부하 검증을 마친 서비스가 아닙니다.

SDK 버전은 `supabase-js 2.119.2`이며 브라우저 번들과 MIT 고지를 함께 배포합니다. 실제 Supabase 프로젝트의 SQL 설치·운영자 로그인·휴대폰 실시간 통신은 본인 계정에서 확인해야 합니다. 로컬 DB 테스트는 클라우드나 실제 브라우저 검증을 대신하지 않습니다.

공식 문서: [API Keys](https://supabase.com/docs/guides/getting-started/api-keys), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous), [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Realtime limits](https://supabase.com/docs/guides/realtime/limits).

검증: `node tests/supabase-ui.test.cjs`. SQL 테스트는 별도 임시 디렉터리에 `@electric-sql/pglite@0.3.14`를 설치한 뒤 `HANMADI_PGLITE=/absolute/path/to/node_modules/@electric-sql/pglite/dist/index.js node tests/supabase-db.test.mjs`로 실행합니다.
