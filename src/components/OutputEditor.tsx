import React from 'react';
import { RotateCw, ArrowDownWideNarrow, ArrowUpNarrowWide, Trash2, Sparkles, HelpCircle, Copy, Check, Wand2 } from 'lucide-react';

interface OutputEditorProps {
  report: string;
  report2: string;
  onReportChange: (text: string) => void;
  onReport2Change: (text: string) => void;
  semester: '1' | '2';
  onSemesterChange: (sem: '1' | '2') => void;
  targetBytes1: number;
  targetBytes2: number;
  onTargetBytes1Change: (bytes: number) => void;
  onTargetBytes2Change: (bytes: number) => void;
  onGenerate: (styleOption: 'natural' | 'standard' | 'warm') => void;
  onPolish: (styleOption: 'natural' | 'standard' | 'warm') => void;
  onModifyLength: (action: 'shorten' | 'lengthen') => void;
  onDelete: () => void;
  isLoading: boolean;
  selectedStudentName: string | null;
  fontSizeLevel: 1 | 2 | 3;
}

export const getByteLength = (str: string): number => {
  let byteLen = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 127) {
      byteLen += 1;
    } else {
      byteLen += 2;
    }
  }
  return byteLen;
};

interface InlineSemesterEditorProps {
  report: string;
  report2: string;
  onChange: (text: string) => void;
  disabled: boolean;
  fontSizeLevel: 1 | 2 | 3;
}

const InlineSemesterEditor: React.FC<InlineSemesterEditorProps> = ({
  report,
  report2,
  onChange,
  disabled,
  fontSizeLevel,
}) => {
  const getAdjustedFontSize = (base: number) => `${base + (fontSizeLevel - 1) * 1.5}px`;
  const editorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      
      const span1 = document.createElement('span');
      span1.style.color = '#2563eb';
      span1.style.fontWeight = '500';
      span1.contentEditable = 'false';
      span1.style.userSelect = 'none';
      span1.innerText = report ? `${report} ` : '';
      editorRef.current.appendChild(span1);

      const span2 = document.createElement('span');
      span2.style.color = 'var(--text-primary)';
      span2.innerText = report2 || '';
      editorRef.current.appendChild(span2);
    }
  }, [report]);

  React.useEffect(() => {
    if (editorRef.current && editorRef.current.children.length >= 2) {
      const span2 = editorRef.current.children[1] as HTMLSpanElement;
      if (span2 && span2.innerText !== report2) {
        span2.innerText = report2 || '';
      }
    }
  }, [report2]);

  const handleInput = () => {
    if (editorRef.current) {
      if (editorRef.current.children.length < 2) {
        editorRef.current.innerHTML = '';
        const span1 = document.createElement('span');
        span1.style.color = '#2563eb';
        span1.style.fontWeight = '500';
        span1.contentEditable = 'false';
        span1.style.userSelect = 'none';
        span1.innerText = report ? `${report} ` : '';
        editorRef.current.appendChild(span1);

        const span2 = document.createElement('span');
        span2.style.color = 'var(--text-primary)';
        span2.innerText = '';
        editorRef.current.appendChild(span2);
        
        onChange('');
        span2.focus();
        return;
      }
      const span2 = editorRef.current.children[1] as HTMLSpanElement;
      const val = span2.innerText || '';
      onChange(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace' && editorRef.current && editorRef.current.children.length >= 2) {
      const span2 = editorRef.current.children[1] as HTMLSpanElement;
      if (span2 && span2.innerText === '') {
        e.preventDefault();
      }
    }
  };

  return (
    <div
      ref={editorRef}
      contentEditable={!disabled}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      style={{
        flex: 1,
        fontSize: getAdjustedFontSize(14),
        lineHeight: '1.6',
        padding: '16px',
        backgroundColor: disabled ? 'var(--surface-elevated)' : 'var(--canvas)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'auto',
        outline: 'none',
        whiteSpace: 'pre-wrap',
        minHeight: '150px',
        height: '200px',
        resize: disabled ? 'none' : 'vertical',
        textAlign: 'left',
      }}
    />
  );
};

