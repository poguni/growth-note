# [구현 계획] 행동특성 및 종합의견 도우미 Web 앱(Web_version) 개발 계획서

본 계획서는 기존 Electron 기반의 행동특성 및 종합의견 도우미 앱을 웹 브라우저에서 실행 가능한 순수 웹 애플리케이션(Web App)으로 전환하기 위한 분석 및 구현 계획입니다.

---

## 1. Electron → Web 앱 전환 시 주요 이슈 및 해결 방안 (문제점 조사)

| 구분 | Electron 기존 방식 | 웹 브라우저(Web) 방식 전환 및 해결 방안 |
| :--- | :--- | :--- |
| **1. 데이터 저장소 (Persistence)** | Node.js `fs` 모듈로 사용자 OS `AppData/Roaming/BehaviorReport/` 경로에 `config.json` 및 학급별 `.json` 저장 | **웹 브라우저 LocalStorage & IndexedDB 활용**<br/>- 브라우저 내 도메인 전용 저장소(`localStorage` / `IndexedDB`) 사용<br/>- 데이터 백업/복구를 위한 **JSON 파일 엑스포트/임포트 기능** 기본 지원 |
| **2. 엑셀 파일 입출력 (Excel I/O)** | Electron 메인 프로세스의 native `dialog.showOpenDialog`, `dialog.showSaveDialog` + Node.js filesystem | **HTML5 File API + Browser Download (`Blob`)**<br/>- **업로드**: `<input type="file" accept=".xlsx,.xls">` 및 드래그 앤 드롭<br/>- **다운로드/내보내기**: Client-side에서 SheetJS(`xlsx`)로 바이너리 생성 후 `URL.createObjectURL(blob)`과 `<a download>` 태그로 사용자 다운로드 폴더 자동 다운로드 |
| **3. 암호화 및 비번 해싱 (Crypto)** | Node.js `crypto` 모듈 (`pbkdf2Sync`, `createCipheriv` 등) | **Web Crypto API (`crypto.subtle`) 또는 CryptoJS**<br/>- 브라우저 표준 Web Crypto API / CryptoJS를 활용하여 SHA-256 비밀번호 해싱 및 AES-GCM API 키 암호화 구현 |
| **4. Gemini AI API 연동** | Electron 메인 프로세스 Node.js `https` 모듈에서 프록시 요청 | **브라우저 `fetch()` 직접 호출**<br/>- Google Gemini REST API(`https://generativelanguage.googleapis.com/v1beta/models/...`)는 브라우저 CORS 요청을 기본 지원하므로 클라이언트 direct `fetch()` 연동 |
| **5. 창 포커스 처리 (Focus Issue)** | Windows OS 포커스 훔침 방지용 `mainWindow.blur() / focus()` | **불필요 (제거)**<br/>- 웹 브라우저 폼 요소 및 콤보박스는 OS 창 포커스 이슈가 없으므로 웹 표준 폼 이벤트로 동작 |
| **6. 사용자/교사 계정 관리** | 로컬 JSON 파일 기반의 로그인/회원가입/비밀번호 변경/관리자 기능 | **LocalStorage 기반 사용자 계정 DB 구현**<br/>- 브라우저 로컬 저장소에 계정 테이블 관리 및 관리자(`admin`/`admin123!`) 자동 초기화 |

---

## 2. Web_version 프로젝트 구조 설계

`BehaviorReport/Web_version/` 폴더 내에 Vite + React + TypeScript 기반 웹 프로젝트 생성:

```text
Web_version/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── App.css
    ├── index.css
    ├── types/
    │   └── index.ts          # StudentData, AppConfig, UserAccount 등 타입 정의
    ├── services/
    │   ├── webStorage.ts     # localStorage / IndexedDB 기반 CRUD 서비스
    │   ├── webCrypto.ts      # Web Crypto API 기반 해싱 및 AES 암호화
    │   ├── excelService.ts   # Client-side 엑셀 파싱 및 내보내기 (xlsx)
    │   ├── geminiService.ts  # Browser fetch() 기반 Gemini API 호출
    │   └── authService.ts    # 계정 관리 (로그인, 회원가입, 비번변경, 관리자)
    └── components/
        ├── LoginModal.tsx
        ├── ClassSelector.tsx
        ├── StudentList.tsx
        ├── KeywordSelector.tsx
        ├── OutputEditor.tsx
        └── AdminDashboard.tsx
```

---

## 3. 사용자 검토 필요 사항 (User Review Required)

> [!NOTE]
> **브라우저 캐시 및 용량 정책**
> - `localStorage`는 브라우저당 약 5MB~10MB 용량 제한이 있습니다. 일반적인 학급 수백 명의 학생 데이터와 평어 기록은 용량이 수백 KB 수준이므로 충분합니다.
> - 브라우저 방문 기록 청소(캐시 삭제) 시 데이터가 손실될 수 있으므로, 웹 버전에서는 **데이터 JSON 내보내기/백업** 안내 툴팁 및 자동 다운로드 기능을 강조합니다.

---

## 4. 단계별 실행 계획 (Step-by-Step Implementation)

1. **프로젝트 생성**: `Web_version` 디렉토리 생성 및 `create-vite` (React + TypeScript) 템플릿 구성
2. **의존성 설치**: `xlsx`, `xlsx-js-style`, `lucide-react` 패키지 설치
3. **웹 전용 서비스 구현**:
   - `webStorage.ts`: localStorage 연동 (학급 목록, 학생 데이터, 설정 저장)
   - `webCrypto.ts`: SHA-256 및 AES 암호화 구현
   - `excelService.ts`: HTML5 File API 파일 선택 및 Blob Excel 내보내기
   - `geminiService.ts`: Browser REST `fetch()` API 호출
   - `authService.ts`: 계정 데이터 관리 서비스
4. **UI 컴포넌트 이식 및 반응형 웹 다듬기**:
   - 기존 React 컴포넌트(`App.tsx`, `StudentList`, `OutputEditor`, `AdminDashboard` 등)를 웹 서비스와 바인딩
   - Electron 전용 IPC 호출(`window.electronAPI`)을 `services` 서비스 호출로 교체
5. **검증 및 빌드 확인**:
   - Vite 개발 서버(`npm run dev`) 구동 및 전체 시나리오 검증

---

## 5. 검증 계획 (Verification Plan)

### 마이그레이션 기능 검증
1. **계정 로그인 및 초기화**: `admin` 계정 로그인, 일반 교사 가입/로그인 정상 동작 확인
2. **엑셀 업로드 & 다운로드**: `.xlsx` 파일 드래그앤드롭/선택 업로드 및 템플릿/결과 다운로드 확인
3. **Gemini API 연동**: API Key 입력 후 행동특성 평어 생성 및 글자 수 조절(줄이기/늘리기) 기능 동작 확인
4. **JSON 백업/복구**: 브라우저 다운로드 폴더로 JSON 저장 및 불러오기 정상 작동 테스트
5. **UI & 포커스**: 브라우저 상에서 리사이즈, 세로 높이 조절 drag, 반응형 레이아웃 확인
