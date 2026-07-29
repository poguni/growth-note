import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, FolderOpen } from 'lucide-react';
import { listClasses, saveClassData, deleteClassData } from '../services/webStorage';

interface ClassSelectorProps {
  username: string;
  activeClass: string;
  onClassChange: (className: string) => void;
  onClassDeleted: (className: string) => void;
}

export const ClassSelector: React.FC<ClassSelectorProps> = ({
  username,
  activeClass,
  onClassChange,
  onClassDeleted,
}) => {
  const [classList, setClassList] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [grade, setGrade] = useState('');
  const [room, setRoom] = useState('');
  const [error, setError] = useState('');

  const gradeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddModal) {
      const timer = setTimeout(() => {
        gradeInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showAddModal]);

  const fetchClasses = () => {
    if (!username) return;
    const list = listClasses(username);
    setClassList(list);
  };

  useEffect(() => {
    fetchClasses();
  }, [activeClass, username]);

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedGrade = grade.trim();
    const trimmedRoom = room.trim();

    if (!trimmedGrade || !trimmedRoom) {
      setError('학년과 반을 모두 입력해 주세요.');
      return;
    }

    const cleanGrade = trimmedGrade.endsWith('학년') ? trimmedGrade : `${trimmedGrade}학년`;
    const cleanRoom = trimmedRoom.endsWith('반') ? trimmedRoom : `${trimmedRoom}반`;
    const className = `${cleanGrade} ${cleanRoom}`;

    if (classList.includes(className)) {
      setError('이미 존재하는 학급 이름입니다.');
      return;
    }

    try {
      saveClassData(username, className, []);
      fetchClasses();
      onClassChange(className);
      setGrade('');
      setRoom('');
      setShowAddModal(false);
    } catch (err: any) {
      setError('학급 생성 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleDeleteClass = () => {
    if (!activeClass) return;

    const confirmDelete = window.confirm(
      `정말로 '${activeClass}' 학급을 삭제하시겠습니까?\n학급에 포함된 모든 학생의 평어 작업 데이터가 영구적으로 삭제됩니다.`
    );

    if (confirmDelete) {
      try {
        deleteClassData(username, activeClass);
        onClassDeleted(activeClass);
        fetchClasses();
      } catch (err: any) {
        alert('학급 삭제 중 오류가 발생했습니다: ' + err.message);
      }
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
        <FolderOpen size={18} />
        <span className="caption-small" style={{ fontWeight: 600 }}>학급 선택</span>
      </div>

      <select
        className="input"
        style={{
          width: '160px',
          padding: '6px 10px',
          borderRadius: '8px',
          fontSize: '13px',
          backgroundColor: '#ffffff',
          fontWeight: 500,
          cursor: 'pointer',
        }}
        value={activeClass}
        onChange={(e) => onClassChange(e.target.value)}
      >
        {activeClass === '' && <option value="">-- 학급 선택 --</option>}
        {classList.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <button
        onClick={() => setShowAddModal(true)}
        className="btn btn-secondary"
        title="새 학급 추가"
        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}
      >
        <Plus size={16} />
      </button>

      {activeClass && (
        <button
          onClick={handleDeleteClass}
          className="btn btn-secondary"
          title="현재 학급 삭제"
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            borderColor: 'var(--border)',
            color: 'var(--error)',
          }}
        >
          <Trash2 size={16} />
        </button>
      )}

      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '320px', padding: '20px' }}>
            <form onSubmit={handleAddClass}>
              <h3 className="title-medium" style={{ marginBottom: '12px' }}>새 학급 추가</h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  ref={gradeInputRef}
                  type="text"
                  className="input"
                  placeholder="학년 (예: 3)"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  style={{ fontSize: '13px', flex: 1 }}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="반 (예: 2)"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  style={{ fontSize: '13px', flex: 1 }}
                />
              </div>

              {error && (
                <div style={{ color: 'var(--error)', fontSize: '11px', marginBottom: '12px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
