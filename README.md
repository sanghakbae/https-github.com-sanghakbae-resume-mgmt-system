# Resume Management System

배상학 이력서를 한 곳에서 관리하는 Vite + React 기반 커리어 관리 시스템입니다. 공개 보기와 편집 화면을 같은 데이터에 연결하고, 회사/수행 업무 관리, 방문 로그, 폰트 설정, 사진 보정까지 포함합니다.

## 개요

- 공개 이력서 화면과 편집 화면을 동일한 데이터 구조로 연결
- 로컬 모드에서는 로그인 없이 바로 편집 가능
- 공개 모드에서는 누구나 열람 가능하고, 편집만 특정 Google 계정으로 제한
- 사진 업로드 후 출력 경계 확인 및 위치 보정 지원
- 회사 추가 / 수행 업무 추가를 좌우 분할 레이아웃으로 관리
- 방문 로그와 방문 횟수를 브라우저 로컬 저장소에 기록
- 전역 폰트 설정을 브라우저에 저장

## 동작 방식

### 로컬 모드

- `VITE_PUBLIC_RESUME_MODE=false`
- 로그인 없이 편집 화면으로 바로 진입
- 브라우저 `localStorage` 기반 작업공간 사용
- 편집 상태, 방문 로그, 폰트 설정을 현재 브라우저에 저장
- 필요하면 Google 로그인은 남겨둘 수 있지만, 진입 필수 조건은 아님

### 공개 모드

- `VITE_PUBLIC_RESUME_MODE=true`
- 누구나 공개 이력서를 열람 가능
- Google 로그인은 가능하지만, 편집은 허용된 계정만 가능
- 편집 허용 계정은 `VITE_EDITOR_EMAILS`로 제어
- 현재 기본 허용 계정은 `totoriverce@gmail.com`
- 비허용 계정은 공개 화면만 볼 수 있고, 편집 버튼과 저장 기능은 비활성화

## 주요 기능

### 이력서 편집

- 기본 정보 편집
  - 이름
  - 직무 / 역할
  - 소개
  - 사진
  - 학력
  - 경력
  - 전문분야
  - 자격 사항
  - 병역 사항
  - 산업 군
- 사진 업로드 후 좌우 / 상하 / 확대 슬라이더로 보정
- 사진 미리보기에서 실제 출력 경계를 표시
- 입력 내용은 작업공간에 자동 저장
- 공개 모드에서는 편집 허용 계정만 수정 가능

### 회사 관리

- 회사 추가 / 수정 / 삭제
- 왼쪽 입력 폼, 오른쪽 등록된 회사 목록의 좌우 배치
- 회사 요약과 핵심 업무를 함께 관리
- 회사 정보 변경 시 수행 업무와 연결 관계를 유지

### 수행 업무 관리

- 수행 업무 추가 / 수정 / 삭제
- 프로젝트 URL 입력 시 링크 썸네일 카드 표시
- 태그 자동 추출은 실제 근거가 있을 때만 반영
- 공개 보기에서 회사별 대표 프로젝트 카드로 묶어 표시

### 공개 보기

- 공개 이력서 상단 프로필 카드
- 경력 대시보드
- 회사별 대표 프로젝트 목록
- 핵심 역량 분포
- 역할 변화 타임라인
- 대표 성과 하이라이트
- 방문 횟수 표시

### 방문 로그

- 메뉴에서 `방문 로그` 제공
- 브라우저 로컬 저장소 기준 방문 기록을 테이블로 확인
- 열 구성
  - 방문 시각
  - 모드
  - 사용자
  - 대상
  - IP 자리
- IP는 현재 서버 연동용 자리만 있고, 실제 값은 백엔드 또는 프록시 연동 시 주입해야 함

### 설정

- `설정` 메뉴에서 전역 폰트 선택 가능
- 지원 폰트
  - KorPub 돋움체
  - Pretendard
  - Noto Sans KR
  - 맑은 고딕
  - Apple SD Gothic Neo
- 선택값은 브라우저에 저장

## 빠른 시작

```bash
npm install
npm run dev
```

기본적으로 `http://localhost:5173/`에서 실행됩니다. 필요하면 `--host` 또는 `--port`를 추가할 수 있습니다.

## 빌드

```bash
npm run build
```

## 환경 변수

`.env` 파일을 만들어 아래 값을 설정합니다.

```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_ENABLE_SUPABASE=false
VITE_PUBLIC_RESUME_MODE=true
VITE_ADMIN_EMAILS=admin@example.com
VITE_EDITOR_EMAILS=totoriverce@gmail.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 변수 설명

- `VITE_GOOGLE_CLIENT_ID`
  - Google 로그인 버튼과 One Tap 인증에 사용
- `VITE_ENABLE_SUPABASE`
  - `true`일 때 Supabase 세션과 저장소 사용
  - `false`일 때는 브라우저 로컬 작업공간 사용
- `VITE_PUBLIC_RESUME_MODE`
  - `true`면 공개 보기 중심 모드
  - `false`면 로컬 편집 모드
- `VITE_ADMIN_EMAILS`
  - 로컬 편집 모드에서 관리자 작업공간을 볼 때 참고하는 이메일 목록
  - 현재 공개 모드의 편집 권한에는 사용되지 않음
- `VITE_EDITOR_EMAILS`
  - 공개 모드에서 편집을 허용할 이메일 목록
  - 편집과 저장 권한의 기준
- `VITE_SUPABASE_URL`
  - Supabase를 사용할 때 프로젝트 URL
- `VITE_SUPABASE_ANON_KEY`
  - Supabase를 사용할 때 anon key

## 권한 요약

- 로컬 모드
  - 로그인 없이 편집 가능
  - 공개 보기와 편집 화면을 같은 브라우저에서 바로 다룰 수 있음
- 공개 모드
  - 누구나 열람 가능
  - `VITE_EDITOR_EMAILS`에 들어 있는 Google 계정만 편집 가능
  - 그 외 계정은 공개 보기만 가능

## 현재 UI 구조

- 상단 헤더
  - 로그인 상태
  - 편집 / 공개 보기 전환
  - 샘플 복원
  - 로그아웃
- 왼쪽 사이드바
  - 대시보드
  - 기본 정보
  - 회사 추가
  - 수행 업무 추가
  - 방문 로그
  - 설정
- 오른쪽 본문
  - 선택한 섹션만 렌더링

## 프로젝트 구조

- `src/App.tsx`
  - 화면 라우팅, 접근 제어, 방문 로그, 폰트 설정, 작업공간 연결
- `src/components/auth`
  - 로그인 화면과 Google 로그인 버튼
- `src/components/resume`
  - 프로필, 회사, 수행 업무, 공개 보기, 대시보드 UI
- `src/hooks`
  - Google Auth, 작업공간 저장 로직
- `src/lib`
  - 사진 보정, 요약 생성, 태그 추출, Supabase 연동
- `src/data/resume.ts`
  - 기본 이력서 데이터와 카드 메타정보
- `src/types/resume.ts`
  - 주요 타입 정의

## 참고

- PDF / HTML 내보내기 버튼은 현재 제거되어 있습니다.
- 인쇄 스타일은 남아 있지만 전용 export 버튼은 없습니다.
- 이 프로젝트는 배상학 이력서를 기준 데이터로 사용합니다.
