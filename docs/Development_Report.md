# GrowthNote 개발 보고서

> **프로젝트명**: GrowthNote — 행동특성 및 종합의견 작성 도우미  
> **최종 업데이트**: 2026-07-30  
> **배포 주소**: https://poguni.github.io/growth-note/  
> **저장소**: https://github.com/poguni/growth-note

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [아키텍처 설계](#3-아키텍처-설계)
4. [주요 기능 명세](#4-주요-기능-명세)
   - 4.1 [인증 시스템](#41-인증-시스템)
   - 4.2 [학급 및 학생 관리](#42-학급-및-학생-관리)
   - 4.3 [행동특성 키워드 선택](#43-행동특성-키워드-선택)
   - 4.4 [Gemini AI 평어 생성](#44-gemini-ai-평어-생성)
   - 4.5 [문장 다듬기(윤문) 기능](#45-문장-다듬기윤문-기능)
   - 4.6 [문체 스타일 선택](#46-문체-스타일-선택)
   - 4.7 [데이터 내보내기 및 가져오기](#47-데이터-내보내기-및-가져오기)
   - 4.8 [관리자 대시보드](#48-관리자-대시보드)
5. [보안 설계](#5-보안-설계)
6. [데이터 모델](#6-데이터-모델)
7. [서비스 레이어 상세](#7-서비스-레이어-상세)
8. [디자인 시스템](#8-디자인-시스템)
9. [AI 프롬프트 설계](#9-ai-프롬프트-설계)
10. [한국 표준시(KST) 날짜 처리](#10-한국-표준시kst-날짜-처리)
11. [GitHub Actions 배포 파이프라인](#11-github-actions-배포-파이프라인)
12. [개발 이력 (버전 히스토리)](#12-개발-이력-버전-히스토리)
13. [알려진 이슈 및 개선 과제](#13-알려진-이슈-및-개선-과제)

---

## 1. 프로젝트 개요

GrowthNote는 초·중·고 담임교사가 학생별 행동특성 및 종합의견(생활기록부 평어)을 효율적으로 작성할 수 있도록 돕는 **AI 기반 웹 애플리케이션**이다.

### 핵심 가치

- **Privacy First (로컬 우선 설계)**: 학생 이름·성별·평어 등 일체의 개인정보가 외부 서버로 전송되지 않고 교사 브라우저의 `localStorage`에만 저장된다.
- **BYOK (Bring Your Own Key)**: 교사 개인 Google Gemini API Key를 직접 등록하여 사용하므로 중앙 서버 병목 없이 빠른 응답이 보장된다.
- **교육부 기재요령 준수**: 종결 어미(`~함.`, `~임.`, `~음.`, `~됨.`), 미래지향적 순화 표현, 비교·서열화 금지 원칙을 AI 프롬프트에 내재화했다.
- **1·2학기 연속성 관리**: 1학기 평어를 AI가 맥락으로 참고하여 2학기 평어 작성 시 중복 서술을 자동 회피한다.

### 개발 동기

- Electron 기반 데스크톱 앱으로 먼저 개발 → 교사 간 공유가 어렵고 설치 부담이 큰 문제를 인식
- Vite + React + TypeScript 웹 버전으로 전면 재구축
- GitHub Pages 무료 배포를 통해 URL 하나로 모든 기기에서 접속 가능하도록 개선

---

## 2. 기술 스택

| 구분 | 기술 | 버전 | 역할 |
|:---|:---|:---|:---|
| 빌드 도구 | Vite | 8.1.5 | 빠른 HMR 개발 서버, 최적화 프로덕션 빌드 |
| UI 프레임워크 | React | 19.x | 컴포넌트 기반 UI 렌더링 |
| 언어 | TypeScript | 5.x | 타입 안전성 및 개발 생산성 |
| 스타일링 | Vanilla CSS | — | Micro 디자인 시스템 커스텀 토큰 |
| 아이콘 | Lucide React | 최신 | 경량 SVG 아이콘 라이브러리 |
| AI 연동 | Google Gemini API | v1beta | 평어 문장 자동 생성 |
| 엑셀 처리 | xlsx-js-style | 최신 | 학생 명단 업로드·결과 내보내기 |
| 암호화 | Web Crypto API | 브라우저 내장 | 비밀번호 SHA-256 해싱, API Key AES-GCM 암호화 |
| CI/CD | GitHub Actions | — | 자동 빌드·배포 파이프라인 |
| 호스팅 | GitHub Pages | — | 무료 정적 웹 호스팅 |

---

## 3. 아키텍처 설계

```
┌──────────────────────────────────────────────────────────┐
│                   브라우저 (Client-Side Only)              │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  LoginModal  │  │  App.tsx     │  │ AdminDashboard │  │
│  │  (인증 UI)  │  │  (메인 진입) │  │  (관리자 UI)  │  │
│  └─────────────┘  └──────┬───────┘  └────────────────┘  │
│                           │                              │
│  ┌────────────────────────▼──────────────────────────┐  │
│  │              컴포넌트 레이어                        │  │
│  │  ClassSelector │ StudentList │ KeywordSelector     │  │
│  │  OutputEditor  │                                   │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           │                              │
│  ┌────────────────────────▼──────────────────────────┐  │
│  │              서비스 레이어                         │  │
│  │  authService │ webStorage │ webCrypto              │  │
│  │  geminiService │ excelService                      │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           │                              │
│  ┌────────────────────────▼──────────────────────────┐  │
│  │              저장소 (localStorage)                 │  │
│  │  behavior_report_config (인증·설정)                │  │
│  │  behavior_report_class_{user}_{class} (학생 데이터)│  │
│  │  behavior_report_classes_list_{user} (학급 목록)  │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS REST (사용자 API Key 포함)
                           ▼
              ┌────────────────────────┐
              │  Google Gemini API     │
              │  (generativelanguage   │
              │   .googleapis.com)     │
              └────────────────────────┘
```

---

## 4. 주요 기능 명세

### 4.1 인증 시스템

#### 관리자 계정 (`admin`)
- 하드코딩된 비밀번호 없음. **첫 접속 시** 관리자가 직접 비밀번호를 설정하는 온보딩 플로우 제공.
- 설정된 비밀번호는 SHA-256으로 해시화되어 `localStorage`의 `adminPasswordHash` 필드에 저장.
- 관리자 로그인 후 교사 계정 관리(목록 조회·비밀번호 초기화·계정 삭제) 및 학급별 진행 현황 열람 가능.

#### 교사 계정
- 회원가입 시 아이디 중복 확인 → SHA-256 해시 저장 → `users` 맵에 `{ 아이디: 해시 }` 구조로 기록.
- 로그인 성공 시 세션 메모리에 평문 비밀번호를 임시 보관하여 API Key AES 복호화에 사용 (새로고침 시 재로그인 필요).
- 이전 버전 단일 교사 계정(`passwordHash` 필드)과의 하위 호환성 유지.

#### 비밀번호 직접 변경 기능 (교사 및 관리자)
- 로그인 후 상단 헤더의 **[🔒 비밀번호 변경]** 버튼을 통해 언제든지 본인 계정의 비밀번호를 직접 변경 가능.
- **보안 검증**: 현재 비밀번호 일치 확인 + 새 비밀번호 규칙 검증(영문·숫자 포함 10자리 이상) + 새 비밀번호 재입력 일치 확인.
- **API Key 자동 재암호화**: 비밀번호 변경 시 기존에 저장된 Gemini API Key가 있다면, 새 비밀번호로 즉시 `AES-GCM` 자동 재암호화되어 키 유실 없이 안전하게 보관됨.
- 관리자 계정(`admin`) 역시 관리자 도구 상단에서 관리자 비밀번호를 직접 변경 가능.

#### API Key 보관
- 교사가 "이 브라우저에 안전하게 저장" 체크 시: `AES-GCM` 알고리즘으로 암호화 후 `encryptedKey`로 localStorage 저장.
- 복호화 시 세션에 보관된 교사 비밀번호를 대칭키 소재로 사용 → 타인이 localStorage를 열어봐도 해독 불가.
- 저장 미체크 시: 세션 메모리(React state)에만 임시 보관 → 탭 종료 시 자동 소멸.

---

### 4.2 학급 및 학생 관리

#### 학급 관리
- `ClassSelector` 컴포넌트에서 학급 추가·삭제·전환 관리.
- localStorage 키: `behavior_report_classes_list_{username}` (JSON 배열).
- 마지막으로 선택한 학급을 `config.lastClass`에 기억하여 재로그인 시 자동 복원.

#### 학생 데이터 저장 구조
```typescript
interface StudentData {
  number: number;      // 출석 번호
  name: string;        // 이름
  gender: string;      // 성별 ('남' | '여')
  keywords?: string[]; // 1학기 선택 키워드 목록
  keywords2?: string[];// 2학기 선택 키워드 목록
  comments?: string;   // 1학기 특이사항·관찰 기록
  comments2?: string;  // 2학기 특이사항·관찰 기록
  report?: string;     // 1학기 최종 평어
  report2?: string;    // 2학기 최종 평어
  completed?: boolean; // 작성 완료 여부 (키워드 또는 평어가 있으면 true)
}
```

#### 자동 저장
- `students` state가 변경되면 600ms 디바운스 타이머 후 `saveClassData()` 자동 호출.
- 학생 선택 이동 시 지연 없이 즉시 저장 보장.

#### 엑셀 명단 업로드 (`excelService.ts`)
- `xlsx-js-style` 라이브러리로 `.xlsx` 파일을 클라이언트 사이드에서 파싱.
- 컬럼 키: `번호`, `이름`, `성별` (trim 후 매칭하여 다양한 서식 허용).
- 기존 데이터 존재 시 덮어쓰기 전 confirm 대화상자로 데이터 손실 방지.
- 양식 템플릿 다운로드 기능 제공 (`학생명단_업로드_양식.xlsx`).

---

### 4.3 행동특성 키워드 선택

`KeywordSelector` 컴포넌트는 3개 영역으로 나뉜 탭 UI로 구성:

| 영역 탭 | 영역 색상 버튼 | 최대 선택 |
|:---|:---|:---|
| 인성 영역 | Teal Pulse `#36bab8` | 3개 |
| 학교생활 영역 | Teal Pulse `#36bab8` | 3개 |
| 교과학습 영역 | Teal Pulse `#36bab8` | 3개 |

#### 선택 칩 버튼 스타일
- **미선택**: 밝은 회색 배경 (`#e8e8e8`)
- **선택됨**: **Live Lime `#7efa55`** 배경 + **Forest Edge `#1a3a12`** 텍스트 + `#5ecc38` 테두리

```tsx
// KeywordSelector.tsx 핵심 스타일 로직
const isSelected = selectedKeywords.includes(kw);
style={{
  backgroundColor: isSelected ? '#7efa55' : '#e8e8e8',
  color: isSelected ? '#1a3a12' : '#444',
  border: isSelected ? '1px solid #5ecc38' : '1px solid #ccc',
  boxShadow: isSelected ? '0 2px 6px rgba(126,250,85,0.35)' : 'none',
}}
```

---

### 4.4 Gemini AI 평어 생성

#### 지원 모델
| 모델 | 특징 | 기본값 |
|:---|:---|:---|
| `gemini-3.6-flash` | 최신 추론 모델, `thinkingLevel: MEDIUM` | ✅ 기본값 |
| `gemini-3.7-flash` | 고성능 하이브리드 추론 모델, `thinkingLevel: MEDIUM` | — |
| `gemini-2.5-flash` | 균형형 범용 모델, `temperature: 0.6` | — |

#### API 호출 구조 (`geminiService.ts`)
```typescript
// gemini-3.6-flash & gemini-3.7-flash: Gemini 3 시리즈 사고(Thinking) 레벨 중간(MEDIUM) 설정
generationConfig: { thinkingConfig: { thinkingLevel: 'MEDIUM' } }

// gemini-2.5-flash: 표준 생성 파라미터
generationConfig: { temperature: 0.6, topP: 0.95 }
```

#### 에러 핸들링 (한국어 친화적 메시지)
- 서버 과부하 → "잠시 후 다시 시도해 주세요"
- 할당량 초과 → "약 1분 뒤 다시 시도" 안내
- 잘못된 API Key → Key 재설정 유도
- 지역 미지원 → VPN 확인 안내
- 네트워크 오류 → 연결 확인 안내

#### 목표 글자수(byte) 설정
- 1학기: 200 / 400 / 600 / 800 / 1000 바이트 탭 선택
- 2학기: 동일 구조의 독립 설정값

---

### 4.5 문장 다듬기(윤문) 기능

**문장 다듬기(🪄)** 버튼 클릭 시 이미 생성된 평어를 대상으로 별도의 윤문 프롬프트를 Gemini에 전송하여 사람이 직접 쓴 것처럼 자연스럽게 교정한다.

**윤문 프롬프트 핵심 지시사항:**
- AI가 자주 쓰는 상투적 단어 제거 (`뛰어난`, `탁월한`, `빛나는`, `훌륭한`)
- 추상적 미사여구 대신 교실에서 실제 관찰 가능한 구체적 서술로 전환
- 교육부 종결 어미 원칙 유지 (`~함.`, `~임.`, `~음.`, `~됨.`)
- 문장 길이(byte)가 원문 대비 ±15% 이내로 유지되도록 제한

---

### 4.6 문체 스타일 선택

평어 생성 전 드롭다운으로 3가지 문체 스타일 선택 가능:

| 스타일 | 설명 | 특징 |
|:---|:---|:---|
| 담백·자연스러움 (기본값) | AI 미사여구 제거, 사실 중심 | 가장 자연스럽고 읽기 편함 |
| 표준·격식형 | 생기부 기재요령 표준 어조 | 격식체, 공식적 |
| 칭찬·성장 강조형 | 장점·가능성 중심의 따뜻한 서술 | 학생 격려에 적합 |

---

### 4.7 데이터 내보내기 및 가져오기

#### JSON 백업/복원
- **저장**: `{학급명}_행동특성_종합의견_{YYYYMMDD}.json` 형식으로 브라우저 다운로드 폴더 저장.
- **복원**: JSON 파일 선택 시 `FileReader`로 파싱하여 현재 학급 데이터에 덮어씌움.

#### 엑셀 결과물 내보내기
- **파일명**: `{학급명}_행동특성_평가결과_{YYYYMMDD}.xlsx`
- **컬럼**: 번호, 이름, 성별, 선택 키워드(1·2학기 합산 중복 제거), 1학기 평어, 2학기 평어
- **스타일**: 헤더 볼드·배경색(`#F5F5F5`), 평어 컬럼 텍스트 줄바꿈, 열 너비 자동 조정

#### 1+2학기 전체 복사
- NEIS 등 생기부 시스템에 붙여넣기할 수 있도록 1·2학기 평어를 개행으로 합친 문자열을 클립보드에 복사.

---

### 4.8 관리자 대시보드

`AdminDashboard` 컴포넌트는 `admin` 계정 로그인 시에만 접근 가능하다.

**제공 기능:**
- 전체 교사 계정 목록 조회
- 학급별 진행 현황 열람
- 특정 교사 비밀번호 초기화 (기본값: `assess1234`)
- 교사 계정 삭제 (해당 교사의 학급 데이터도 함께 삭제)

---

## 5. 보안 설계

### 비밀번호 보안
```
[평문 비밀번호]
    │
    ▼ SHA-256 (Web Crypto API)
[64자리 16진수 해시]
    │
    ▼ localStorage 저장
adminPasswordHash / users[username]
```

- 비밀번호 평문은 localStorage에 절대 저장되지 않음.
- 세션 메모리(React state `sessionPassword`)에만 임시 보관 → 새로고침 시 소멸.

### API Key 암호화
```
[Gemini API Key 평문]
    │
    ▼ AES-GCM (12-byte 랜덤 IV) — 파생키: SHA-256(교사비밀번호)
[IV:암호문 hex 문자열]
    │
    ▼ localStorage 저장 (encryptedKey)
```

- 교사마다 다른 비밀번호로 암호화되므로, 같은 브라우저를 공유해도 타인이 API Key를 복호화하는 것이 불가능.

### GitHub 배포 보안
- `.gitignore`: `*.xlsx`, `*.json.bak`, `classes/`, `userData/`, `.env` 등 학생 데이터·비밀 파일 제외.
- `docs/관리자.txt` (개발 메모) 삭제 완료.
- 과거 문서에 기재된 실제 비밀번호 문자열 전면 소독.

---

## 6. 데이터 모델

### localStorage 키 구조

| 키 | 타입 | 내용 |
|:---|:---|:---|
| `behavior_report_config` | `AppConfig` JSON | 관리자 해시, 교사 계정 맵, API Key, 마지막 학급 등 |
| `behavior_report_class_{user}_{class}` | `StudentData[]` JSON | 해당 교사·학급의 전체 학생 데이터 |
| `behavior_report_classes_list_{user}` | `string[]` JSON | 해당 교사의 학급 이름 목록 |

### AppConfig 인터페이스
```typescript
interface AppConfig {
  passwordHash?: string;       // (구버전) 단일 교사 해시
  rememberKey?: boolean;       // API Key 저장 여부
  encryptedKey?: string;       // AES-GCM 암호화된 API Key
  lastClass?: string;          // 마지막 선택 학급
  adminPasswordHash?: string;  // 관리자 비밀번호 SHA-256 해시
  users?: Record<string, string>; // { 아이디: SHA-256해시 }
}
```

---

## 7. 서비스 레이어 상세

### webStorage.ts
- `saveConfig / loadConfig`: AppConfig CRUD
- `saveClassData / loadClassData / deleteClassData`: 학생 데이터 CRUD
- `listClasses`: 교사별 학급 목록 조회
- `saveClassJson`: KST 날짜 기반 JSON 파일 다운로드
- `loadClassJsonFromFile`: FileReader 기반 JSON 복원

### webCrypto.ts
- `hashPassword(password)`: `crypto.subtle.digest('SHA-256')` → hex 문자열
- `encryptKey(text, secret)`: AES-GCM 암호화 (12-byte 랜덤 IV)
- `decryptKey(encryptedText, secret)`: AES-GCM 복호화

### authService.ts
- `login()`: admin 분기 처리 + 구버전 하위 호환 로직
- `register()`: 아이디 중복 확인 + 해시 저장
- `resetUserPassword()`: 비밀번호 `assess1234`로 초기화
- `deleteUser()`: 계정·학급 데이터 일괄 삭제
- `adminListAllData()`: 관리자 대시보드용 전체 데이터 조회

### geminiService.ts
- REST API 직접 호출: `POST /v1beta/models/{model}:generateContent`
- `systemInstruction` 분리 전달 (시스템 프롬프트 + 사용자 프롬프트 이원화)
- 모델별 `generationConfig` 분기 처리
- 한국어 친화 에러 메시지 파싱 (`getFriendlyErrorMessage`)

### excelService.ts
- `parseStudentExcelFile()`: ArrayBuffer → xlsx 파싱 → `StudentInput[]`
- `downloadTemplateExcel()`: 빈 양식 xlsx 생성·다운로드
- `exportResultsExcel()`: 스타일 적용 결과 xlsx 생성·다운로드

---

## 8. 디자인 시스템

Micro 디자인 시스템(`docs/DESIGN(Micro).md`) 기반으로 CSS Custom Properties를 설계했다.

### 색상 토큰

| 토큰 | HEX | 용도 |
|:---|:---|:---|
| `--color-ink-black` | `#221f1c` | 주요 텍스트·배경 |
| `--color-paper-white` | `#f5f5f5` | 캔버스·페이지 배경 |
| `--color-pure-white` | `#ffffff` | 카드·패널 배경 |
| `--color-azure-action` | `#518bdb` | 인터랙티브 요소 |
| `--color-teal-pulse` | `#36bab8` | 주요 버튼(Primary) |
| `--color-coral-marker` | `#ed6d68` | AI 생성 버튼 강조 |
| `--color-live-lime` | `#7efa55` | 선택된 키워드 칩 |
| `--color-forest-edge` | `#1a3a12` | Live Lime 위 텍스트 |

### 폰트 (변경 금지)
```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo',
             'Malgun Gothic', sans-serif;
--font-mono: 'SF Mono', 'Monaco', 'Consolas', monospace;
```

### 버튼 클래스
| 클래스 | 색상 | 사용 버튼 |
|:---|:---|:---|
| `.btn-primary` | Teal Pulse `#36bab8` | 학생 명단 업로드, +, 영역 탭 |
| `.btn-coral` | Coral Marker `#ed6d68` | Gemini AI로 평어 만들기 |
| `.btn-secondary` | 회색 계열 | 보조 동작 버튼 |

---

## 9. AI 프롬프트 설계

### 시스템 프롬프트 (System Instruction)
Gemini API의 `systemInstruction` 필드로 분리 전달되는 역할 정의:
- 초·중·고 생활기록부 작성 전문가 역할 부여
- 교육부 기재 요령 6대 원칙 내재화
  1. 종결 어미: `~함.`, `~임.`, `~음.`, `~됨.`
  2. 비교·서열화 표현 금지
  3. 개인정보 직접 언급 금지 (이름 제외)
  4. 의학적 진단명 사용 금지
  5. 미래지향적 순화 표현 사용
  6. 사실 기반 구체적 서술

### 사용자 프롬프트 구조
```
[학생 정보]
- 이름: {name}
- 성별: {gender}

[선택된 행동특성 키워드]
인성 영역: {keywords.character}
학교생활 영역: {keywords.school}
교과학습 영역: {keywords.learning}

[특이사항 및 관찰 기록]
{comments}

[1학기 평어 - 2학기 작성 시에만 포함]
{report1}

[요청사항]
{semester}학기 행동특성 및 종합의견을 {targetBytes}바이트 내외로 작성하시오.
문체 스타일: {style}
```

### 윤문(문장 다듬기) 프롬프트
- 기존 평어를 입력으로 전달
- AI 상투어 목록 명시적 제거 지시
- byte 범위 제약 (`±15%`)

---

## 10. 한국 표준시(KST) 날짜 처리

### 문제
`new Date().toISOString()`은 UTC 기준이므로, KST(UTC+9) 자정 이전 시간대(00:00~08:59)에 파일을 저장하면 전날 날짜로 파일명이 생성되는 버그.

### 해결
```typescript
// ❌ 잘못된 방법
const date = new Date();
const yyyy = date.getFullYear(); // UTC 기준

// ✅ 올바른 방법
const koreaDate = new Date(
  new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
);
const yyyy = koreaDate.getFullYear(); // KST 기준
const mm = String(koreaDate.getMonth() + 1).padStart(2, '0');
const dd = String(koreaDate.getDate()).padStart(2, '0');
```

**적용 파일**: `webStorage.ts` (`saveClassJson`), `excelService.ts` (`exportResultsExcel`)

---

## 11. GitHub Actions 배포 파이프라인

### 파일 위치
`Web_version/.github/workflows/deploy.yml`

### 워크플로우 흐름
```
push to main
    │
    ▼
[build job]
  1. actions/checkout@v4        ← 소스코드 체크아웃
  2. actions/setup-node@v4      ← Node.js 20 설치 + npm 캐시
  3. npm ci                     ← 의존성 정확 설치
  4. npm run build              ← tsc + vite build → ./dist
  5. actions/configure-pages@v5 ← GitHub Pages 설정
  6. upload-pages-artifact@v3   ← ./dist 업로드
    │
    ▼
[deploy job]
  7. actions/deploy-pages@v4    ← GitHub Pages 배포
```

### 핵심 설정 (`vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [react()],
  base: '/growth-note/',  // 저장소 이름과 반드시 일치해야 함
})
```

> **⚠️ 주의**: GitHub이 자동 생성하는 `static.yml`은 빌드 없이 소스코드 원본을 배포하므로 React 앱에서 빈 화면 문제 발생. 반드시 삭제하고 `deploy.yml` 단독 사용.

---

## 12. 개발 이력 (버전 히스토리)

| 버전 | 날짜 | 주요 변경 사항 |
|:---|:---|:---|
| v0.1 | 초기 | Electron 데스크톱 앱 최초 개발. 로컬 JSON 파일 기반 데이터 저장. |
| v0.2 | — | 다중 교사 계정 지원. SHA-256 비밀번호 해싱. AES 기반 API Key 암호화. |
| v0.3 | — | 관리자 대시보드 추가. 교사 비밀번호 초기화 기능. |
| v1.0 | 2026-07 | **Vite + React + TypeScript 웹 버전으로 전면 재구축.** localStorage 기반 데이터 관리. |
| v1.1 | 2026-07-29 | Micro 디자인 시스템 적용. 버튼 컬러(Teal Pulse·Coral Marker) 커스터마이징. |
| v1.2 | 2026-07-29 | 선택 키워드 칩 색상 Live Lime(`#7efa55`)으로 변경. 문체 스타일 드롭다운 추가. 문장 다듬기(윤문) 기능 추가. |
| v1.3 | 2026-07-30 | KST 날짜 처리 수정. GitHub Actions 자동 배포 파이프라인 구축. 브라우저 타이틀 'GrowthNote'로 변경. HTML lang="ko" 및 meta description SEO 최적화. |
| v1.4 | 2026-08-29 | Gemini 모델 라인업 갱신 (gemini-2.5-flash, gemini-3.6-flash 기본값, gemini-3.7-flash 추가). Gemini 3 시리즈 thinkingLevel: MEDIUM 적용 및 생각 과정(thought parts) 파싱 정제. |

---

## 13. 알려진 이슈 및 개선 과제

### 현재 알려진 이슈

| 우선순위 | 내용 | 영향 |
|:---|:---|:---|
| 낮음 | JS 번들 크기 1.14MB (gzip 403KB). Vite 코드 스플리팅 미적용. | 초기 로딩 속도 |
| 낮음 | `xlsx-js-style` 라이브러리가 번들 크기의 상당 부분 차지 | 초기 로딩 속도 |

### 향후 개선 과제

1. **코드 스플리팅**: `build.rolldownOptions.output.codeSplitting` 활성화로 초기 번들 분할
2. **다국어 지원**: 영어 UI 지원 추가 (포트폴리오 시연용)
3. **진행률 통계 시각화**: 학급별 작성 완료율을 차트로 표시
4. **학생 사진 첨부**: 이름만으로는 학생 특성 기억이 어려운 경우 사진 참고 기능
5. **평어 히스토리**: 학생별 과거 생성 이력 보관·비교 기능
6. **키워드 커스터마이징**: 교사가 자체 키워드를 추가·편집할 수 있는 설정 화면
7. **PWA 지원**: 오프라인 캐싱 및 앱 설치 기능 (Service Worker 적용)
8. **인쇄 최적화**: 학급 전체 평어를 A4 용지 기준으로 인쇄할 수 있는 Print CSS
