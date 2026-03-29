# Resume Management System

배상학 이력서를 공개용 레주메 페이지와 로컬 편집 화면으로 함께 관리하는 Vite + React 프로젝트입니다.

## 주요 기능

- 공개 단일 이력서 페이지
- 회사 중심 경력 정리
- 수행 업무 이미지 업로드
- PDF / HTML 출력
- Google 로그인 기반 편집 잠금 해제
- GitHub Pages 배포용 워크플로우

## 로컬 실행

```bash
npm install
npm run dev
```

기본적으로 로컬에서는 편집 모드로 사용할 수 있습니다.

## 환경 변수

`.env.example`을 참고해서 `.env`를 만듭니다.

```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_EDITOR_EMAILS=your-google-email@example.com
VITE_PUBLIC_RESUME_MODE=false
```

### 주요 값

- `VITE_PUBLIC_RESUME_MODE=true`
  - 공개 배포 모드
  - 접속한 누구나 같은 이력서를 봄
- `VITE_PUBLIC_RESUME_MODE=false`
  - 로컬 편집 모드
- `VITE_EDITOR_EMAILS`
  - 공개 배포본에서 편집 권한을 열 수 있는 Google 계정 이메일 목록

## 공개 배포 모드

GitHub Pages 배포 시에는 아래처럼 설정하는 것을 기준으로 합니다.

```env
VITE_PUBLIC_RESUME_MODE=true
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_EDITOR_EMAILS=your-google-email@example.com
```

이 경우:

- 일반 방문자: 공개 이력서 읽기 전용
- 지정한 Google 계정으로 로그인한 본인: 현재 브라우저에서 편집 가능

주의:

- GitHub Pages는 정적 배포이므로, 로그인 후 수정 내용은 모든 방문자에게 실시간으로 공유되지 않습니다.
- 전역 반영형 편집 시스템이 필요하면 별도 백엔드 또는 저장소 연동이 필요합니다.

## GitHub Pages 배포

`.github/workflows/deploy.yml`이 포함되어 있습니다.

필수 설정:

1. 저장소 `Settings`
2. `Pages`
3. `Build and deployment` > `Source`를 `GitHub Actions`로 설정
4. `Settings` > `Actions` > `General`
5. `Workflow permissions`를 `Read and write permissions`로 설정

그 다음 `main` 브랜치에 푸시하면 자동 배포됩니다.

## 현재 구조

- `src/App.tsx`
  - 공개/편집 모드 분기, 출력 기능, 상단 액션
- `src/components/resume`
  - 프로필, 회사, 수행 업무 폼과 공개 이력서 UI
- `src/hooks/use-resume-workspace.ts`
  - 작업공간 로드/저장
- `src/data/resume.ts`
  - 기본 이력서 데이터

## 참고

현재 프로젝트는 배상학 이력서를 기준 데이터로 사용합니다.
