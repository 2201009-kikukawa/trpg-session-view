import { useState, useEffect, useContext, JSX } from "react";
import { FirebaseContext } from "../../contexts/FirebaseContext";
import { fetchUsername as fetchUsernameUtil } from "../../services/userUtils";
import SessionCard from "./SessionCard";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  QuerySnapshot,
  DocumentData,
  Firestore,
} from "firebase/firestore";
import { Session, FirebaseContextType } from "../../types";

interface SessionListProps {
  onSelectSession: (session: Session) => void;
}

function SessionList({ onSelectSession }: SessionListProps): JSX.Element {
  const firebaseContext = useContext(
    FirebaseContext
  ) as FirebaseContextType | null;
  const db = firebaseContext?.db;
  const userId = firebaseContext?.userId; // userIdはSessionCardに渡すために保持
  const appId = firebaseContext?.appId;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [gmUsernames, setGmUsernames] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!db || !appId) {
      setLoading(false);
      setError("データベース接続情報が不完全です。");
      return;
    }

    // 全てのステータスのセッションを取得し、クライアント側でフィルタリングまたは表示を工夫する
    // もしくは、複数のクエリを組み合わせるか、より複雑なバックエンドロジックを検討
    const sessionsCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/sessions`
    );
    const q = query(
      sessionsCollectionRef,
      orderBy("createdAt", "desc") // 作成日時の降順でソート
      // where('status', 'in', ['募集開始', '日程調整中']) // 例：募集開始と日程調整中のみ
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot: QuerySnapshot<DocumentData>) => {
        setLoading(true);
        const sessionsData: Session[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Session, "id">), // 型アサーション
        }));

        const newGmUsernames = { ...gmUsernames };
        const gmIdsToFetch = sessionsData
          .map((s) => s.gmId)
          .filter((id) => id && !newGmUsernames[id]); // 未取得のGM IDのみ

        if (gmIdsToFetch.length > 0) {
          await Promise.all(
            gmIdsToFetch.map(async (gmId) => {
              const username = await fetchUsernameUtil(
                db as Firestore,
                appId,
                gmId
              );
              if (username) {
                newGmUsernames[gmId] = username;
              }
            })
          );
          setGmUsernames(newGmUsernames);
        }
        setSessions(sessionsData);
        setLoading(false);
        setError("");
      },
      (err: Error) => {
        console.error("セッションの取得エラー:", err);
        setError("セッションの読み込み中にエラーが発生しました。");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, appId]); // gmUsernamesは内部で更新されるため依存配列から削除、fetchUsernameUtilも通常変わらない

  if (loading) {
    return (
      <div className="text-center text-gray-300 text-lg">
        セッションを読み込み中...
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 text-lg">{error}</div>;
  }

  const displaySessions = sessions.filter(
    (s) =>
      s.status === "募集開始" ||
      (userId && s.participants.includes(userId)) ||
      (userId && s.gmId === userId)
  );
  // もしくは、全セッション表示しつつ、Card側で見た目を調整

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {displaySessions.length === 0 ? (
        <p className="col-span-full text-center text-gray-400 text-xl">
          現在表示できるセッションはありません。
        </p>
      ) : (
        displaySessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            gmUsername={gmUsernames[session.gmId]}
            onSelectSession={onSelectSession}
          />
        ))
      )}
    </div>
  );
}

export default SessionList;