export const OutputEditor: React.FC<OutputEditorProps> = ({
  report,
  report2,
  onReportChange,
  onReport2Change,
  semester,
  onSemesterChange,
  targetBytes1,
  targetBytes2,
  onTargetBytes1Change,
  onTargetBytes2Change,
  onGenerate,
  onPolish,
  onModifyLength,
  onDelete,
  isLoading,
  selectedStudentName,
  fontSizeLevel,
}) => {
  const [copied, setCopied] = React.useState(false);
  const getAdjustedFontSize = (base: number) => `${base + (fontSizeLevel - 1) * 1.5}px`;

  const targetBytes = semester === '1' ? targetBytes1 : targetBytes2;
  const onTargetBytesChange = semester === '1' ? onTargetBytes1Change : onTargetBytes2Change;
  const currentReport = semester === '1' ? report : report2;
  const currentBytes = getByteLength(currentReport);

  const lengthOptions = [200, 400, 600, 800, 1000];

  const handleCopyAll = async () => {
    const combined = report && report2
      ? `${report} ${report2}`
      : report || report2 || '';
    try {
      await navigator.clipboard.writeText(combined);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = combined;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [styleOption, setStyleOption] = React.useState<'natural' | 'standard' | 'warm'>('natural');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Semester Tab Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: '2px', alignItems: 'flex-end' }}>
        <button
          onClick={() => onSemesterChange('1')}
          type="button"
          style={{
            padding: '8px 16px',
            fontSize: getAdjustedFontSize(13),
            fontWeight: semester === '1' ? 700 : 500,
            color: semester === '1' ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: semester === '1' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            marginBottom: '-3px',
          }}
        >
          1학기
        </button>
        <button
          onClick={() => onSemesterChange('2')}
          type="button"
          style={{
            padding: '8px 16px',
            fontSize: getAdjustedFontSize(13),
            fontWeight: semester === '2' ? 700 : 500,
            color: semester === '2' ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: semester === '2' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            marginBottom: '-3px',
          }}
        >
          2학기
        </button>

        {semester === '2' && (report || report2) && selectedStudentName && (
          <button
            type="button"
            onClick={handleCopyAll}
            style={{
              marginLeft: 'auto',
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              fontSize: getAdjustedFontSize(12),
              fontWeight: 600,
              borderRadius: '8px',
              border: copied ? '1px solid var(--success)' : '1px solid var(--border)',
              backgroundColor: copied ? 'rgba(71,184,129,0.1)' : 'var(--canvas)',
              color: copied ? 'var(--success)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? '복사됨!' : '1+2학기 전체 복사'}
          </button>
        )}
      </div>

      {/* Control row: Target Bytes selection, Style dropdown, Polish button, Generate button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="caption-small" style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: getAdjustedFontSize(12) }}>
            {semester === '1' ? '1학기' : '2학기'} 목표 글자수:
          </span>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--surface-fill)', padding: '3px', borderRadius: '10px' }}>
            {lengthOptions.map((bytes) => (
              <button
                key={bytes}
                onClick={() => onTargetBytesChange(bytes)}
                type="button"
                style={{
                  padding: '4px 10px',
                  fontSize: getAdjustedFontSize(12),
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: targetBytes === bytes ? '#ffffff' : 'transparent',
                  fontWeight: targetBytes === bytes ? 700 : 500,
                  color: targetBytes === bytes ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: targetBytes === bytes ? 'var(--shadow-minimal)' : 'none',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {bytes}byte
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* 문체 스타일 선택 Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: getAdjustedFontSize(12), fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              문체 스타일:
            </label>
            <select
              value={styleOption}
              onChange={(e) => setStyleOption(e.target.value as any)}
              className="input"
              style={{
                padding: '6px 10px',
                fontSize: getAdjustedFontSize(12),
                borderRadius: '8px',
                borderColor: 'var(--border)',
                backgroundColor: 'var(--canvas)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <option value="natural">담백·자연스러움 (추천)</option>
              <option value="standard">표준·격식형</option>
              <option value="warm">칭찬·성장 강조형</option>
            </select>
          </div>

          {/* 문장 다듬기 Button */}
          <button
            type="button"
            onClick={() => onPolish(styleOption)}
            disabled={isLoading || !selectedStudentName || !currentReport.trim()}
            className="btn btn-secondary"
            title="현재 평어 문장을 더욱 자연스럽고 인간적인 어조로 윤문합니다."
            style={{
              padding: '7px 12px',
              fontSize: getAdjustedFontSize(12),
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 600,
              backgroundColor: '#ffffff',
              borderColor: 'var(--border)',
              cursor: (isLoading || !selectedStudentName || !currentReport.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !selectedStudentName || !currentReport.trim()) ? 0.5 : 1,
            }}
          >
            <Wand2 size={13} />
            문장 다듬기
          </button>

          {/* Gemini AI로 평어 만들기 Button */}
          <button
            type="button"
            onClick={() => onGenerate(styleOption)}
            disabled={isLoading || !selectedStudentName}
            className="btn btn-coral"
            style={{
              padding: '8px 16px',
              fontSize: getAdjustedFontSize(13),
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-minimal)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={14} />
            {isLoading ? '생성 중...' : 'Gemini AI로 평어 만들기'}
          </button>
        </div>
      </div>

      {/* Output text editor area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {semester === '1' ? (
          <textarea
            className="textarea"
            value={report}
            onChange={(e) => onReportChange(e.target.value)}
            disabled={!selectedStudentName || isLoading}
            placeholder={
              selectedStudentName
                ? `'${selectedStudentName}' 학생의 키워드를 선택한 후, 평어 만들기 버튼을 눌러주세요. 생성된 결과는 여기서 자유롭게 수정 가능합니다.`
                : '좌측 명단에서 학생을 선택해 주세요.'
            }
            style={{
              flex: 1,
              fontSize: getAdjustedFontSize(14),
              lineHeight: '1.6',
              padding: '16px',
              backgroundColor: selectedStudentName ? 'var(--canvas)' : 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              minHeight: '150px',
              height: '200px',
              resize: (!selectedStudentName || isLoading) ? 'none' : 'vertical',
            }}
          />
        ) : (
          <InlineSemesterEditor
            report={report}
            report2={report2}
            onChange={onReport2Change}
            disabled={!selectedStudentName || isLoading}
            fontSizeLevel={fontSizeLevel}
          />
        )}

        {selectedStudentName && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '16px',
              fontSize: getAdjustedFontSize(11),
              backgroundColor: 'rgba(30,30,30,0.05)',
              color: currentBytes > targetBytes ? 'var(--error)' : 'var(--text-secondary)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              zIndex: 5,
            }}
          >
            글자수: {currentBytes} / {targetBytes} Byte
          </div>
        )}
      </div>

      {/* Action toolbar at the bottom */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border)',
          paddingTop: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-light)' }}>
          <HelpCircle size={12} />
          <span style={{ fontSize: getAdjustedFontSize(11) }}>수정 내용은 다음 학생 이동 시 자동으로 저장됩니다.</span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => onGenerate(styleOption)}
            disabled={isLoading || !currentReport || !selectedStudentName}
            className="btn btn-secondary"
            title="동일 조건으로 다시 만들기"
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}
          >
            <RotateCw size={14} />
            <span style={{ fontSize: getAdjustedFontSize(11), fontWeight: 600 }}>다시 만들기</span>
          </button>

          <button
            onClick={() => onModifyLength('shorten')}
            disabled={isLoading || !currentReport || !selectedStudentName}
            className="btn btn-secondary"
            title="문장 분량 줄이기"
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}
          >
            <ArrowDownWideNarrow size={14} />
            <span style={{ fontSize: getAdjustedFontSize(11), fontWeight: 600 }}>줄이기</span>
          </button>

          <button
            onClick={() => onModifyLength('lengthen')}
            disabled={isLoading || !currentReport || !selectedStudentName}
            className="btn btn-secondary"
            title="문장 분량 늘리기"
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}
          >
            <ArrowUpNarrowWide size={14} />
            <span style={{ fontSize: getAdjustedFontSize(11), fontWeight: 600 }}>늘리기</span>
          </button>

          <button
            onClick={onDelete}
            disabled={isLoading || !currentReport || !selectedStudentName}
            className="btn btn-secondary"
            title="작성내용 초기화"
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--error)',
              borderColor: 'var(--border)',
            }}
          >
            <Trash2 size={14} />
            <span style={{ fontSize: getAdjustedFontSize(11), fontWeight: 600 }}>삭제</span>
          </button>
        </div>
      </div>
    </div>
  );
};
