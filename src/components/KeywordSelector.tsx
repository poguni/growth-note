import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface KeywordSelectorProps {
  selectedKeywords: string[];
  selectedKeywords2: string[];
  onChange: (keywords: string[]) => void;
  onChange2: (keywords: string[]) => void;
  comments: string;
  onCommentsChange: (text: string) => void;
  semester: '1' | '2';
  fontSizeLevel: 1 | 2 | 3;
}

interface CategoryData {
  key: string;
  label: string;
  subcategories: {
    label: string;
    items: string[];
  }[];
}

const KEYWORDS_DATA: CategoryData[] = [
  {
    key: 'personality',
    label: '인성 영역',
    subcategories: [
      { label: '자기 관리', items: ['감정 조절', '끈기', '성실', '소신', '열정', '자기주도성', '절제', '정직', '책임감', '회복탄력성'] },
      { label: '대인 관계', items: ['감사', '겸손', '경청', '관용', '나눔', '다양성 존중', '배려', '신뢰', '친절', '타인 존중'] },
      { label: '공동체 의식', items: ['갈등 해결 능력', '공정', '관계지향성', '규칙 준수', '봉사', '협력', '환경/생태 감수성'] }
    ]
  },
  {
    key: 'schoolLife',
    label: '학교생활 영역',
    subcategories: [
      { label: '교우 관계 및 사회성', items: ['갈등 중재자 역할', '뛰어난 공감 능력', '뛰어난 리더십', '모둠 활동 적극 참여', '사교적이고 유쾌함', '소외된 친구 포용', '양보 및 배려', '원만한 교우 관계', '의사소통 및 경청', '주변에 대한 관심', '친구들의 의견 존중', '협동적 문제해결'] },
      { label: '학교 생활 및 규칙 준수', items: ['1인 1역 책임 완수', '공공물품 아껴 쓰기', '단정한 용의 복장', '솔선수범', '시간 엄수(등교/과제)', '약속 준수', '정리 정돈 습관 우수', '투철한 봉사정신', '학급 규칙 준수'] },
      { label: '인성 및 기본 품성', items: ['감정 조절 능력', '고운 말 사용', '긍정적인 마음가짐', '따뜻한 마음씨', '예의 바름', '반성하는 태도', '사려 깊은 언행', '섬세하고 다정함', '솔직함과 정직'] }
    ]
  },
  {
    key: 'academics',
    label: '교과학습 영역',
    subcategories: [
      { label: '학습 태도 및 자기주도성', items: ['경청 및 피드백 수용', '끈기와 도전 정신', '높은 과제 완성도', '높은 수업 집중도', '높은 학습 흥미와 노력', '성실한 학습 준비/과제 수행', '자기주도적 학습태도', '활발한 질문'] },
      { label: '학업 역량 및 탐구 능력', items: ['글 내용 이해 우수', '뛰어난 관찰력', '비판적/논리적 사고력', '사물/현상에 높은 관심', '사회 보고서 작성 우수', '수학 문제해결 능력 우수', '왕성한 지적 호기심', '자료/매체 활용 우수', '학습 이해력 우수', '학습내용 정리 우수'] },
      { label: '교과별 특기 및 표현력', items: ['과학 실험 태도 우수', '디지털 리터러시', '뛰어난 글쓰기', '역할극 적극 참여', '예술적 감수성', '적극적 발표 능력', '창의적인 표현력', '협동학습 태도 우수', '체육 신체활동 능력 우수', '미술 표현 능력 우수', '음악 표현 능력 우수'] }
    ]
  }
];

