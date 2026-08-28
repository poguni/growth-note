import React, { useState, useEffect } from 'react';
import { User, Users, FolderOpen, BookOpen, Key, LogOut, FileSpreadsheet, CheckCircle, Circle, Trash2, RefreshCw, Lock } from 'lucide-react';
import type { StudentData } from '../types';
import { adminListAllData, resetUserPassword, deleteUser } from '../services/authService';
import { loadClassData, saveClassData, deleteClassData } from '../services/webStorage';
import { exportResultsExcel } from '../services/excelService';
import { ChangePasswordModal } from './ChangePasswordModal';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [teachers, setTeachers] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState<{ username: string; className: string }[]>([]);

  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);

  const loadAdminData = () => {
    try {
      const res = adminListAllData();
      if (res) {
        setTeachers(res.users);
        setAllClasses(res.classes);
      }
    } catch (err: any) {
      alert('데이터를 로드하는 중 오류가 발생했습니다: ' + err.message);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const teacherClasses = selectedTeacher
    ? allClasses.filter((c) => c.username === selectedTeacher).map((c) => c.className)
    : [];

  useEffect(() => {
    if (selectedTeacher && selectedClass) {
      const data = loadClassData(selectedTeacher, selectedClass);
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
    } else {
      setStudents([]);
      setSelectedStudentId(null);
    }
  }, [selectedTeacher, selectedClass]);

  const handleResetPassword = async (teacherId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmReset = window.confirm(
      `정말로 '${teacherId}' 선생님의 비밀번호를 초기화하시겠습니까?\n비밀번호는 'assess1234'로 초기화됩니다.`
    );
    if (!confirmReset) return;

    try {
      const success = await resetUserPassword({ username: teacherId });
      if (success) {
        alert(`'${teacherId}' 선생님의 비밀번호가 'assess1234'로 성공적으로 초기화되었습니다.`);
      } else {
        alert('비밀번호 초기화에 실패했습니다.');
      }
    } catch (err: any) {
      alert('오류가 발생했습니다: ' + err.message);
    }
  };

  const handleDeleteUser = async (teacherId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmDelete = window.confirm(
      `정말로 '${teacherId}' 선생님 계정을 삭제하시겠습니까?\n이 선생님 및 이와 연결된 모든 학급과 학생 평가 데이터가 영구히 삭제되며 복구할 수 없습니다.`
    );
    if (!confirmDelete) return;

    try {
      const success = await deleteUser({ username: teacherId });
      if (success) {
        alert(`'${teacherId}' 선생님 계정이 성공적으로 삭제되었습니다.`);
        if (selectedTeacher === teacherId) {
          setSelectedTeacher(null);
          setSelectedClass(null);
          setStudents([]);
          setSelectedStudentId(null);
        }
        loadAdminData();
      } else {
        alert('계정 삭제에 실패했습니다.');
      }
    } catch (err: any) {
      alert('오류가 발생했습니다: ' + err.message);
    }
  };

  const handleDeleteClass = (className: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedTeacher) return;
    const confirmDelete = window.confirm(
      `정말로 '${selectedTeacher}' 선생님의 '${className}' 학급을 삭제하시겠습니까?\n학급 내 모든 학생 정보와 평가 데이터가 영구적으로 함께 삭제됩니다.`
    );
    if (!confirmDelete) return;

    try {
      deleteClassData(selectedTeacher, className);
      alert(`'${className}' 학급이 성공적으로 삭제되었습니다.`);
      if (selectedClass === className) {
        setSelectedClass(null);
        setStudents([]);
        setSelectedStudentId(null);
      }
      loadAdminData();
    } catch (err: any) {
      alert('학급 삭제 실패: ' + err.message);
    }
  };

  const handleDeleteAllStudents = () => {
    if (!selectedTeacher || !selectedClass) return;
    const confirmDelete = window.confirm(
      `정말로 '${selectedClass}' 학급의 모든 학생 명단과 평가 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
    );
    if (!confirmDelete) return;

    try {
      saveClassData(selectedTeacher, selectedClass, []);
      setStudents([]);
      setSelectedStudentId(null);
      alert('모든 학생 데이터가 삭제되었습니다.');
    } catch (err: any) {
      alert('삭제 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleResetStudentData = (studentNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedTeacher || !selectedClass) return;
    const studentName = students.find(s => s.number === studentNum)?.name;
    const confirmReset = window.confirm(
      `정말로 '${studentName}' 학생의 키워드 및 생성된 평어 평가 데이터를 초기화하시겠습니까?`
    );
    if (!confirmReset) return;

    const updated = students.map((s) => {
      if (s.number === studentNum) {
        return {
          ...s,
          keywords: [],
          comments: '',
          report: '',
          completed: false,
        };
      }
      return s;
    });

    try {
      saveClassData(selectedTeacher, selectedClass, updated);
      setStudents(updated);
      alert('평가 데이터가 초기화되었습니다.');
    } catch (err: any) {
      alert('초기화 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleDeleteStudent = (studentNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedTeacher || !selectedClass) return;
    const studentName = students.find(s => s.number === studentNum)?.name;
    const confirmDelete = window.confirm(
      `정말로 '${studentName}' 학생을 명단에서 삭제하시겠습니까?\n삭제 후 나머지 학생들의 번호가 순차적으로 재정렬됩니다.`
    );
    if (!confirmDelete) return;

    const filtered = students.filter((s) => s.number !== studentNum);
    const updated = filtered.map((s, idx) => ({
      ...s,
      number: idx + 1,
    }));

    try {
      saveClassData(selectedTeacher, selectedClass, updated);
      setStudents(updated);
      if (selectedStudentId === studentNum) {
        if (updated.length > 0) {
          setSelectedStudentId(updated[0].number);
        } else {
          setSelectedStudentId(null);
        }
      } else if (selectedStudentId !== null && selectedStudentId > studentNum) {
        setSelectedStudentId(selectedStudentId - 1);
      }
      alert('학생이 명단에서 삭제되었습니다.');
    } catch (err: any) {
      alert('삭제 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleExportClassExcel = () => {
    if (students.length === 0) {
      alert('내보낼 학생 데이터가 없습니다.');
      return;
    }

    try {
      exportResultsExcel(selectedClass || '학급', students);
      alert('최종 결과 엑셀 파일 저장이 완료되었습니다.');
    } catch (err: any) {
      alert('엑셀 저장 실패: ' + err.message);
    }
  };

  const selectedStudent = students.find((s) => s.number === selectedStudentId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f5f5' }}>
      <header
        style={{
          height: '60px',
          backgroundColor: '#333333',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          color: '#ffffff',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ backgroundColor: 'var(--primary)', padding: '6px 10px', borderRadius: '10px', color: '#000000' }}>
              🛠️
            </span>
            <span>행동특성 및 종합의견 [웹 관리자 도구]</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowAdminPasswordModal(true)}
            className="btn btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '8px',
              backgroundColor: '#444444',
              color: '#ffffff',
              border: '1px solid #555555',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Lock size={14} />
            관리자 비밀번호 변경
          </button>

          <button
            onClick={onLogout}
            className="btn btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '8px',
              backgroundColor: '#444444',
              color: '#ffffff',
              border: '1px solid #555555',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <LogOut size={14} />
            로그아웃
          </button>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <aside
          style={{
            width: '300px',
            backgroundColor: 'var(--canvas)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', backgroundColor: '#fafafa' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
              <Users size={18} />
              등록된 선생님 목록 ({teachers.length}명)
            </h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {teachers.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '20px' }}>
                등록된 선생님이 없습니다.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {teachers.map((teacher) => (
                  <div
                    key={teacher}
                    onClick={() => {
                      setSelectedTeacher(teacher);
                      setSelectedClass(null);
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedTeacher === teacher ? 'rgba(254, 229, 0, 0.15)' : 'transparent',
                      border: selectedTeacher === teacher ? '1px solid var(--primary)' : '1px solid transparent',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#eee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                      }}>
                        <User size={16} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: selectedTeacher === teacher ? 600 : 400 }}>
                        {teacher}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={(e) => handleResetPassword(teacher, e)}
                        title="비밀번호 초기화"
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          color: '#666',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Key size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteUser(teacher, e)}
                        title="선생님 삭제"
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          color: 'var(--error)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <aside
          style={{
            width: '260px',
            backgroundColor: 'var(--canvas)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', backgroundColor: '#fafafa' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
              <FolderOpen size={18} />
              학급 목록 ({teacherClasses.length}개)
            </h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {!selectedTeacher ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '20px' }}>
                좌측에서 선생님을 선택해 주세요.
              </p>
            ) : teacherClasses.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '20px' }}>
                등록된 학급이 없습니다.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {teacherClasses.map((className) => (
                  <div
                    key={className}
                    onClick={() => setSelectedClass(className)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedClass === className ? '#f0f0f0' : 'transparent',
                      border: selectedClass === className ? '1px solid #ddd' : '1px solid transparent',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: selectedClass === className ? 600 : 400 }}>
                      🏫 {className}
                    </span>
                    <button
                      onClick={(e) => handleDeleteClass(className, e)}
                      title="학급 삭제"
                      style={{
                        padding: '4px',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        color: 'var(--error)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'var(--surface-elevated)',
          }}
        >
          {!selectedTeacher || !selectedClass ? (
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
              <BookOpen size={32} />
              <div className="title-medium">선생님 및 학급을 선택하여 학생 평가 내역을 조회하세요.</div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: 'var(--canvas)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                    {selectedTeacher} 선생님 / {selectedClass} 학급 현황
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    총 {students.length}명의 학생 중 {students.filter((s) => s.completed).length}명 완료됨
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleDeleteAllStudents}
                    className="btn btn-secondary"
                    style={{
                      padding: '8px 14px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      color: 'var(--error)',
                      border: '1px solid var(--error)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Trash2 size={16} />
                    학생 전체 삭제
                  </button>
                  <button
                    onClick={handleExportClassExcel}
                    className="btn btn-secondary"
                    style={{
                      padding: '8px 14px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--primary)',
                      color: 'var(--on-primary)',
                      border: 'none',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <FileSpreadsheet size={16} />
                    해당 학급 엑셀 저장
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '20px', gap: '20px' }}>
                <section
                  style={{
                    backgroundColor: 'var(--canvas)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    overflowY: 'auto',
                    minHeight: '300px',
                    height: '420px',
                    maxHeight: '520px',
                    boxShadow: 'var(--shadow-minimal)',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                      <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 12px', width: '80px', fontWeight: 600 }}>번호</th>
                        <th style={{ padding: '10px 12px', width: '100px', fontWeight: 600 }}>이름</th>
                        <th style={{ padding: '10px 12px', width: '80px', fontWeight: 600 }}>성별</th>
                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>선택된 키워드</th>
                        <th style={{ padding: '10px 12px', width: '90px', textAlign: 'center', fontWeight: 600 }}>상태</th>
                        <th style={{ padding: '10px 12px', width: '180px', textAlign: 'center', fontWeight: 600 }}>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr
                          key={student.number}
                          onClick={() => setSelectedStudentId(student.number)}
                          style={{
                            borderBottom: '1px solid #f0f0f0',
                            cursor: 'pointer',
                            backgroundColor: selectedStudentId === student.number ? 'rgba(254, 229, 0, 0.08)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{student.number}번</td>
                          <td style={{ padding: '8px 12px' }}>{student.name}</td>
                          <td style={{ padding: '8px 12px' }}>{student.gender}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {student.keywords && student.keywords.length > 0 ? student.keywords.join(', ') : '-'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {student.completed ? (
                              <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 600 }}>
                                <CheckCircle size={14} />
                                완료
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <Circle size={14} />
                                작성 중
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                onClick={(e) => handleResetStudentData(student.number, e)}
                                title="평가 데이터 초기화"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '6px',
                                  border: '1px solid #ddd',
                                  backgroundColor: '#ffffff',
                                  cursor: 'pointer',
                                  color: '#666',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                <RefreshCw size={11} />
                                초기화
                              </button>
                              <button
                                onClick={(e) => handleDeleteStudent(student.number, e)}
                                title="학생 삭제"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '6px',
                                  border: '1px solid #ddd',
                                  backgroundColor: '#ffffff',
                                  cursor: 'pointer',
                                  color: 'var(--error)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                <Trash2 size={11} />
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                {selectedStudent && (
                  <section
                    style={{
                      backgroundColor: 'var(--canvas)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                      [{selectedStudent.number}번 {selectedStudent.name}] 상세 평가 및 완성문 확인
                    </h3>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        선택된 행동발달 키워드
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedStudent.keywords && selectedStudent.keywords.length > 0 ? (
                          selectedStudent.keywords.map((kw) => (
                            <span
                              key={kw}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: '#f0f0f0',
                                borderRadius: '12px',
                                fontSize: '12px',
                                color: '#444',
                              }}
                            >
                              {kw}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>선택된 키워드가 없습니다.</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        선생님 관찰 추가 의견
                      </div>
                      <div
                        style={{
                          padding: '10px 12px',
                          backgroundColor: '#f9f9f9',
                          border: '1px solid #eee',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: '#555',
                          minHeight: '40px',
                        }}
                      >
                        {selectedStudent.comments || '(작성된 추가 의견 없음)'}
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        1학기 평어 문장
                      </div>
                      <textarea
                        readOnly
                        value={selectedStudent.report || '(생성된 평어가 없습니다)'}
                        style={{
                          width: '100%',
                          height: '80px',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          fontSize: '13px',
                          lineHeight: '1.5',
                          backgroundColor: '#fafafa',
                          color: selectedStudent.report ? '#333' : 'var(--text-muted)',
                          resize: 'none',
                          cursor: 'default',
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        2학기 평어 문장
                      </div>
                      <textarea
                        readOnly
                        value={selectedStudent.report2 || '(생성된 평어가 없습니다)'}
                        style={{
                          width: '100%',
                          height: '80px',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          fontSize: '13px',
                          lineHeight: '1.5',
                          backgroundColor: '#fafafa',
                          color: selectedStudent.report2 ? '#333' : 'var(--text-muted)',
                          resize: 'none',
                          cursor: 'default',
                        }}
                      />
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <ChangePasswordModal
        isOpen={showAdminPasswordModal}
        onClose={() => setShowAdminPasswordModal(false)}
        username="admin"
        onPasswordChanged={() => {}}
      />
    </div>
  );
};
