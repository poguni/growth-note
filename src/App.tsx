import React, { useState, useEffect, useRef } from 'react';
import { Key, Save, AlertTriangle, HelpCircle, ZoomIn, ZoomOut, Download, Upload, LogOut, Lock, User } from 'lucide-react';
import { LoginModal } from './components/LoginModal';
import { ClassSelector } from './components/ClassSelector';
import { StudentList } from './components/StudentList';
import { KeywordSelector } from './components/KeywordSelector';
import { OutputEditor } from './components/OutputEditor';
import { AdminDashboard } from './components/AdminDashboard';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import iconImage from './assets/icon_3.png';
import type { StudentData } from './types';
import { loadConfig, saveConfig, listClasses, loadClassData, saveClassData, saveClassJson, loadClassJsonFromFile } from './services/webStorage';
import { encryptKey } from './services/webCrypto';
import { parseStudentExcelFile, downloadTemplateExcel, exportResultsExcel } from './services/excelService';
import { generateReport } from './services/geminiService';

export const App: React.FC = () => {
  // Authentication & Locking
  const [unlocked, setUnlocked] = useState(false);
  const [username, setUsername] = useState('');
  const [sessionPassword, setSessionPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Class & Student Registry
  const [activeClass, setActiveClass] = useState('');
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [semester, setSemester] = useState<'1' | '2'>('1');

  // Gemini Configuration
  const [apiKey, setApiKey] = useState('');
  const [rememberKey, setRememberKey] = useState(false);
  const [model, setModel] = useState<'gemini-3.6-flash' | 'gemini-3.7-flash' | 'gemini-2.5-flash'>('gemini-3.6-flash');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempRememberKey, setTempRememberKey] = useState(false);

  // Evaluation Inputs for Selected Student
  const [targetBytes1, setTargetBytes1] = useState<number>(400);
  const [targetBytes2, setTargetBytes2] = useState<number>(400);
  const [isLoading, setIsLoading] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<1 | 2 | 3>(1);

  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showApiKeyModal) {
      const timer = setTimeout(() => {
        apiKeyInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showApiKeyModal]);

  const handleUnlock = async (user: string, passwordSecret: string, decryptedApiKey: string, adminStatus: boolean) => {
    setUsername(user);
    setSessionPassword(passwordSecret);
    setApiKey(decryptedApiKey);
    setIsAdmin(adminStatus);
    
    if (adminStatus) {
      setUnlocked(true);
      return;
    }
    
    const config = loadConfig();
    if (config) {
      setRememberKey(!!config.rememberKey);
      if (config.lastClass) {
        const userClasses = listClasses(user);
        if (userClasses.includes(config.lastClass)) {
          setActiveClass(config.lastClass);
          try {
            const data = loadClassData(user, config.lastClass);
            if (data) {
              setStudents(data);
              if (data.length > 0) {
                setSelectedStudentId(data[0].number);
              } else {
                setSelectedStudentId(null);
              }
            }
          } catch (err) {
            console.error('마지막 학급 데이터 자동 로드 실패:', err);
          }
        }
      }
    }
    
    setUnlocked(true);
  };

  useEffect(() => {
    if (unlocked && activeClass && !isAdmin) {
      const data = loadClassData(username, activeClass);
      if (data) {
        setStudents(data);
        if (data.length > 0) {
          setSelectedStudentId(data[0].number);
        } else {
          setSelectedStudentId(null);
        }
      } else {
        setStudents([]);
        setSelectedStudentId(null);
      }

      const config = loadConfig();
      const updatedConfig = { ...(config || {}), lastClass: activeClass };
      saveConfig(updatedConfig);
    }
  }, [activeClass, unlocked, username, isAdmin]);

  useEffect(() => {
    if (unlocked && activeClass && students.length > 0 && !isAdmin) {
      const timer = setTimeout(() => {
        saveClassData(username, activeClass, students);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [students, activeClass, unlocked, username, isAdmin]);

  const selectedStudent = students.find((s) => s.number === selectedStudentId);

  const updateActiveStudent = (fields: Partial<StudentData>) => {
    if (selectedStudentId === null) return;
    setStudents((prev) =>
      prev.map((s) => {
        if (s.number === selectedStudentId) {
          const updated = { ...s, ...fields };
          const hasKeywords = (updated.keywords && updated.keywords.length > 0) || (updated.keywords2 && updated.keywords2.length > 0);
          const hasReport = !!(updated.report && updated.report.trim()) || !!(updated.report2 && updated.report2.trim());
          updated.completed = hasKeywords || hasReport;
          return updated;
        }
        return s;
      })
    );
  };

  const handleUploadExcelFile = async (file: File) => {
    if (!activeClass) {
      alert('학생 명단을 업로드할 학급을 선택하거나 먼저 생성해 주세요.');
      return;
    }

    if (students.length > 0) {
      const overwrite = window.confirm(
        `현재 '${activeClass}' 학급에 등록된 학생 데이터가 존재합니다.\n새 명단을 업로드하여 기존 데이터를 덮어쓰시겠습니까? (이전 기록은 유실됩니다.)`
      );
      if (!overwrite) return;
    }

    try {
      const imported = await parseStudentExcelFile(file);
      if (imported && imported.length > 0) {
        const formatted: StudentData[] = imported.map((std) => ({
          ...std,
          keywords: [],
          comments: '',
          report: '',
          completed: false,
        }));
        setStudents(formatted);
        saveClassData(username, activeClass, formatted);
        setSelectedStudentId(formatted[0].number);
        alert(`성공적으로 ${formatted.length}명의 학생 명단을 불러왔습니다.`);
      }
    } catch (err: any) {
      alert('엑셀 업로드 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadTemplateExcel();
    } catch (err: any) {
      alert('양식 다운로드 실패: ' + err.message);
    }
  };

  const handleExportExcel = () => {
    if (students.length === 0) {
      alert('내보낼 학생 데이터가 없습니다.');
      return;
    }

    try {
      exportResultsExcel(activeClass, students);
    } catch (err: any) {
      alert('엑셀 저장 실패: ' + err.message);
    }
  };

  const handleSaveJson = () => {
    if (!activeClass) {
      alert('학급을 먼저 선택해 주세요.');
      return;
    }
    if (students.length === 0) {
      alert('저장할 학생 데이터가 없습니다.');
      return;
    }

    try {
      const success = saveClassJson(activeClass, students);
      if (success) {
        alert('현재 학급 데이터가 JSON 파일로 다운로드 폴더에 저장되었습니다.');
      }
    } catch (err: any) {
      alert('JSON 저장 실패: ' + err.message);
    }
  };

  const handleJsonFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    e.target.value = '';

    try {
      const data = await loadClassJsonFromFile(file);
      if (data) {
        setStudents(data);
        if (data.length > 0) {
          setSelectedStudentId(data[0].number);
        } else {
          setSelectedStudentId(null);
        }
        alert('JSON 파일 데이터를 성공적으로 불러왔습니다.');
      }
    } catch (err: any) {
      alert('JSON 불러오기 실패: ' + err.message);
    }
  };

  const handleLoadJsonClick = () => {
    if (!activeClass) {
      alert('학급을 먼저 선택해 주세요.');
      return;
    }

    const confirmOverwrite = window.confirm(
      'JSON 파일을 불러오면 현재 학급의 학생 데이터가 덮어씌워집니다. 계속하시겠습니까?'
    );
    if (!confirmOverwrite) return;

    jsonFileInputRef.current?.click();
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm('로그아웃 하시겠습니까?');
    if (confirmLogout) {
      setUnlocked(false);
      setUsername('');
      setSessionPassword('');
      setApiKey('');
      setIsAdmin(false);
      setActiveClass('');
      setStudents([]);
      setSelectedStudentId(null);
    }
  };

  const openApiKeySettings = () => {
    setTempApiKey(apiKey);
    setTempRememberKey(rememberKey);
    setShowApiKeyModal(true);
  };

  const saveApiKeySettings = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let encryptedKey = '';
      if (tempRememberKey && tempApiKey.trim()) {
        encryptedKey = await encryptKey(tempApiKey.trim(), sessionPassword);
      }

      const config = loadConfig() || {};
      saveConfig({
        ...config,
        rememberKey: tempRememberKey,
        encryptedKey: encryptedKey,
      });

      setApiKey(tempApiKey.trim());
      setRememberKey(tempRememberKey);
      setShowApiKeyModal(false);
      alert('API Key 설정이 저장되었습니다.');
    } catch (err: any) {
      alert('설정 저장 실패: ' + err.message);
    }
  };

  const getStyleDirective = (style: 'natural' | 'standard' | 'warm') => {
    if (style === 'natural') {
      return '상투적인 미사여구(매사에, 솔선수범하여, 타의 귀감이 됨 등)와 전형적인 AI 틀을 지양하고, 실제 담임교사가 교실에서 직접 관찰한 듯 담백하고 구체적인 교실 정황 중심으로 자연스럽게 서술하세요.';
    } else if (style === 'warm') {
      return '학생의 긍정적인 성품, 작은 노력, 발전 가능성을 적극 강조하고 따뜻하고 격려하는 어조로 서술하세요.';
    }
    return '전통적인 학교생활기록부 기재요령 표준 규격을 엄격히 준수하여 정중하고 격식 있는 교사 평어 어조로 서술하세요.';
  };

  const handleGenerateReport = async (styleOption: 'natural' | 'standard' | 'warm' = 'natural') => {
    if (!apiKey) {
      alert('상단 API Key 버튼을 클릭하여 Gemini API Key를 먼저 입력해 주세요.');
      openApiKeySettings();
      return;
    }

    if (!selectedStudent) return;

    const selectedKeywords = semester === '1'
      ? (selectedStudent.keywords || [])
      : (selectedStudent.keywords2 || []);

    if (selectedKeywords.length === 0) {
      alert('최소 1개 이상의 키워드를 선택해 주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const targetBytes = semester === '1' ? targetBytes1 : targetBytes2;
      const styleInstruction = getStyleDirective(styleOption);

      const systemInstruction = `[Role & Persona]
  당신은 대한민국 교육부의 학교생활기록부 기재 요령을 완벽하게 숙지하고 있는 "경력 15년 차의 베테랑 초등학교 교사"이자 "초등 교육 과정 및 아동 발달 전문가"입니다. 학부모와 학생에게 신뢰를 주며, 교육청 감사 기준에 부합하는 격식 있고 완성도 높은 '행동특성 및 종합의견(평어)'을 작성하는 것이 당신의 임무입니다.

[Core Rules - 생기부 작성 원칙]
  1. 객관적이고 격식 있는 어조: 문장의 맺음말은 반드시 [~함.], [~임.], [~음.], [~됨.]으로 마무리하고 명사형/단정적 어미로 통일하세요. (~합니다, ~입니다 등 경어체 절대 금지)
  2. 긍정적이고 발전적인 서술: 학생의 단점이나 부정적인 면을 직접적으로 언급하지 마세요. 만약 부족한 점이나 개선이 필요한 성향이 유추되더라도, 반드시 "앞으로 ~ 측면에서 성장이 기대됨", "~를 위해 노력하는 자세가 필요함" 등과 같이 미래지향적이고 발전적인 방향으로 순화하여 표현해야 합니다.
  3. ${styleInstruction}
  4. 자연스러운 문장 연결: 제공된 키워드들을 단순히 나열하지 말고, 문맥상 가장 매끄럽고 유기적인 한 편의 글로 연결하세요. 문장의 흐름을 돕는 연결어를 적절히 활용하되 과도하지 않게 사용하세요.
  5. 사실 기반의 구체성: 과장되거나 상투적인 미사여구는 지양하고, 교실 공간에서 실제 관찰된 듯한 담백하고 신뢰감 주는 어조를 유지하세요.

[Input Data Structure]
  - 학생 정보: [이름], [성별]
  - 선택된 핵심 키워드 목록 (최대 9개)
  - 선생님의 추가 의견 (자유 서술형 단서)
  - 목표 문장 길이: [200byte / 400byte / 600byte / 800byte / 1000byte 중 하나]

[Output Generation Guide]
  1. 입력 받은 [이름]을 문장 내에서 사용하지 말아 주세요.
  2. 선택된 키워드들과 '선생님의 추가 의견'이 문장 안에서 모순 없이 자연스럽게 융합되도록 하세요. 특히 선생님의 추가 의견이 있다면 이를 문장의 핵심 하이라이트로 다루어 신뢰도를 높이세요.
  3. 지정된 '목표 문장 길이(Byte)'를 최대한 준수하여 문장을 완성하세요. (공백 포함 한국어 1자는 약 2~3byte로 계산하되, 목표 길이를 심각하게 초과하거나 미달하지 않도록 조절하십시오.)
  4. 최종 출력은 다른 군더더기 설명(인사말, 코드 블록, "네, 작성했습니다" 등의 답변) 없이, 오직 학교생활기록부에 바로 복사·붙여넣기 할 수 있는 '최종 평어 문장'만 반환하세요.`;

      const studentComments = semester === '1'
        ? (selectedStudent.comments || '')
        : (selectedStudent.comments2 || '');

      let prompt = `다음 [Input Data Structure]를 바탕으로 학생의 '행동특성 및 종합의견'을 작성해 주십시오.

[학생 정보]
이름: ${selectedStudent.name}
성별: ${selectedStudent.gender}

[선택된 핵심 키워드 목록]
${selectedKeywords.join(', ')}

[선생님의 추가 의견]
${studentComments || '(없음)'}

[목표 문장 길이]
${targetBytes}byte`;

      if (semester === '2') {
        prompt += `\n\n[1학기 평어 내용 (참고용)]\n${selectedStudent.report || '(없음)'}\n\n위 1학기 평어 내용과 자연스럽게 흐름이 연결되며 중복되는 표현을 피하여, 2학기에 관찰된 행동 특성(선택된 핵심 키워드 목록 및 선생님의 추가 의견)만을 바탕으로 작성한 추가 평어 문장을 반환해 주십시오.`;
      }

      const result = await generateReport({
        model,
        apiKey,
        systemInstruction,
        prompt,
      });

      if (semester === '1') {
        updateActiveStudent({ report: result });
      } else {
        updateActiveStudent({ report2: result });
      }
    } catch (err: any) {
      alert('평어 생성 실패: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePolishReport = async (styleOption: 'natural' | 'standard' | 'warm' = 'natural') => {
    if (!apiKey) {
      alert('상단 API Key 버튼을 클릭하여 Gemini API Key를 먼저 입력해 주세요.');
      openApiKeySettings();
      return;
    }

    if (!selectedStudent) return;

    const currentReport = semester === '1' ? selectedStudent.report : selectedStudent.report2;
    if (!currentReport || !currentReport.trim()) {
      alert('다듬을 평어 문장이 없습니다. 먼저 평어를 생성하거나 입력해 주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const styleInstruction = getStyleDirective(styleOption);

      const systemInstruction = `당신은 경력 15년 차의 베테랑 초등학교 교사이자 문장 윤문 전문가입니다.
기존 생기부 평어 문장을 더욱 자연스럽고 사람이 직접 쓴 것 같은 고품질 어조로 다듬는 것이 임무입니다.

[윤문 지침]
1. 문장의 맺음말은 반드시 [~함.], [~임.], [~음.], [~됨.] 어미를 엄격히 유지하세요. (~합니다, ~입니다 등 경어체 금지)
2. AI가 만든 문장처럼 느껴지는 상투적인 미사여구(매사에, 솔선수범 등)를 없애고 실제 담임교사가 교실에서 직접 관찰한 듯 자연스럽게 다듬어 주세요.
3. ${styleInstruction}
4. 부연 설명이나 코드 블록 없이 오직 다듬어진 최종 평어 문장만 반환하세요.`;

      const prompt = `다음 학생의 평어 문장을 지정된 스타일(${styleOption === 'natural' ? '담백·자연스러움' : styleOption === 'warm' ? '칭찬·성장 강조' : '표준·격식'})에 맞춰 더욱 자연스럽고 매끄럽게 다듬어 주십시오.

[기존 평어 문장]
${currentReport}`;

      const result = await generateReport({
        model,
        apiKey,
        systemInstruction,
        prompt,
      });

      if (semester === '1') {
        updateActiveStudent({ report: result });
      } else {
        updateActiveStudent({ report2: result });
      }
    } catch (err: any) {
      alert('문장 다듬기 실패: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModifyLength = async (action: 'shorten' | 'lengthen') => {
    if (!apiKey) {
      alert('Gemini API Key를 먼저 입력해 주세요.');
      return;
    }

    if (!selectedStudent) return;
    const currentReport = semester === '1' ? selectedStudent.report : selectedStudent.report2;
    if (!currentReport) return;

    setIsLoading(true);

    try {
      const systemInstruction = `귀하는 대한민국 초등학교의 담임선생님입니다.
학교생활기록부 '행동특성 및 종합의견'의 기존 평어 문맥을 유지하며 분량을 수정해 주십시오.

[필수 작성 규칙]
1. 모든 문장의 끝(종결어미)은 반드시 [~함.], [~임.], [~음.], [~됨.]의 명사형 종결어미 및 온점(.)으로 끝나야 합니다.
2. 절대로 다른 어미 형태로 끝마치지 마십시오.
3. 부정적 표현은 완곡하고 교육학적인 문체로 긍정적으로 기재해 주십시오.`;

      const targetBytes = semester === '1' ? targetBytes1 : targetBytes2;

      const prompt =
        action === 'shorten'
          ? `다음 문장의 의미를 훼손하지 않으면서 글의 핵심만을 요약하여, 전체 분량을 약 ${targetBytes} Byte 이하로 줄여주십시오.
          
[기존 문장]
"${currentReport}"

이 조건을 엄격하게 준수하여 [~함.], [~임.], [~음.], [~됨.] 어미 구조로 다듬어진 축소형 평어 문장을 한국어로 다시 써 주십시오.`
          : `다음 문장의 문맥을 풍성하게 보완하고 구체적인 문장들을 덧붙여, 전체 분량을 약 ${targetBytes} Byte 정도로 늘려 주십시오.
          
[기존 문장]
"${currentReport}"

이 조건을 엄격하게 준수하여 [~함.], [~임.], [~음.], [~됨.] 어미 구조로 작성된 구체화된 평어 문장을 한국어로 다시 써 주십시오.`;

      const result = await generateReport({
        model,
        apiKey,
        systemInstruction,
        prompt,
      });

      if (semester === '1') {
        updateActiveStudent({ report: result });
      } else {
        updateActiveStudent({ report2: result });
      }
    } catch (err: any) {
      alert('문장 길이 수정 실패: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReport = () => {
    if (!selectedStudent) return;
    const confirmClear = window.confirm(
      `현재 '${selectedStudent.name}' 학생의 ${semester}학기 평어 문장 및 선택된 모든 행동특성 데이터를 초기화하시겠습니까?`
    );
    if (confirmClear) {
      if (semester === '1') {
        updateActiveStudent({
          keywords: [],
          comments: '',
          report: '',
          completed: !!(selectedStudent.report2 && selectedStudent.report2.trim()),
        });
      } else {
        updateActiveStudent({
          keywords: [],
          comments: '',
          report2: '',
          completed: !!(selectedStudent.report && selectedStudent.report.trim()),
        });
      }
    }
  };

  const handleAddStudentDirectly = (name: string, gender: string) => {
    if (!activeClass) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('학생 이름을 입력해 주세요.');
      return;
    }
    const nextNum = students.length > 0 ? Math.max(...students.map((s) => s.number)) + 1 : 1;
    const newStudent: StudentData = {
      number: nextNum,
      name: trimmedName,
      gender,
      keywords: [],
      keywords2: [],
      comments: '',
      comments2: '',
      report: '',
      report2: '',
      completed: false,
    };
    const updated = [...students, newStudent];
    setStudents(updated);
    saveClassData(username, activeClass, updated);
    setSelectedStudentId(nextNum);
  };

  const handleDeleteStudentDirectly = (number: number) => {
    if (!activeClass) return;
    const studentName = students.find((s) => s.number === number)?.name;
    const confirmDelete = window.confirm(
      `정말로 '${studentName}' 학생을 명단에서 삭제하시겠습니까?\n삭제 후 나머지 학생들의 번호가 순차적으로 재정렬됩니다.`
    );
    if (!confirmDelete) return;

    const filtered = students.filter((s) => s.number !== number);
    const updated = filtered.map((s, idx) => ({
      ...s,
      number: idx + 1,
    }));

    setStudents(updated);
    saveClassData(username, activeClass, updated);

    if (selectedStudentId === number) {
      if (updated.length > 0) {
        setSelectedStudentId(updated[0].number);
      } else {
        setSelectedStudentId(null);
      }
    } else if (selectedStudentId !== null && selectedStudentId > number) {
      setSelectedStudentId(selectedStudentId - 1);
    }
  };

  if (!unlocked) {
    return <LoginModal key={`login-modal-${unlocked}`} onUnlock={handleUnlock} />;
  }

  if (isAdmin) {
    return (
      <AdminDashboard
        onLogout={() => {
          setUnlocked(false);
          setUsername('');
          setSessionPassword('');
          setIsAdmin(false);
          setActiveClass('');
          setStudents([]);
        }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--canvas)' }}>
      <input
        ref={jsonFileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleJsonFileSelected}
      />

      <header
        style={{
          height: '60px',
          backgroundColor: 'var(--color-pure-white)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-minimal)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: '18px',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <img
              src={iconImage}
              alt="Logo"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                objectFit: 'cover'
              }}
            />
            <span style={{ whiteSpace: 'nowrap' }}>행동특성 및 종합의견</span>
          </div>

          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border)' }} />

          <ClassSelector
            username={username}
            activeClass={activeClass}
            onClassChange={(name) => {
              setActiveClass(name);
              setStudents([]);
              setSelectedStudentId(null);
            }}
            onClassDeleted={(name) => {
              if (activeClass === name) {
                setActiveClass('');
                setStudents([]);
                setSelectedStudentId(null);
              }
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 5 }}>
          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setFontSizeLevel((prev) => Math.max(1, prev - 1) as 1 | 2 | 3)}
              disabled={fontSizeLevel === 1}
              className="btn btn-secondary"
              title="글자 크기 작게"
              style={{
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: fontSizeLevel === 1 ? 'not-allowed' : 'pointer',
                opacity: fontSizeLevel === 1 ? 0.5 : 1,
              }}
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={() => setFontSizeLevel((prev) => Math.min(3, prev + 1) as 1 | 2 | 3)}
              disabled={fontSizeLevel === 3}
              className="btn btn-secondary"
              title="글자 크기 크게"
              style={{
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: fontSizeLevel === 3 ? 'not-allowed' : 'pointer',
                opacity: fontSizeLevel === 3 ? 0.5 : 1,
              }}
            >
              <ZoomIn size={14} />
            </button>
          </div>

          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleSaveJson}
              disabled={!activeClass || students.length === 0}
              className="btn btn-secondary"
              title="JSON 저장하기"
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (!activeClass || students.length === 0) ? 'not-allowed' : 'pointer',
              }}
            >
              <Download size={14} />
            </button>

            <button
              onClick={handleLoadJsonClick}
              disabled={!activeClass}
              className="btn btn-secondary"
              title="JSON 불러오기"
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: !activeClass ? 'not-allowed' : 'pointer',
              }}
            >
              <Upload size={14} />
            </button>

            <button
              onClick={handleExportExcel}
              disabled={!activeClass || students.length === 0}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
                border: 'none',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: (!activeClass || students.length === 0) ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={14} />
              <span>엑셀로 결과 저장</span>
            </button>
          </div>

          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={openApiKeySettings}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                borderColor: apiKey ? 'var(--success)' : 'var(--border)',
                backgroundColor: apiKey ? 'rgba(71, 184, 129, 0.05)' : 'transparent',
                color: apiKey ? 'var(--success)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Key size={14} />
              <span>{apiKey ? 'API Key 등록 완료' : 'Gemini API Key 입력'}</span>
            </button>

            <select
              className="input"
              style={{
                width: '180px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border)',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              value={model}
              onChange={(e) => setModel(e.target.value as any)}
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-3.6-flash">gemini-3.6-flash</option>
              <option value="gemini-3.7-flash">gemini-3.7-flash</option>
            </select>
          </div>

          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border)' }} />

          {/* Teacher Account & Change Password & Logout (Icon-only with Tooltips) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              title={`현재 로그인: ${username} 선생님`}
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'rgba(54, 186, 184, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(54, 186, 184, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-teal-pulse)',
                cursor: 'default',
              }}
            >
              <User size={18} />
            </div>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="btn btn-secondary"
              title="비밀번호 변경"
              style={{
                width: '32px',
                height: '32px',
                padding: 0,
                borderRadius: '8px',
                borderColor: 'var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <Lock size={17} />
            </button>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              title="로그아웃"
              style={{
                width: '32px',
                height: '32px',
                padding: 0,
                borderRadius: '8px',
                borderColor: 'var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <aside
          style={{
            width: '260px',
            backgroundColor: 'var(--canvas)',
            borderRight: '1px solid var(--border)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'hidden',
          }}
        >
          <StudentList
            students={students}
            selectedStudentId={selectedStudentId}
            onSelectStudent={(num) => {
              setSelectedStudentId(num);
              const student = students.find((s) => s.number === num);
              const hasData =
                (student?.keywords && student.keywords.length > 0) ||
                (student?.keywords2 && student.keywords2.length > 0) ||
                !!(student?.report && student.report.trim()) ||
                !!(student?.report2 && student.report2.trim());
              if (!hasData) {
                setSemester('1');
              }
            }}
            onUploadExcelFile={handleUploadExcelFile}
            onDownloadTemplate={handleDownloadTemplate}
            onAddStudent={handleAddStudentDirectly}
            onDeleteStudent={handleDeleteStudentDirectly}
          />
        </aside>

        <main
          style={{
            flex: 1,
            backgroundColor: 'var(--surface-elevated)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {activeClass === '' ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                gap: '12px',
              }}
            >
              <AlertTriangle size={32} />
              <div className="title-medium">화면 상단에서 학급을 생성하거나 선택해 주세요.</div>
            </div>
          ) : selectedStudentId === null ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                gap: '12px',
              }}
            >
               <HelpCircle size={32} />
              <div className="title-medium">좌측 학생 명단에서 학생을 선택해 주세요.</div>
              <p className="caption-small">명단이 비어있는 경우 엑셀 명단 파일 업로드를 진행해 주세요.</p>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '20px', gap: '20px' }}>
              <section
                style={{
                  flex: '1.2 0 auto',
                  minHeight: '280px',
                  backgroundColor: 'var(--canvas)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <h3 className="title-medium">
                    {selectedStudent?.number}번 {selectedStudent?.name} ({selectedStudent?.gender}) 평가 입력
                  </h3>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <KeywordSelector
                    key={selectedStudentId ?? 'none'}
                    selectedKeywords={selectedStudent?.keywords || []}
                    selectedKeywords2={selectedStudent?.keywords2 || []}
                    onChange={(keywords) => updateActiveStudent({ keywords })}
                    onChange2={(keywords2) => updateActiveStudent({ keywords2 })}
                    comments={semester === '1' ? (selectedStudent?.comments || '') : (selectedStudent?.comments2 || '')}
                    onCommentsChange={(val) => updateActiveStudent(semester === '1' ? { comments: val } : { comments2: val })}
                    semester={semester}
                    fontSizeLevel={fontSizeLevel}
                  />
                </div>
              </section>

              <section
                style={{
                  flex: '1 0 auto',
                  minHeight: '260px',
                  backgroundColor: 'var(--canvas)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <OutputEditor
                  report={selectedStudent?.report || ''}
                  report2={selectedStudent?.report2 || ''}
                  onReportChange={(report) => updateActiveStudent({ report })}
                  onReport2Change={(report2) => updateActiveStudent({ report2 })}
                  semester={semester}
                  onSemesterChange={setSemester}
                  targetBytes1={targetBytes1}
                  targetBytes2={targetBytes2}
                  onTargetBytes1Change={setTargetBytes1}
                  onTargetBytes2Change={setTargetBytes2}
                  onGenerate={handleGenerateReport}
                  onPolish={handlePolishReport}
                  onModifyLength={handleModifyLength}
                  onDelete={handleDeleteReport}
                  isLoading={isLoading}
                  selectedStudentName={selectedStudent?.name || null}
                  fontSizeLevel={fontSizeLevel}
                />
              </section>
            </div>
          )}
        </main>
      </div>

      {showApiKeyModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <form onSubmit={saveApiKeySettings}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}>
                  🔑
                </div>
                <h3 className="title-medium">Gemini API Key 설정</h3>
              </div>
              
              <p className="caption-small" style={{ marginBottom: '16px', lineHeight: '1.4' }}>
                구글 AI 스튜디오에서 발급받은 Gemini API 키를 입력해 주세요. 이 키는 브라우저 로컬 암호화 저장소에 보관되거나 임시 사용 후 소멸합니다.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <input
                  ref={apiKeyInputRef}
                  type="password"
                  className="input"
                  placeholder="AI API Key 입력 (AIzaSy...)"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={tempRememberKey}
                    onChange={(e) => setTempRememberKey(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>API Key 비밀번호로 로컬 암호화 저장</span>
                </label>
                <span className="caption-small" style={{ paddingLeft: '24px', color: 'var(--text-muted)' }}>
                  체크 해제 시 웹 브라우저 창이 닫힐 때 메모리에서 소멸합니다.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '8px' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '8px' }}
                >
                  확인
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        username={username}
        currentApiKey={apiKey}
        onPasswordChanged={(newPassword) => {
          setSessionPassword(newPassword);
        }}
      />
    </div>
  );
};