export const KeywordSelector: React.FC<KeywordSelectorProps> = ({
  selectedKeywords,
  selectedKeywords2,
  onChange,
  onChange2,
  comments,
  onCommentsChange,
  semester,
  fontSizeLevel,
}) => {
  const [activeTab, setActiveTab] = useState<string>('personality');
  const [warningMessage, setWarningMessage] = useState<string>('');

  const getAdjustedFontSize = (base: number) => `${base + (fontSizeLevel - 1) * 1.5}px`;

  const getDomainOfKeyword = (kw: string): string | null => {
    for (const domain of KEYWORDS_DATA) {
      for (const sub of domain.subcategories) {
        if (sub.items.includes(kw)) {
          return domain.key;
        }
      }
    }
    return null;
  };

  const getSelectedCountInDomain1 = (domainKey: string): number => {
    return selectedKeywords.filter((kw) => getDomainOfKeyword(kw) === domainKey).length;
  };

  const getSelectedCountInDomain2 = (domainKey: string): number => {
    return selectedKeywords2.filter((kw) => getDomainOfKeyword(kw) === domainKey).length;
  };

  const getSelectedCountInDomain = (domainKey: string): number => {
    return semester === '1' ? getSelectedCountInDomain1(domainKey) : getSelectedCountInDomain2(domainKey);
  };

  const handleToggleKeyword = (keyword: string, domainKey: string) => {
    setWarningMessage('');
    const activeKeywords = semester === '1' ? selectedKeywords : selectedKeywords2;
    const activeOnChange = semester === '1' ? onChange : onChange2;

    const isSelected = activeKeywords.includes(keyword);

    if (isSelected) {
      activeOnChange(activeKeywords.filter((k) => k !== keyword));
    } else {
      const currentDomainCount = getSelectedCountInDomain(domainKey);
      if (currentDomainCount >= 2) {
        setWarningMessage('각 영역당 최대 2개까지만 선택할 수 있습니다.');
        return;
      }
      activeOnChange([...activeKeywords, keyword]);
    }
  };

  const activeCategory = KEYWORDS_DATA.find((c) => c.key === activeTab) || KEYWORDS_DATA[0];
  const currentKeywords = semester === '1' ? selectedKeywords : selectedKeywords2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <h3 className="title-medium" style={{ fontSize: getAdjustedFontSize(15), color: 'var(--text-standard)', margin: 0 }}>
          {semester === '1' ? '1학기' : '2학기'} 특성 키워드 선택
        </h3>
        <span className="caption-small" style={{ color: 'var(--text-light)', fontSize: getAdjustedFontSize(11) }}>
          영역별 최대 2개 선택 가능
        </span>
      </div>

      {/* Primary Category Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        {KEYWORDS_DATA.map((cat) => {
          const count = getSelectedCountInDomain(cat.key);
          const isActive = activeTab === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => {
                setActiveTab(cat.key);
                setWarningMessage('');
              }}
              className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: getAdjustedFontSize(12),
                padding: '6px 14px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{cat.label}</span>
              {count > 0 && (
                <span
                  style={{
                    backgroundColor: isActive ? 'var(--color-azure-action)' : 'var(--color-teal-mist)',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {warningMessage && (
        <div
          style={{
            backgroundColor: 'rgba(237, 109, 104, 0.12)',
            color: 'var(--color-coral-marker)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: getAdjustedFontSize(11),
            fontWeight: 600,
            border: '1px solid rgba(237, 109, 104, 0.2)',
          }}
        >
          {warningMessage}
        </div>
      )}

      {/* Subcategory and Keyword Badges View */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
        {activeCategory.subcategories.map((sub, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4
              style={{
                fontSize: getAdjustedFontSize(12),
                fontWeight: 600,
                color: 'var(--color-stone-gray)',
                margin: 0,
                paddingLeft: '2px',
              }}
            >
              {sub.label}
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {sub.items.map((kw) => {
                const isSelected = currentKeywords.includes(kw);
                return (
                  <button
                    key={kw}
                    onClick={() => handleToggleKeyword(kw, activeCategory.key)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      border: isSelected ? '1px solid #5ecc38' : '1px solid var(--border)',
                      backgroundColor: isSelected ? '#7efa55' : 'var(--color-paper-white)',
                      color: isSelected ? '#1a3a12' : 'var(--color-ink-black)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: getAdjustedFontSize(12),
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 2px 6px rgba(126, 250, 85, 0.35)' : 'none',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {kw}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Comments Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: getAdjustedFontSize(12), fontWeight: 600, color: 'var(--text-secondary)' }}>
            특이사항 및 관찰 기록 (AI 프롬프트 반영)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-light)', fontSize: getAdjustedFontSize(11) }}>
            <HelpCircle size={12} />
            <span>선택한 키워드와 함께 AI 평가에 반영됩니다.</span>
          </div>
        </div>
        <textarea
          className="input"
          placeholder="예: 2학기 모둠활동 시 솔선수범하여 친구들을 돕고 수학 문제해결력이 크게 향상됨."
          value={comments}
          onChange={(e) => onCommentsChange(e.target.value)}
          rows={3}
          style={{
            resize: 'none',
            fontSize: getAdjustedFontSize(12),
            lineHeight: 1.4,
            padding: '8px 10px',
            backgroundColor: '#ffffff',
          }}
        />
      </div>
    </div>
  );
};
