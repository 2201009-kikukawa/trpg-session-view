// src/components/Session/SessionList.tsx
import { useState, useEffect, useContext, JSX } from "react";
import { FirebaseContext } from "../../contexts/FirebaseContext";
import { fetchUsername as fetchUsernameUtil } from "../../services/userUtils";
import SessionCard from "./SessionCard";
import {
  collection,
  query,
  // where, // where might not be needed if all filtering is client-side based on new logic
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
  const db = firebaseContext?.db; //
  const userId = firebaseContext?.userId; //
  const appId = firebaseContext?.appId; //

  const [sessions, setSessions] = useState<Session[]>([]); //
  const [loading, setLoading] = useState<boolean>(true); //
  const [error, setError] = useState<string>(""); //
  const [gmUsernames, setGmUsernames] = useState<{ [key: string]: string }>({}); //

  useEffect(() => {
    if (!db || !appId) {
      //
      setLoading(false); //
      setError("データベース接続情報が不完全です。"); //
      return;
    }

    const sessionsCollectionRef = collection(
      //
      db, //
      `artifacts/${appId}/public/data/sessions` //
    );
    const q = query(
      sessionsCollectionRef, //
      orderBy("createdAt", "desc") //
    );

    const unsubscribe = onSnapshot(
      //
      q, //
      async (snapshot: QuerySnapshot<DocumentData>) => {
        //
        setLoading(true); //
        const sessionsData: Session[] = snapshot.docs.map((docSnap) => ({
          //
          id: docSnap.id, //
          ...(docSnap.data() as Omit<Session, "id">), //
        }));

        const newGmUsernames = { ...gmUsernames }; //
        const gmIdsToFetch = sessionsData //
          .map((s) => s.gmId) //
          .filter((id) => id && !newGmUsernames[id]); //

        if (gmIdsToFetch.length > 0) {
          //
          await Promise.all(
            //
            gmIdsToFetch.map(async (gmId) => {
              //
              const username = await fetchUsernameUtil(
                //
                db as Firestore, //
                appId, //
                gmId //
              );
              if (username) {
                //
                newGmUsernames[gmId] = username; //
              }
            })
          );
          setGmUsernames(newGmUsernames); //
        }
        setSessions(sessionsData); //
        setLoading(false); //
        setError(""); //
      },
      (err: Error) => {
        //
        console.error("セッションの取得エラー:", err); //
        setError("セッションの読み込み中にエラーが発生しました。"); //
        setLoading(false); //
      }
    );

    return () => unsubscribe(); //
  }, [db, appId]); //

  if (loading) {
    //
    return (
      <div className="text-center text-gray-300 text-lg">
        セッションを読み込み中...
      </div>
    );
  }

  if (error) {
    //
    return <div className="text-center text-red-500 text-lg">{error}</div>; //
  }

  // Updated filtering logic
  const displaySessions = sessions.filter((s) => {
    //
    // Condition 1: User is involved (participant or GM)
    const isUserInvolved =
      userId && (s.participants.includes(userId) || s.gmId === userId); //
    if (isUserInvolved) {
      return true; // Always show if the user is involved.
    }

    // Condition 2: User is not involved
    // Show if the session is not full AND has a status relevant for public viewing.
    const isNotFull = s.participants.length < s.maxPlayers; //
    // Relevant statuses for public display if not full (e.g., users can still potentially join or see active recruitment)
    const isPubliclyRelevantStatus =
      s.status === "募集開始" || s.status === "日程調整中"; //

    return isNotFull && isPubliclyRelevantStatus;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {displaySessions.length === 0 ? ( //
        <p className="col-span-full text-center text-gray-400 text-xl">
          現在表示できるセッションはありません。
        </p>
      ) : (
        displaySessions.map(
          (
            session //
          ) => (
            <SessionCard
              key={session.id} //
              session={session} //
              gmUsername={gmUsernames[session.gmId]} //
              onSelectSession={onSelectSession} //
            />
          )
        )
      )}
    </div>
  );
}

export default SessionList;
