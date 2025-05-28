// src/components/Session/SessionCard.tsx
import { useState, useContext, JSX } from "react";
import { FirebaseContext } from "../../contexts/FirebaseContext";
import {
  doc,
  arrayUnion,
  arrayRemove,
  runTransaction,
  deleteDoc,
  deleteField,
} from "firebase/firestore";
import { Session, FirebaseContextType, SessionStatus } from "../../types";
import ConfirmationModal from "../Common/ConfirmationModal";

interface SessionCardProps {
  //
  session: Session; //
  gmUsername: string | null | undefined; //
  onSelectSession: (session: Session) => void; //
}

function SessionCard({
  //
  session, //
  gmUsername, //
  onSelectSession, //
}: SessionCardProps): JSX.Element {
  const firebaseContext = useContext(
    //
    FirebaseContext
  ) as FirebaseContextType | null;
  const db = firebaseContext?.db; //
  const userId = firebaseContext?.userId; //
  const appId = firebaseContext?.appId; //

  const [isProcessing, setIsProcessing] = useState<boolean>(false); //
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = //
    useState<boolean>(false); //

  if (!session || !firebaseContext) {
    //
    return (
      //
      <div className="p-4 text-center text-red-400">
        セッション情報が不完全です。
      </div>
    );
  }

  const isParticipant = userId ? session.participants.includes(userId) : false; //
  const isGM = userId ? session.gmId === userId : false; //
  const isParticipantOrGM = isParticipant || isGM; //

  const isFull = session.participants.length >= session.maxPlayers; //
  const canShowJoinButton = //
    !isParticipantOrGM && session.status === "募集開始" && !isFull; //

  const handleJoinSession = async (): Promise<void> => {
    //
    if (!db || !userId || !appId || !canShowJoinButton || isProcessing) return; //
    setIsProcessing(true); //
    const sessionRef = doc(
      //
      db, //
      `artifacts/${appId}/public/data/sessions`, //
      session.id //
    );
    try {
      //
      await runTransaction(db, async (transaction) => {
        //
        const sfDoc = await transaction.get(sessionRef); //
        if (!sfDoc.exists()) {
          //
          throw new Error("セッションドキュメントが見つかりません!"); //
        }
        const currentSessionData = sfDoc.data() as Session; //

        if (
          //
          currentSessionData.participants.length >= //
            currentSessionData.maxPlayers || //
          currentSessionData.status !== "募集開始" //
        ) {
          console.log("セッションに参加できません（満員または募集停止中）。"); //
          return; //
        }

        transaction.update(sessionRef, { participants: arrayUnion(userId) }); //
        const newParticipantsCount = currentSessionData.participants.length + 1; //

        if (
          //
          newParticipantsCount >= currentSessionData.minPlayers && //
          currentSessionData.status === "募集開始" //
        ) {
          transaction.update(sessionRef, { status: "日程調整中" }); //
          const notificationMessage = `セッション「${currentSessionData.scenarioName}」が参加者最低人数に達したため、日程調整を開始します。`; //
          console.log(
            //
            `GM (${currentSessionData.notificationEmail})へ通知: ${notificationMessage}` //
          );
          currentSessionData.participants.forEach((pId) => {
            //
            if (pId !== currentSessionData.gmId) {
              //
              console.log(`参加者(${pId})へ通知: ${notificationMessage}`); //
            }
          });
          console.log(`新規参加者(${userId})へ通知: ${notificationMessage}`); //
        }
      });
    } catch (error: any) {
      //
      console.error("セッション参加トランザクションエラー:", error); //
    } finally {
      //
      setIsProcessing(false); //
    }
  };

  const handleLeaveSession = async (): Promise<void> => {
    //
    if (
      //
      !db || //
      !userId || //
      !appId || //
      !isParticipant || //
      isProcessing || //
      session.status === "日程確定" //
    )
      return; //
    setIsProcessing(true); //
    const sessionRef = doc(
      //
      db, //
      `artifacts/${appId}/public/data/sessions`, //
      session.id //
    );
    try {
      //
      await runTransaction(db, async (transaction) => {
        //
        const sfDoc = await transaction.get(sessionRef); //
        if (!sfDoc.exists()) {
          //
          throw new Error("セッションドキュメントが見つかりません!"); //
        }
        const currentSessionData = sfDoc.data() as Session; //

        const userAvailabilityFieldPath = `availabilities.${userId}`; //
        const updates: {
          //
          participants: any; // // anyの代わりにFieldValue型を使用
          status?: SessionStatus; //
          [key: string]: any; //
        } = {
          participants: arrayRemove(userId), //
          [userAvailabilityFieldPath]: deleteField(), // ユーザーのアベイラビリティを削除
        };

        const newParticipantsCount = currentSessionData.participants.filter(
          //
          (pId) => pId !== userId //
        ).length;

        if (
          //
          newParticipantsCount < currentSessionData.minPlayers && //
          currentSessionData.status === "日程調整中" //
        ) {
          updates.status = "募集開始"; //
          console.log(
            //
            `GM (${currentSessionData.notificationEmail})へ通知: セッション「${currentSessionData.scenarioName}」の参加者が最低人数を下回ったため、募集を再開しました。` //
          );
        }
        // 募集終了ステータスからも募集開始に戻す場合 (オプション)
        else if (
          newParticipantsCount < currentSessionData.maxPlayers &&
          currentSessionData.status === "募集終了"
        ) {
          updates.status = "募集開始";
          console.log(
            `GM (${currentSessionData.notificationEmail})へ通知: セッション「${currentSessionData.scenarioName}」に空きが出たため募集を再開しました。`
          );
        }

        transaction.update(sessionRef, updates); //
      });
      console.log(`セッション「${session.scenarioName}」から退出しました。`); //
    } catch (error: any) {
      //
      console.error("セッション退出トランザクションエラー:", error); //
    } finally {
      //
      setIsProcessing(false); //
    }
  };

  const handleDeleteSession = async (): Promise<void> => {
    //
    if (!db || !appId || !isGM || isProcessing) return; //

    setIsProcessing(true); //
    setShowDeleteConfirmModal(false); //
    const sessionRef = doc(
      //
      db, //
      `artifacts/${appId}/public/data/sessions`, //
      session.id //
    );

    try {
      //
      await deleteDoc(sessionRef); //
      console.log(
        //
        `セッション「${session.scenarioName}」(ID: ${session.id}) が正常に削除されました。` //
      );
    } catch (error: any) {
      //
      console.error("セッション削除エラー:", error); //
      alert(`セッションの削除に失敗しました: ${error.message}`); //
    } finally {
      //
      setIsProcessing(false); //
    }
  };

  const navigateToScheduleAdjustment = () => {
    //
    onSelectSession(session); //
  };

  return (
    //
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 flex flex-col justify-between transform transition duration-300 hover:scale-105 border border-gray-700">
      <div>
        <h3 className="text-2xl font-bold text-indigo-400 mb-2">
          {session.scenarioName}
        </h3>
        <p className="text-gray-300 text-sm mb-1">
          <span className="font-semibold">TRPGの種類:</span> {session.trpgType}
        </p>
        <p className="text-gray-300 text-sm mb-1">
          <span className="font-semibold">GM:</span>{" "}
          {gmUsername ||
            (isGM && firebaseContext?.username) ||
            `ID: ${session.gmId.substring(0, 6)}...`}
        </p>
        <p className="text-gray-400 text-sm mb-4 h-20 overflow-y-auto custom-scrollbar">
          {session.description}
        </p>
        <p className="text-gray-300 text-sm mb-1">
          <span className="font-semibold">募集人数:</span> {session.minPlayers}{" "}
          - {session.maxPlayers}人
        </p>
        <p className="text-gray-300 text-sm mb-4">
          <span className="font-semibold">現在の参加者:</span>{" "}
          {session.participants.length}人
          {isFull && session.status !== "募集開始" && (
            <span className="ml-2 text-red-400 font-bold">(満員)</span>
          )}
        </p>
        <p className="text-gray-300 text-sm mb-1">
          <span className="font-semibold">ステータス:</span>
          <span
            className={`ml-1 font-bold ${
              session.status === "募集開始"
                ? "text-green-400"
                : session.status === "日程調整中"
                ? "text-yellow-400"
                : session.status === "日程確定"
                ? "text-blue-400"
                : session.status === "募集終了"
                ? "text-red-400"
                : "text-gray-400"
            }`}
          >
            {session.status}
          </span>
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {isParticipantOrGM && ( //
          <>
            {session.status === "日程調整中" && ( //
              <button
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg"
                onClick={navigateToScheduleAdjustment}
                disabled={isProcessing}
              >
                日程調整へ
              </button>
            )}
            {session.status === "日程確定" && ( //
              <button
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
                onClick={navigateToScheduleAdjustment}
                disabled={isProcessing}
              >
                確定日程を確認
              </button>
            )}
            {(session.status === "募集開始" || //
              session.status === "日程調整中") && //
              isParticipant && //
              !isGM && ( //
                <button
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
                  onClick={handleLeaveSession}
                  disabled={isProcessing}
                >
                  {isProcessing ? "処理中..." : "セッションを退出"}
                </button>
              )}
          </>
        )}

        {canShowJoinButton && ( //
          <button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
            onClick={handleJoinSession} //
            disabled={isProcessing} //
          >
            {isProcessing ? "参加処理中..." : "遊びたい"}
          </button>
        )}

        {isGM && ( //
          <button
            className="w-full bg-pink-700 hover:bg-pink-800 text-white font-bold py-2 px-4 rounded-lg text-sm mt-1" //
            onClick={() => setShowDeleteConfirmModal(true)} //
            disabled={isProcessing} //
          >
            {isProcessing ? "処理中..." : "このセッションを削除"}
          </button>
        )}

        {!isParticipantOrGM &&
          session.status !== "募集開始" &&
          isFull && ( //
            <p className="text-sm text-center text-gray-400">
              このセッションは現在参加できません（満員）。
            </p>
          )}
        {!isParticipantOrGM && //
          (session.status === "日程調整中" || session.status === "日程確定") && //
          !isFull && ( //
            <p className="text-sm text-center text-gray-400">
              このセッションは日程調整中または日程確定済みのため、現在参加できません。
            </p>
          )}
      </div>

      {showDeleteConfirmModal && ( //
        <ConfirmationModal
          message={`セッション「${session.scenarioName}」を本当に削除しますか？この操作は元に戻せません。`} //
          onConfirm={handleDeleteSession} //
          onCancel={() => setShowDeleteConfirmModal(false)} //
        />
      )}
    </div>
  );
}

export default SessionCard;
