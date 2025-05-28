import { JSX, useContext } from "react";
import { FirebaseContext } from "../../contexts/FirebaseContext";
import { FirebaseContextType } from "../../types";

function UserIdDisplay(): JSX.Element {
  const firebaseContext = useContext(
    FirebaseContext
  ) as FirebaseContextType | null;
  const userId = firebaseContext?.userId;

  return (
    <div className="mb-6 bg-gray-800 p-4 rounded-lg shadow-md">
      <p className="text-sm text-gray-400">
        あなたのユーザーID:{" "}
        <span className="font-mono text-indigo-300 break-all">
          {userId || "取得中..."}
        </span>
      </p>
    </div>
  );
}

export default UserIdDisplay;
