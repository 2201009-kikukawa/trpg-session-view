// src/utils/dateUtils.ts
/**
 * Dateオブジェクトを YYYY-MM-DD 形式の文字列に変換します。
 * @param date Dateオブジェクト
 * @returns YYYY-MM-DD形式の文字列
 */
export const toYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * YYYY-MM-DD 形式の文字列をDateオブジェクトに変換します。
 * 時刻はシステムのローカルタイムゾーンの00:00:00になります。
 * @param dateString YYYY-MM-DD形式の文字列
 * @returns Dateオブジェクト
 */
export const fromYYYYMMDD = (dateString: string): Date => {
  // YYYY-MM-DD形式の文字列をUTCとして解釈し、ローカルタイムゾーンの日付にならないように注意
  // new Date(year, monthIndex, day) の形式で生成するのが安全
  const parts = dateString.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
};

/**
 * YYYY-MM-DD 形式の文字列をユーザーフレンドリーな形式 (例: 2023年5月30日 (火)) に変換します。
 * @param dateString YYYY-MM-DD形式の文字列
 * @returns フォーマットされた日付文字列
 */
export const formatDateForDisplay = (
  dateString: string | undefined
): string => {
  if (!dateString) return "未設定";
  try {
    const date = fromYYYYMMDD(dateString); // YYYY-MM-DD を Date に変換
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return "日付形式エラー";
  }
};
