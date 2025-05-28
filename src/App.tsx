import { useState, useEffect, useCallback, JSX } from "react";
import { FirebaseContext } from "./contexts/FirebaseContext";
import {
  auth as firebaseAuth,
  db as firebaseDb,
} from "./services/firebaseConfig";
import { fetchUsername } from "./services/userUtils";
import {
  onAuthStateChanged,
  signInAnonymously,
  User,
  Auth,
} from "firebase/auth";
import { Firestore } from "firebase/firestore";
import { FirebaseContextType, Session, ViewType } from "./types";

import LoadingIndicator from "./components/Layout/LoadingIndicator";
import Header from "./components/Layout/Header";
import UserIdDisplay from "./components/Layout/UserIdDisplay";
import UsernameSettingModal from "./components/Auth/UsernameSettingModal";
import SessionList from "./components/Session/SessionList";
import SessionCreationForm from "./components/Session/SessionCreationForm";
import ScheduleAdjustment from "./components/Session/ScheduleAdjustment";

const APP_ID: string = "trpg-session-App";

function App(): JSX.Element {
  const [db, setDb] = useState<Firestore | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [showUsernameModal, setShowUsernameModal] = useState<boolean>(false);
  const [view, setView] = useState<ViewType>("list");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    setAuth(firebaseAuth);
    setDb(firebaseDb);

    if (firebaseAuth && firebaseDb) {
      // dbもチェック
      const unsubscribe = onAuthStateChanged(
        firebaseAuth,
        async (user: User | null) => {
          if (user) {
            setUserId(user.uid);
            // firebaseDbがnullでないことを保証してからfetchUsernameを呼び出す
            const fetchedUsername = await fetchUsername(
              firebaseDb,
              APP_ID,
              user.uid
            );
            setUsername(fetchedUsername);
            if (!fetchedUsername) {
              setShowUsernameModal(true);
            }
          } else {
            try {
              await signInAnonymously(firebaseAuth);
            } catch (error) {
              console.error("匿名認証に失敗:", error);
            }
          }
          setIsAuthReady(true);
        }
      );
      return () => unsubscribe();
    } else {
      console.error("Firebase AuthまたはFirestoreの初期化に失敗しました。");
      setIsAuthReady(true);
    }
  }, []);

  const handleUsernameSet = useCallback((newUsername: string) => {
    setUsername(newUsername);
    setShowUsernameModal(false);
  }, []);

  const handleViewChange = useCallback((newView: ViewType) => {
    setView(newView);
    if (newView !== "schedule") {
      // スケジュール調整画面以外に遷移したら選択中セッションをリセット
      setSelectedSession(null);
    }
  }, []);

  const handleSelectSession = useCallback((session: Session) => {
    setSelectedSession(session);
    setView("schedule");
  }, []);

  if (!isAuthReady || !db || !auth) {
    return <LoadingIndicator />;
  }

  const contextValue: FirebaseContextType = {
    db,
    auth,
    userId,
    username,
    appId: APP_ID,
    fetchUsername, // fetchUsername はそのまま渡す
    setUsername,
    setShowUsernameModal,
  };

  return (
    <FirebaseContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-900 text-gray-100 font-inter">
        <Header currentView={view} onViewChange={handleViewChange} />
        <main className="container mx-auto p-6">
          <UserIdDisplay />
          {view === "list" && (
            <SessionList onSelectSession={handleSelectSession} />
          )}
          {view === "create" && (
            <SessionCreationForm setView={handleViewChange} />
          )}
          {view === "schedule" && selectedSession && (
            <ScheduleAdjustment
              session={selectedSession}
              setView={handleViewChange}
            />
          )}
          {showUsernameModal && (
            <UsernameSettingModal onUsernameSet={handleUsernameSet} />
          )}
        </main>
      </div>
    </FirebaseContext.Provider>
  );
}

export default App;
