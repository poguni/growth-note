import React, { useState, useRef } from 'react';
import { Upload, Download, Check, Trash2, Plus } from 'lucide-react';
import boyIcon from '../assets/boy.png';
import girlIcon from '../assets/girl.png';
import type { StudentData } from '../types';

interface StudentListProps {
  students: StudentData[];
  selectedStudentId: number | null;
  onSelectStudent: (number: number) => void;
  onUploadExcelFile: (file: File) => void;
  onDownloadTemplate: () => void;
  onAddStudent: (name: string, gender: string) => void;
  onDeleteStudent: (number: number) => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  onUploadExcelFile,
  onDownloadTemplate,
  onAddStudent,
  onDeleteStudent,
}) => {
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'남' | '여'>('남');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateStudent = () => {
    if (!newStudentName.trim()) {
      alert('학생 이름을 입력해 주세요.');
      return;
    }
    onAddStudent(newStudentName.trim(), newStudentGender);
    setNewStudentName('');
    setNewStudentGender('남');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadExcelFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const completedCount = students.filter((s) => s.completed).length;
  const totalCount = students.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Top action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '13px', padding: '10px' }}
        >
          <Upload size={16} />
          학생 명단 엑셀 업로드
        </button>

        <button
          onClick={onDownloadTemplate}
          className="btn btn-secondary"
          style={{ width: '100%', fontSize: '12px', padding: '8px', border: '1px dashed var(--border)' }}
        >
          <Download size={14} />
          양식 다운로드 (.xlsx)
        </button>
      </div>

      {/* Add Student Form */}
      <div style={{
        padding: '12px',
        backgroundColor: 'var(--surface-fill)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>학생 추가 (전입)</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            className="input"
            placeholder="이름"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            style={{ flex: 2, padding: '4px 8px', fontSize: '12px', height: '32px', backgroundColor: '#ffffff' }}
          />
          <select
            className="input"
            value={newStudentGender}
            onChange={(e) => setNewStudentGender(e.target.value as '남' | '여')}
            style={{ flex: 1.2, padding: '4px 6px', fontSize: '12px', height: '32px', backgroundColor: '#ffffff', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <option value="남">남</option>
            <option value="여">여</option>
          </select>
          <button
            type="button"
            onClick={handleCreateStudent}
            className="btn btn-primary"
            style={{ padding: '0 8px', height: '32px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="학생 추가"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Progress tracker */}
      {totalCount > 0 && (
        <div
          style={{
            backgroundColor: 'var(--surface-elevated)',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '6px',
              fontWeight: 600,
              fontSize: '12px',
            }}
          >
            <span>평어 작성 진행률</span>
            <span>
              {completedCount} / {totalCount}명 ({Math.round((completedCount / totalCount) * 100)}%)
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--surface-fill)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(completedCount / totalCount) * 100}%`,
                height: '100%',
                backgroundColor: 'var(--primary)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Student List View */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {totalCount === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: 'var(--text-light)',
              fontSize: '13px',
              textAlign: 'center',
              gap: '8px',
            }}
          >
            <span>등록된 학생이 없습니다.</span>
            <span>엑셀 파일을 업로드해 주세요.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {students.map((student) => {
              const isSelected = selectedStudentId === student.number;
              return (
                <div
                  key={student.number}
                  onClick={() => onSelectStudent(student.number)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--color-pure-white)' : 'transparent',
                    color: 'var(--color-ink-black)',
                    border: isSelected ? '1px solid rgba(81, 139, 219, 0.4)' : '1px solid transparent',
                    borderLeft: isSelected ? '4px solid var(--color-azure-action)' : '4px solid transparent',
                    boxShadow: isSelected ? 'var(--shadow-subtle)' : 'none',
                    transition: 'all var(--transition-fast)',
                  }}
                  className="student-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={student.gender === '남' ? boyIcon : girlIcon}
                      alt="Student Avatar"
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        backgroundColor: 'var(--surface-fill)',
                      }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px', fontWeight: isSelected ? 700 : 500 }}>
                        {student.number}번 {student.name}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-stone-gray)',
                        }}
                      >
                        {student.gender}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {student.completed && (
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--color-mint-wash)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-forest-edge)',
                          border: '1px solid rgba(54, 186, 184, 0.3)',
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteStudent(student.number);
                      }}
                      title="학생 삭제"
                      style={{
                        padding: '4px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        color: isSelected ? 'rgba(34,34,34,0.7)' : 'var(--text-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
