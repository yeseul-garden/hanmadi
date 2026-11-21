# yeseul-garden 계정으로 첫 데모 공개하기

우선 데모 화면을 공개해 기능을 살펴보고, 그다음 실시간 답변 저장소를 연결하는 순서가 좋습니다. 첫 데모에는 별도 서버, 결제, 개발 도구 설치가 필요하지 않습니다. 현재 QR은 공개 화면을 여는 용도이며 다른 휴대폰의 답변을 한 화면에 모으는 기능은 아직 연결되지 않았습니다.

이번 첫 공개에는 `hanmadi-demo.zip` 안의 완성 파일을 사용합니다. **이 방법은 빌드나 직접 만든 GitHub Actions 설정이 필요 없습니다.** 소스에서 자동 빌드할 때는 별도의 `docs/github-pages.md` 방식을 사용하세요.

## 1. 저장소 만들기

1. https://github.com/new 를 엽니다.
2. Owner는 `yeseul-garden`으로 선택합니다.
3. Repository name은 `hanmadi`를 추천합니다. 이미 사용 중이면 다른 이름을 쓰고 아래 주소의 저장소 이름도 바꿉니다. 이름의 사용 가능 여부는 실제 생성 화면에서 확인하세요.
4. Public을 선택하고 Add README를 켭니다. 오픈소스 코드 공개를 위해 라이선스를 지금 고른다면 MIT를 추천합니다. 포함된 외부 라이선스는 그대로 유지해야 합니다.
5. Create repository를 누릅니다.

## 2. 데모 파일 올리기

1. 준비된 `hanmadi-demo.zip`을 내려받아 압축을 풉니다.
2. 압축 안에는 `index.html`, `event-config.js`, `vendor` 폴더, `licenses` 폴더, 저작권 고지가 있습니다.
3. GitHub 저장소에서 **Add file → Upload files**를 선택합니다.
4. **압축을 푼 폴더 안의 파일과 폴더**를 모두 선택해 업로드 화면으로 끌어놓습니다. ZIP 파일 자체나 바깥의 `hanmadi-demo` 폴더를 올리지 마세요.
5. README가 이미 있어도 데모 안내 README로 교체해도 됩니다. 커밋 메시지에 `Add first demo`를 입력하고 `main`에 저장합니다. 화면에 Propose changes가 표시되면 안내에 따라 변경을 확정하거나 PR을 main에 반영합니다.
6. 저장소 파일 목록 첫 화면에 **index.html**이 바로 보이는지 확인합니다. `hanmadi-demo/index.html` 또는 `public/index.html` 안에 들어가 있으면 이 간단한 방법에서는 경로를 옮겨야 합니다.

GitHub에서 정적 화면을 열려면 이 최상위 index.html 위치가 중요합니다. `.nojekyll`은 숨김 파일이므로 보이면 함께 올려도 되고, 이번 파일 구성에서는 없어도 됩니다.

## 3. GitHub Pages 켜기

저장소의 **Settings → Pages → Build and deployment**로 이동합니다.

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

**Save**를 누릅니다. Pages가 게시를 처리한 뒤 표시하는 **Visit site**로 엽니다. 공개에는 몇 분이 걸릴 수 있으며 바로 안 보이면 Actions에서 Pages 작업이 완료됐는지 확인합니다.

이 저장소 이름을 사용했을 때의 예상 주소는 아래와 같습니다. 아직 실제로 만들어지거나 배포된 주소라는 뜻은 아닙니다.

- 첫 화면: `https://yeseul-garden.github.io/hanmadi/`
- 참가자 데모: `https://yeseul-garden.github.io/hanmadi/?e=demo&v=p`
- 발표 데모: `https://yeseul-garden.github.io/hanmadi/?e=demo&v=s`

저장소 이름이 달라지면 주소의 `hanmadi` 부분도 달라집니다. `yeseul-garden.github.io`라는 특수 이름의 저장소를 만들 필요는 없습니다. 일반 프로젝트 저장소로 시작하면 됩니다.

## 4. 데모 확인

- 첫 화면의 **샘플로 체험하기**를 누릅니다.
- 공감 버튼, 목록형·카드형·우주형, 타이머와 고양이, KOR/ENG 및 밝기를 확인합니다.
- 공개 화면 위 **참가자 QR·링크**를 눌러 휴대폰 카메라로 참가자 데모 주소가 열리는지 확인합니다. 실제 배포 페이지에서는 배포 주소를 자동 사용합니다.
- 참가자 화면의 링크 복사, 운영자의 발표 링크 복사도 확인합니다.

현재 샘플은 같은 브라우저 안에서 기능을 체험합니다. 링크로 새로 여는 참가자/발표 화면은 `event-config.js`에 저장한 정적 행사 설정을 사용합니다. 새로 만든 질문을 링크에서도 열려면 아래 단계가 필요합니다.

## 5. 내 행사 내용으로 바꾸기

1. 첫 화면에서 **내 행사 만들기**를 완료합니다.
2. 운영자 공개 화면 위 **공유 주소 설정 → 행사 설정 파일 저장**을 누릅니다.
3. 내려받은 `event-config.js`로 GitHub 저장소 최상위의 동명 파일을 교체하고 저장합니다.
4. Pages가 다시 게시된 후 운영자 화면에서 만든 참가자 QR·링크를 사용합니다. 새 행사 코드는 `demo`와 다르므로 새 링크를 사용하세요.
5. 파일에 공개한 설정은 페이지를 다시 게시할 때만 다른 기기에 반영됩니다. 접수 ON/OFF, 질문 전환, 답변과 공감을 실시간으로 공유하려면 관리형 백엔드 연결이 필요합니다.

## 안 열릴 때 확인할 것

- 404: 저장소 이름, URL 끝 `/`, 최상위 index.html, Pages의 main/root 설정을 확인합니다.
- QR 링크에서 행사 없음: 새 행사 코드에 맞는 event-config.js가 게시됐는지 확인합니다.
- 해·달 아이콘이나 QR이 없음: vendor 폴더를 빠뜨리지 않았는지 확인합니다.
- 바꾼 화면이 안 보임: Pages 게시 완료 후 새로고침하고, 필요하면 새 탭에서 확인합니다.
- 두 휴대폰 답변이 안 모임: 현재 정적 시안의 제한입니다. Pages 설정 오류가 아닙니다.

공식 참고: [웹에서 파일 올리기](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository), [GitHub Pages 생성](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [브랜치 게시 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
