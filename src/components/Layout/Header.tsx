import { useContext } from "react";
import { FirebaseContext } from "../../contexts/FirebaseContext";
import { ViewType } from "../../types";

interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

function Header({ currentView, onViewChange }: HeaderProps) {
  const firebaseContext = useContext(FirebaseContext);
  const username = firebaseContext?.username; // オプショナルチェイニング

  return (
    <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center">
      <h1 className="text-3xl font-bold text-indigo-400">TRPGセッション募集</h1>
      <div className="flex space-x-4 items-center">
        {username && (
          <span className="text-lg text-gray-300">
            ようこそ、{username}さん！
          </span>
        )}
        {username && (
          <button
            onClick={() => firebaseContext?.setShowUsernameModal(true)}
            className="text-sm text-indigo-300 hover:text-indigo-200"
            title="ユーザーネームを変更"
          >
            ✏️
          </button>
        )}
        <button
          onClick={() => onViewChange("list")}
          className={`px-4 py-2 rounded-lg transition duration-300 ease-in-out ${
            currentView === "list"
              ? "bg-indigo-600 text-white shadow-lg"
              : "bg-gray-700 hover:bg-indigo-500 text-gray-200"
          }`}
        >
          セッション一覧
        </button>
        <button
          onClick={() => onViewChange("create")}
          className={`px-4 py-2 rounded-lg transition duration-300 ease-in-out ${
            currentView === "create"
              ? "bg-indigo-600 text-white shadow-lg"
              : "bg-gray-700 hover:bg-indigo-500 text-gray-200"
          }`}
        >
          セッション作成
        </button>
      </div>
    </header>
  );
}

export default Header;
