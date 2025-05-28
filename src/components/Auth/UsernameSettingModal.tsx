import React, { useState, useContext, JSX } from "react";
import { FirebaseContext } from "../../contexts/FirebaseContext";
import { FirebaseContextType } from "../../types";
import { doc, setDoc } from "firebase/firestore";

interface UsernameSettingModalProps {
  onUsernameSet: (newUsername: string) => void;
}

function UsernameSettingModal({
  onUsernameSet,
}: UsernameSettingModalProps): JSX.Element {
  const firebaseContext = useContext(
    FirebaseContext
  ) as FirebaseContextType | null;
  const db = firebaseContext?.db;
  const userId = firebaseContext?.userId;
  const appId = firebaseContext?.appId;

  const [inputUsername, setInputUsername] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSaveUsername = async (): Promise<void> => {
    if (!db || !userId || !appId) {
      setMessage("データベースまたはユーザー情報が利用できません。");
      return;
    }
    if (!inputUsername.trim()) {
      setMessage("ユーザーネームを入力してください。");
      return;
    }
    setIsSaving(true);
    setMessage("");

    try {
      const userProfileRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/profile/user_profile`
      );
      await setDoc(
        userProfileRef,
        { username: inputUsername.trim() },
        { merge: true }
      );
      onUsernameSet(inputUsername.trim());
    } catch (error: any) {
      console.error("ユーザーネームの保存エラー:", error);
      setMessage(`ユーザーネームの保存に失敗しました: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-indigo-400 mb-6">
          ユーザーネームを設定
        </h2>
        {message && (
          <div
            className={`p-3 mb-4 rounded-md ${
              message.includes("失敗") || message.includes("エラー")
                ? "bg-red-600"
                : "bg-green-600"
            } text-white`}
          >
            {message}
          </div>
        )}
        <input
          type="text"
          value={inputUsername}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setInputUsername(e.target.value)
          }
          placeholder="あなたのユーザーネームを入力"
          className="shadow appearance-none border border-gray-700 rounded-lg w-full py-2 px-3 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
          required
        />
        <button
          onClick={handleSaveUsername}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSaving}
        >
          {isSaving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}

export default UsernameSettingModal;
