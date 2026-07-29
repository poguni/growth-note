import React, { useState, useEffect, useRef } from 'react';
import iconImage from '../assets/icon_3.png';
import bgImage from '../assets/background.jpg';
import { login, register, hasAdminPasswordSet, setupAdminPassword } from '../services/authService';
import { loadConfig } from '../services/webStorage';
import { decryptKey } from '../services/webCrypto';

interface LoginModalProps {
  onUnlock: (username: string, passwordSecret: string, decryptedApiKey: string, isAdmin: boolean) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onUnlock }) => {
  const [view, setView] = useState<'login' | 'register' | 'admin'>('login');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [isAdminConfigured, setIsAdminConfigured] = useState<boolean>(true);

  const [error, setError] = useState('');

  const loginInputRef = useRef<HTMLInputElement>(null);
  const registerInputRef = useRef<HTMLInputElement>(null);
  const adminInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsAdminConfigured(hasAdminPasswordSet());
  }, [view]);

  useEffect(() => {
    setUsername('');
    setPassword('');
    setRegUsername('');
    setRegPassword('');
    setConfirmPassword('');
    setAdminPassword('');
    setAdminConfirmPassword('');
    setError('');

    const timer = setTimeout(() => {
      if (view === 'login') {
        loginInputRef.current?.focus();
      } else if (view === 'register') {
        registerInputRef.current?.focus();
      } else if (view === 'admin') {
        adminInputRef.current?.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [view]);

  const validatePassword = (pwd: string) => {
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const isLongEnough = pwd.length >= 10;
    return hasLetter && hasNumber && isLongEnough;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    try {
      const res = await login({ username: username.trim(), password });
      if (!res.success) {
        setError(res.error || '로그인에 실패했습니다.');
        return;
      }

      let decryptedKey = '';
      const config = loadConfig();
      if (config && config.encryptedKey && config.rememberKey) {
        try {
          decryptedKey = await decryptKey(config.encryptedKey, password);
        } catch (decryptErr) {
          console.error('API Key 복호화 실패:', decryptErr);
        }
      }

      onUnlock(username.trim(), password, decryptedKey, false);
    } catch (err: any) {
      setError('로그인 처리 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = regUsername.trim();
    if (!trimmedUser) {
      setError('아이디(이름)를 입력해 주세요.');
      return;
    }

    if (!validatePassword(regPassword)) {
      setError('비밀번호는 영어와 숫자를 혼용하여 10자리 이상이어야 합니다.');
      return;
    }

    if (regPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const res = await register({ username: trimmedUser, password: regPassword });
      if (!res.success) {
        setError(res.error || '계정 생성에 실패했습니다.');
        return;
      }

      alert('계정이 성공적으로 등록되었습니다. 생성된 계정으로 로그인해 주세요.');
      setView('login');
      setUsername(trimmedUser);
      setPassword('');
      setRegUsername('');
      setRegPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError('계정 등록 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleAdminLoginOrSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Case 1: First-time admin password setup
    if (!isAdminConfigured) {
      if (!validatePassword(adminPassword)) {
        setError('관리자 비밀번호는 영어와 숫자를 혼용하여 10자리 이상이어야 합니다.');
        return;
      }

      if (adminPassword !== adminConfirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }

      try {
        const ok = await setupAdminPassword(adminPassword);
        if (ok) {
          alert('관리자 비밀번호가 성공적으로 설정되었습니다!');
          onUnlock('admin', adminPassword, '', true);
        } else {
          setError('관리자 비밀번호 저장 중 오류가 발생했습니다.');
        }
      } catch (err: any) {
        setError('비밀번호 설정 실패: ' + err.message);
      }
      return;
    }

    // Case 2: Standard admin login
    if (!adminPassword) {
      setError('관리자 비밀번호를 입력해 주세요.');
      return;
    }

    try {
      const res = await login({ username: 'admin', password: adminPassword });
      if (!res.success) {
        setError(res.error || '관리자 비밀번호가 일치하지 않습니다.');
        return;
      }

      onUnlock('admin', adminPassword, '', true);
    } catch (err: any) {
      setError('관리자 로그인 처리 중 오류가 발생했습니다: ' + err.message);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'transparent',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.30)',
        }}
      />
      <div
        className="modal-content"
        style={{
          maxWidth: '400px',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          position: 'relative',
          zIndex: 1,
          backgroundColor: 'rgba(255,255,255,0.95)',
        }}
      >
        {view === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <img
                src={iconImage}
                alt="App Logo"
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '20px',
                  margin: '0 auto 16px auto',
                  display: 'block',
                  objectFit: 'cover'
                }}
              />
              <h2 className="title-large" style={{ marginBottom: '8px' }}>선생님 로그인</h2>
              <p className="caption-small">아이디와 비밀번호를 입력해 로그인해 주세요.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label className="caption-small" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>아이디(이름)</label>
                <input
                  ref={loginInputRef}
                  type="text"
                  className="input"
                  placeholder="아이디 입력"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="caption-small" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>비밀번호</label>
                <input
                  type="password"
                  className="input"
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginBottom: '16px' }}>
              로그인
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '13px', marginBottom: '24px' }}>
              <span 
                onClick={() => { setView('register'); setError(''); }} 
                style={{ color: 'var(--link)', cursor: 'pointer', fontWeight: 600 }}
              >
                새 계정 만들기 (선생님용)
              </span>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={() => { setView('admin'); setError(''); }} 
                className="btn btn-secondary" 
                style={{ width: '100%', fontSize: '12px', padding: '8px' }}
              >
                관리자로 로그인하기
              </button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 className="title-large" style={{ marginBottom: '8px' }}>선생님 계정 등록</h2>
              <p className="caption-small">브라우저 로컬 저장소에 계정을 등록합니다.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label className="caption-small" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>아이디(이름)</label>
                <input
                  ref={registerInputRef}
                  type="text"
                  className="input"
                  placeholder="사용할 ID 입력 (예. 박○○, 5-5, 5학년3반 등)"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="caption-small" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>비밀번호</label>
                <input
                  type="password"
                  className="input"
                  placeholder="영어 + 숫자 조합 10자리 이상"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="caption-small" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>비밀번호 재확인</label>
                <input
                  type="password"
                  className="input"
                  placeholder="비밀번호 동일 입력"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginBottom: '16px' }}>
              계정 생성 완료
            </button>

            <div style={{ textAlign: 'center', fontSize: '13px' }}>
              <span 
                onClick={() => { setView('login'); setError(''); }} 
                style={{ color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                로그인 화면으로 돌아가기
              </span>
            </div>
          </form>
        )}

        {view === 'admin' && (
          <form onSubmit={handleAdminLoginOrSetup}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#333333',
                color: '#ffffff',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                fontWeight: 800,
                fontSize: '24px'
              }}>
                🛠️
              </div>
              <h2 className="title-large" style={{ marginBottom: '8px' }}>
                {isAdminConfigured ? '관리자 인증' : '최초 관리자 비밀번호 설정'}
              </h2>
              <p className="caption-small">
                {isAdminConfigured
                  ? '관리자 계정으로 시스템을 관리합니다.'
                  : '시스템을 관리할 전용 비밀번호를 최초 1회 설정해 주세요.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label className="caption-small" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>관리자 아이디</label>
                <input
                  type="text"
                  className="input"
                  value="admin"
                  disabled
                  style={{ backgroundColor: 'var(--surface-fill)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                />
              </div>

              <div>
                <label className="caption-small" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  {isAdminConfigured ? '비밀번호' : '신규 관리자 비밀번호'}
                </label>
                <input
                  ref={adminInputRef}
                  type="password"
                  className="input"
                  placeholder={isAdminConfigured ? '관리자 비밀번호 입력' : '영어 + 숫자 조합 10자리 이상'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>

              {!isAdminConfigured && (
                <div>
                  <label className="caption-small" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>비밀번호 재확인</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="동일 비밀번호 입력"
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            {error && (
              <div style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginBottom: '16px', backgroundColor: '#333333', color: '#ffffff' }}>
              {isAdminConfigured ? '관리자 로그인' : '관리자 비밀번호 설정 및 로그인'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '13px' }}>
              <span 
                onClick={() => { setView('login'); setError(''); }} 
                style={{ color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                일반 선생님 로그인으로 돌아가기
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
