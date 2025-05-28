import React, { useState, useContext, JSX } from "react";
import { FirebaseContext } from "../../contexts/FirebaseContext";
import { FirebaseContextType, ViewType, Session } from "../../types";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface SessionCreationFormProps {
  setView: (view: ViewType) => void;
}

function SessionCreationForm({
  setView,
}: SessionCreationFormProps): JSX.Element {
  const firebaseContext = useContext(
    FirebaseContext
  ) as FirebaseContextType | null;
  const db = firebaseContext?.db;
  const userId = firebaseContext?.userId;
  const appId = firebaseContext?.appId;

  const [trpgType, setTrpgType] = useState<string>("");
  const [scenarioName, setScenarioName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [minPlayers, setMinPlayers] = useState<number>(1);
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [notificationEmail, setNotificationEmail] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    if (!db || !userId || !appId) {
      setMessage(
        "エラー: データベース、ユーザーID、またはアプリIDが利用できません。"
      );
      return;
    }
    if (minPlayers > maxPlayers) {
      setMessage("エラー: 最低人数が最高人数を超えています。");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const sessionsCollectionRef = collection(
        db,
        `artifacts/${appId}/public/data/sessions`
      );
      const newSessionData: Omit<Session, "id" | "createdAt"> & {
        createdAt: any;
      } = {
        // Firestoreに追加する際の型
        trpgType,
        scenarioName,
        description,
        minPlayers: Number(minPlayers),
        maxPlayers: Number(maxPlayers),
        notificationEmail,
        gmId: userId,
        participants: [],
        status: "募集開始",
        createdAt: serverTimestamp(), // Firestoreのサーバータイムスタンプを使用
        availabilities: {},
      };
      await addDoc(sessionsCollectionRef, newSessionData);
      setMessage("セッションが正常に作成されました！");
      setTrpgType("");
      setScenarioName("");
      setDescription("");
      setMinPlayers(1);
      setMaxPlayers(4);
      setNotificationEmail("");
      setTimeout(() => setView("list"), 2000);
    } catch (error: any) {
      console.error("セッション作成エラー:", error);
      setMessage(`セッション作成に失敗しました: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-indigo-400 mb-6 text-center">
        セッション作成
      </h2>
      {message && (
        <div
          className={`p-3 mb-4 rounded-md ${
            message.includes("成功")
              ? "bg-green-600"
              : message.includes("エラー")
              ? "bg-red-600"
              : "bg-blue-600"
          } text-white`}
        >
          {message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="trpgType"
            className="block text-gray-300 text-sm font-bold mb-2"
          >
            TRPGの種類:
          </label>
          <input
            type="text"
            id="trpgType"
            value={trpgType}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTrpgType(e.target.value)
            }
            className="shadow appearance-none border border-gray-700 rounded-lg w-full py-2 px-3 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label
            htmlFor="scenarioName"
            className="block text-gray-300 text-sm font-bold mb-2"
          >
            シナリオ名:
          </label>
          <input
            type="text"
            id="scenarioName"
            value={scenarioName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setScenarioName(e.target.value)
            }
            className="shadow appearance-none border border-gray-700 rounded-lg w-full py-2 px-3 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label
            htmlFor="description"
            className="block text-gray-300 text-sm font-bold mb-2"
          >
            軽い説明:
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setDescription(e.target.value)
            }
            rows={4}
            className="shadow appearance-none border border-gray-700 rounded-lg w-full py-2 px-3 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          ></textarea>
        </div>
        <div className="flex space-x-4">
          <div className="w-1/2">
            <label
              htmlFor="minPlayers"
              className="block text-gray-300 text-sm font-bold mb-2"
            >
              最低人数:
            </label>
            <input
              type="number"
              id="minPlayers"
              value={minPlayers}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setMinPlayers(Math.max(1, Number(e.target.value)))
              }
              min="1"
              className="shadow appearance-none border border-gray-700 rounded-lg w-full py-2 px-3 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          <div className="w-1/2">
            <label
              htmlFor="maxPlayers"
              className="block text-gray-300 text-sm font-bold mb-2"
            >
              最高人数:
            </label>
            <input
              type="number"
              id="maxPlayers"
              value={maxPlayers}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setMaxPlayers(
                  Math.max(Number(minPlayers), Number(e.target.value))
                )
              }
              min={minPlayers}
              className="shadow appearance-none border border-gray-700 rounded-lg w-full py-2 px-3 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="notificationEmail"
            className="block text-gray-300 text-sm font-bold mb-2"
          >
            通知を送るメールアドレス (GM用):
          </label>
          <input
            type="email"
            id="notificationEmail"
            value={notificationEmail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNotificationEmail(e.target.value)
            }
            className="shadow appearance-none border border-gray-700 rounded-lg w-full py-2 px-3 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? "作成中..." : "セッションを作成"}
        </button>
      </form>
    </div>
  );
}

export default SessionCreationForm;
