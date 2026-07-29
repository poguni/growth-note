import * as XLSX from 'xlsx-js-style';
import type { StudentInput, StudentData } from '../types';

export function parseStudentExcelFile(file: File): Promise<StudentInput[] | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const parsed = rawData
          .map((row: any) => {
            const keys = Object.keys(row);
            const numberKey = keys.find((k) => k.trim() === '번호') || '번호';
            const nameKey = keys.find((k) => k.trim() === '이름') || '이름';
            const genderKey = keys.find((k) => k.trim() === '성별') || '성별';

            const numVal = parseInt(row[numberKey], 10);
            const nameVal = String(row[nameKey] || '').trim();
            const genderVal = String(row[genderKey] || '').trim();

            return {
              number: isNaN(numVal) ? 0 : numVal,
              name: nameVal,
              gender: genderVal,
            };
          })
          .filter((student) => student.name !== '');

        resolve(parsed);
      } catch (err) {
        console.error('Failed to parse excel file', err);
        alert('엑셀 파일을 읽는 중 오류가 발생했습니다.');
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}

export function downloadTemplateExcel(): void {
  const aoaData = [
    ['번호', '이름', '성별'],
    [1, '김철수', '남'],
    [2, '이영희', '여'],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '학생명단_양식');

  const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, '학생명단_업로드_양식.xlsx');
}

export function exportResultsExcel(className: string, students: StudentData[]): void {
  const aoaData: any[][] = [
    ['번호', '이름', '성별', '선택 키워드', '1학기 평어 문장', '2학기 평어 문장'],
  ];

  students.forEach((s) => {
    const k1 = Array.isArray(s.keywords) ? s.keywords : [];
    const k2 = Array.isArray(s.keywords2) ? s.keywords2 : [];
    const combinedKeywords = Array.from(new Set([...k1, ...k2]));
    const keywordsStr = combinedKeywords.join(', ');
    aoaData.push([
      s.number,
      s.name,
      s.gender,
      keywordsStr,
      s.report || '',
      s.report2 || '',
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 8 },
    { wch: 40 },
    { wch: 60 },
    { wch: 60 }
  ];

  for (const cellId in worksheet) {
    if (cellId.startsWith('!')) continue;
    const cell = worksheet[cellId];
    const col = cellId.replace(/[0-9]/g, '');
    const isHeader = cellId.replace(/[^0-9]/g, '') === '1';

    if (!cell.s) cell.s = {};

    if (col === 'A' || col === 'B' || col === 'C') {
      cell.s.alignment = {
        horizontal: 'center',
        vertical: 'center',
        wrapText: isHeader
      };
    } else if (col === 'D' || col === 'E' || col === 'F') {
      cell.s.alignment = {
        horizontal: isHeader ? 'center' : 'left',
        vertical: 'center',
        wrapText: true
      };
    }

    if (isHeader) {
      cell.s.font = {
        bold: true
      };
      cell.s.fill = {
        fgColor: { rgb: 'F5F5F5' }
      };
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '평가결과종합');

  const koreaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const yyyy = koreaDate.getFullYear();
  const mm = String(koreaDate.getMonth() + 1).padStart(2, '0');
  const dd = String(koreaDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const fileName = `${className || '학급'}_행동특성_평가결과_${dateStr}.xlsx`;

  const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, fileName);
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
