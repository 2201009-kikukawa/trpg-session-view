import { doc, getDoc, Firestore } from "firebase/firestore";
import { UserProfile } from "../types";

export async function fetchUsername(
  db: Firestore,
  appId: string,
  uid: string
): Promise<string | null> {
  if (!uid) return null; // dbのチェックは呼び出し元で行う想定、またはここで早期リターン
  try {
    const userProfileRef = doc(
      db,
      `artifacts/${appId}/users/${uid}/profile/user_profile`
    );
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
      const userData = docSnap.data() as UserProfile; // 型アサーション
      return userData.username;
    }
  } catch (error) {
    console.error("ユーザーネームの取得エラー:", error);
  }
  return null;
}
