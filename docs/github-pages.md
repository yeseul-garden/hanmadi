# GitHub Pages 배포와 공유

현재 준비된 파일은 **정적 시안**입니다. QR/화면별 URL/이미지 저장/링크 복사는 구현되어 있습니다. 답변, 이름 예약, 공감, 현재 질문, 접수 상태와 타이머는 기기 간 동기화되지 않습니다. 브라우저를 새로고침하면 작성한 행사 및 답변이 사라질 수 있습니다. 운영자 인증도 아직 없습니다. 실시간 행사 운영용 완성본으로 간주하지 마세요.

## 배포 순서

1. GitHub에 공개 저장소를 만듭니다. 예: `hanmadi`.
2. 이 작업 폴더의 `src`, `public`, `scripts`, `licenses`, `THIRD_PARTY_NOTICES.md`, `.github/workflows/pages.yml`을 저장소에 올립니다. 자신의 프로젝트 소스에 적용할 라이선스도 선택하세요(MIT 권장). 외부 코드 원문 라이선스는 이미 보관했습니다.
3. 기본 브랜치를 `main`으로 사용합니다. 다른 이름이면 워크플로의 `branches`를 수정합니다.
4. 저장소 **Settings → Pages → Build and deployment → Source → GitHub Actions**를 선택합니다.
5. `main`에 반영하거나 Actions에서 워크플로를 수동 실행합니다. 워크플로가 `python3 scripts/build-pages.py`로 `public/index.html`을 만들고 `public`만 게시합니다. 저장소 전체를 웹에 올리지 않습니다.
6. 완료 후 Pages에 표시된 실제 주소를 사용합니다. 프로젝트 사이트는 보통 `https://OWNER.github.io/REPOSITORY/`입니다. 실제 주소가 나오기 전에는 예시 주소를 참가자에게 공유하지 마세요.

GitHub 공식 문서: [Pages 개요](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [게시 소스 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). 워크플로는 [GitHub 공식 정적 사이트 예제](https://github.com/actions/starter-workflows/blob/main/pages/static.yml)의 단계를 참고했습니다.

## 행사 내용을 링크로 열기

1. 배포된 사이트에서 새 행사를 만들고 질문·이름·브랜딩·보기 방식을 적용합니다.
2. 공개 화면 위 **공유 주소 설정**에 실제 배포 주소를 입력합니다. 배포된 독립 페이지에서는 현재 주소가 자동 사용됩니다.
3. **행사 설정 파일 저장**을 눌러 내려받은 `event-config.js`로 저장소의 `public/event-config.js`를 교체합니다. 기존 공개 행사들을 유지하려면 기존 설정 파일을 불러온 배포 페이지에서 내보내세요. 시안에서 바로 내보내면 현재 행사만 포함될 수 있습니다.
4. 파일을 저장소에 반영하고 배포 완료를 기다립니다. 링크에는 질문과 답변 전체를 넣지 않고 행사 코드만 넣습니다. 폰트 직접 업로드는 현재 세션 전용이므로 공유 파일에서는 IBM Plex Sans KR로 대체됩니다. 기본 8개 폰트와 로고·키컬러는 배포 설정으로 전달됩니다.
5. **참가자 QR·링크**에서 QR을 확인하고 PNG를 저장합니다. **발표 링크 복사**로 발표 화면을 여세요. 참가자 상단의 **링크 복사**는 같은 행사 참가자 링크를 복사합니다. 자동 복사가 차단된 환경에서는 선택 가능한 링크를 보여줍니다.

예시 주소(실제 배포 주소로 교체):

- 참가자: `https://OWNER.github.io/REPOSITORY/?e=demo&v=p`
- 발표: `https://OWNER.github.io/REPOSITORY/?e=demo&v=s`

별도 URL 단축 서버는 사용하지 않습니다. 같은 사이트의 짧은 행사 코드와 화면 코드를 쓰는 방식입니다. 공개 설정 파일에 없는 행사 코드는 ‘행사를 찾을 수 없습니다’로 처리하며 운영자 화면으로 넘어가지 않습니다. 화면 코드는 인증 수단이 아닙니다. 참가자·발표 링크에서는 시안의 역할 전환 버튼을 숨기지만 실제 권한 보안은 백엔드에서 구현해야 합니다.

## 실시간으로 여러 기기의 답변을 모으려면

GitHub Pages는 HTML/CSS/JavaScript를 제공하는 정적 호스팅입니다. 다른 기기의 데이터를 저장하거나 실시간으로 전파하는 서버 기능은 제공하지 않습니다. 별도 서버를 직접 관리하지 않으려면 **GitHub Pages + Supabase 같은 관리형 백엔드** 구성을 권장합니다. 엄밀히는 백엔드가 추가되는 것이며 Pages만으로 끝나는 구성은 아닙니다.

필요한 구성은 다음과 같습니다.

- 행사·질문·답변·반응·닉네임 예약을 데이터베이스에 보관.
- 운영자 로그인과 행사 소유권 정책, 참가자의 제한된 읽기/작성 권한.
- 현재 질문·접수 상태·종료 시각·일시정지 잔여시간의 실시간 전달.
- 이름 중복 방지와 공감 증감을 데이터베이스의 유일 제약/원자적 처리로 수행.
- 클라이언트에는 공개용 publishable key만 사용하고 service-role/secret 키를 넣지 않음.
- URL은 같은 행사 코드를 유지하면서 설정 파일 대신 데이터베이스에서 조회.

기존 `database/name-reservations.sql`은 이름 예약 설계 참고 파일이며 전체 행사 백엔드가 아닙니다. 이번 변경에서 백엔드 연결이나 테이블 배포를 수행하지 않았습니다.

**500명 목표:** 2026-11-21 확인 기준 Supabase Realtime Free 동시 연결 한도는 200입니다. 500명 참가자 외에 운영자·발표 화면·여러 탭도 연결 수에 포함되므로 한도와 여유 용량을 확보해야 합니다. 무료 플랜만으로 500명을 지원한다고 보장할 수 없습니다. [공식 Realtime 한도](https://supabase.com/docs/guides/realtime/limits).

## 검증 범위

주소와 경로 보존, 역할별 진입, 공개 설정 적용, 누락 행사 처리, QR 여백과 모듈 구성, 독립 QR 해독기로 목적 주소 일치, 클립보드 성공·실패 분기를 확인했습니다. 실제 GitHub 배포, 휴대폰 카메라 스캔, 브라우저 PNG 다운로드/클립보드 완료, 동시 접속은 아직 확인하지 않았습니다.
