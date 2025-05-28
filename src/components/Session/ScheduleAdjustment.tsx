// src/components/Session/ScheduleAdjustment.tsx
import React, {
  useState,
  useEffect,
  useContext,
  // useCallback, // handleCalendarDayClick が useEffect の依存配列に含まれないため、useCallback は必須ではない
  JSX,
} from "react";
import Calendar from "react-calendar";
// import 'react-calendar/dist/Calendar.css'; // グローバルCSS (index.css) で読み込むことを推奨
import { FirebaseContext } from "../../contexts/FirebaseContext";
import { fetchUsername as fetchUsernameUtil } from "../../services/userUtils";
import ConfirmationModal from "../Common/ConfirmationModal";
import { doc, onSnapshot, updateDoc, Firestore } from "firebase/firestore";
import { Session, FirebaseContextType, ViewType } from "../../types";

// dateUtils.ts が src/utils/ にあると仮定
import {
  toYYYYMMDD,
  fromYYYYMMDD, // カレンダーのvalueに渡すために使用
  formatDateForDisplay,
} from "../../utils/dateUtils"; // ★ インポートパスを確認

interface ScheduleAdjustmentProps {
  //
  session: Session; //
  setView: (view: ViewType) => void; //
}

function ScheduleAdjustment({
  //
  session: initialSession, //
  setView, //
}: ScheduleAdjustmentProps): JSX.Element {
  const firebaseContext = useContext(
    //
    FirebaseContext
  ) as FirebaseContextType | null;
  const db = firebaseContext?.db; //
  const userId = firebaseContext?.userId; //
  const appId = firebaseContext?.appId; //

  const [currentSessionData, setCurrentSessionData] = useState<Session | null>( //
    null // 初期値はnullにして、useEffectでinitialSessionをセットするか、読み込む
  );
  const [mySelectedDates, setMySelectedDates] = useState<string[]>([]); //
  const [commonAvailableDates, setCommonAvailableDates] = useState<string[]>( //
    []
  );
  const [message, setMessage] = useState<string>(""); //
  const [loading, setLoading] = useState<boolean>(true); //
  const [isSubmittingAvailability, setIsSubmittingAvailability] = //
    useState<boolean>(false);
  const [showConfirmFinalDateModal, setShowConfirmFinalDateModal] = //
    useState<boolean>(false);
  const [finalDateToConfirm, setFinalDateToConfirm] = useState<string>(""); //
  const [memberUsernames, setMemberUsernames] = useState<{
    //
    [key: string]: string;
  }>({});

  const isGM = currentSessionData?.gmId === userId; //
  const isParticipantOrGM = //
    userId && currentSessionData //
      ? currentSessionData.participants.includes(userId) || //
        currentSessionData.gmId === userId //
      : false; //

  useEffect(() => {
    //
    // initialSessionのデータを最初にcurrentSessionDataに設定
    setCurrentSessionData(initialSession);

    if (!db || !initialSession.id || !appId) {
      //
      setLoading(false); //
      setMessage("必要な情報が不足しています。"); //
      return; //
    }
    setLoading(true); //
    const sessionDocRef = doc(
      //
      db, //
      `artifacts/${appId}/public/data/sessions`, //
      initialSession.id //
    );

    const unsubscribe = onSnapshot(
      //
      sessionDocRef, //
      async (docSnap) => {
        //
        if (docSnap.exists()) {
          //
          const sessionDataFromSnapshot = {
            //
            id: docSnap.id, //
            ...docSnap.data(), //
          } as Session;
          setCurrentSessionData(sessionDataFromSnapshot); //

          if (userId && sessionDataFromSnapshot.availabilities?.[userId]) {
            //
            setMySelectedDates(
              //
              [...sessionDataFromSnapshot.availabilities[userId]].sort() //
            );
          } else {
            //
            setMySelectedDates([]); //
          }

          const allMemberIds = [
            //
            ...new Set([
              //
              ...(sessionDataFromSnapshot.participants || []), //
              sessionDataFromSnapshot.gmId, //
            ]),
          ].filter((id) => id); //
          const newMemberUsernames = { ...memberUsernames }; //
          const idsToFetchUsernames = allMemberIds.filter(
            //
            (id) => id && !newMemberUsernames[id] // idが存在することも確認
          );
          if (idsToFetchUsernames.length > 0) {
            //
            await Promise.all(
              //
              idsToFetchUsernames.map(async (memberId) => {
                //
                const username = await fetchUsernameUtil(
                  //
                  db as Firestore, //
                  appId, //
                  memberId //
                );
                if (username) newMemberUsernames[memberId] = username; //
              })
            );
            setMemberUsernames(newMemberUsernames); //
          }

          if (
            //
            allMemberIds.length > 0 && //
            sessionDataFromSnapshot.availabilities //
          ) {
            const { availabilities } = sessionDataFromSnapshot; //
            if (
              Object.keys(availabilities).length === allMemberIds.length &&
              allMemberIds.every((id) => (availabilities[id]?.length ?? 0) > 0)
            ) {
              // 全員が提出し、かつ各提出が空でない場合
              let commonDatesCalc = [
                //
                ...(availabilities[allMemberIds[0]] || []), //
              ];
              for (let i = 1; i < allMemberIds.length; i++) {
                //
                const memberId = allMemberIds[i]; //
                commonDatesCalc = commonDatesCalc.filter(
                  (
                    date //
                  ) => (availabilities[memberId] || []).includes(date) //
                );
              }
              setCommonAvailableDates(
                commonDatesCalc.sort(
                  (a, b) =>
                    fromYYYYMMDD(a).getTime() - fromYYYYMMDD(b).getTime()
                )
              ); // ソート時にDateオブジェクトで比較
            } else {
              //
              setCommonAvailableDates([]); //
            }
          } else {
            //
            setCommonAvailableDates([]); //
          }
          setMessage(""); //
        } else {
          //
          setMessage("セッションが見つかりません。"); //
          setCurrentSessionData(null); //
        }
        setLoading(false); //
      },
      (err: Error) => {
        //
        console.error("日程調整データ取得エラー:", err); //
        setMessage("日程データの読み込みエラー。"); //
        setLoading(false); //
      }
    );
    return () => unsubscribe(); //
  }, [db, initialSession.id, userId, appId]); // initialSession を依存配列に追加

  const handleCalendarDayClick = (value: Date) => {
    //
    const dateStr = toYYYYMMDD(value); //
    setMySelectedDates((prevDates) => {
      //
      const newDates = prevDates.includes(dateStr) //
        ? prevDates.filter((d) => d !== dateStr) //
        : [...prevDates, dateStr]; //
      return newDates.sort(); //
    });
  };

  const handleSubmitAvailability = async () => {
    //
    if (
      //
      !db || //
      !userId || //
      !appId || //
      !currentSessionData || //
      isSubmittingAvailability //
    )
      return; //

    setIsSubmittingAvailability(true); //
    setMessage(""); //
    try {
      //
      const sessionRef = doc(
        //
        db, //
        `artifacts/${appId}/public/data/sessions`, //
        currentSessionData.id //
      );
      await updateDoc(sessionRef, {
        //
        [`availabilities.${userId}`]: mySelectedDates.sort(), //
      });
      setMessage("参加可能日時を更新しました。"); //
    } catch (error: any) {
      //
      setMessage(`エラー: ${error.message}`); //
    } finally {
      //
      setIsSubmittingAvailability(false); //
    }
  };

  const handleConfirmFinalDate = async () => {
    //
    if (
      //
      !db || //
      !appId || //
      !isGM || //
      !finalDateToConfirm || //
      !currentSessionData || //
      isSubmittingAvailability //
    )
      return; //

    setIsSubmittingAvailability(true); //
    setShowConfirmFinalDateModal(false); //
    setMessage(""); //
    try {
      //
      const sessionRef = doc(
        //
        db, //
        `artifacts/${appId}/public/data/sessions`, //
        currentSessionData.id //
      );
      await updateDoc(sessionRef, {
        //
        finalDate: finalDateToConfirm, //
        status: "日程確定", //
      });
      setMessage("最終日程が確定しました！"); //
      console.log(
        //
        `全参加者へ通知: セッション「${
          //
          currentSessionData.scenarioName //
        }」の最終日程が「${formatDateForDisplay(
          //
          finalDateToConfirm //
        )}」に確定しました。`
      );
      setTimeout(() => setView("list"), 3000); //
    } catch (error: any) {
      //
      setMessage(`エラー: ${error.message}`); //
    } finally {
      //
      setIsSubmittingAvailability(false); //
    }
  };

  const openFinalDateConfirmationModal = (date: string) => {
    //
    setFinalDateToConfirm(date); //
    setShowConfirmFinalDateModal(true); //
  };

  const tileClassName = ({
    //
    date, //
    view, //
  }: {
    date: Date; //
    view: string; //
  }): string | null => {
    if (view === "month") {
      //
      if (mySelectedDates.find((dStr) => dStr === toYYYYMMDD(date))) {
        //
        return "selected-day"; //
      }
    }
    return null; //
  };

  // react-calendarのvalueには単一のDateまたはundefinedを渡す。複数選択の視覚化はtileClassNameで行う。
  const calendarDisplayValue = mySelectedDates.length > 0 ? fromYYYYMMDD(mySelectedDates[0]) : undefined;

  if (loading)
    //
    return (
      //
      <div className="text-center text-gray-300 text-lg p-8">
        日程調整盤を準備中...
      </div>
    );
  if (!currentSessionData)
    //
    return (
      //
      <div className="text-center text-red-400 text-lg p-8">
        {message || "セッション情報を読み込めません。"}
      </div>
    );

  if (!isParticipantOrGM && currentSessionData.status !== "日程確定") {
    //
    return (
      //
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-2xl mx-auto text-center">
        <p className="text-red-400">
          このセッションの日程調整に参加する権限がありません。
        </p>
        <button
          onClick={() => setView("list")} //
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
        >
          一覧へ戻る
        </button>
      </div>
    );
  }

  const allMemberIdsForDisplay = [
    //
    ...new Set([
      //
      ...(currentSessionData.participants || []), //
      currentSessionData.gmId, //
    ]),
  ].filter((id) => id); //

  return (
    //
    <div className="bg-gray-800 p-6 md:p-8 rounded-lg shadow-xl max-w-4xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-indigo-400 mb-6 text-center">
        日程調整: {currentSessionData.scenarioName}
      </h2>
      {message && ( //
        <div
          className={`p-3 mb-4 rounded-md text-center ${
            //
            message.includes("エラー") || message.includes("失敗") //
              ? "bg-red-700" //
              : "bg-green-700" //
          } text-white`}
        >
          {message}
        </div>
      )}

      {currentSessionData.status === "日程確定" && //
      currentSessionData.finalDate ? ( //
        <div className="text-center text-green-400 text-xl font-bold mb-6">
          <h3 className="text-2xl text-white mb-2">
            🎉 このセッションの日程は確定しました！ 🎉
          </h3>
          <p className="text-3xl mt-2 p-4 bg-gray-700 rounded-md shadow-inner">
            {formatDateForDisplay(currentSessionData.finalDate)}
          </p>
          <button
            onClick={() => setView("list")} //
            className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg"
          >
            セッション一覧に戻る
          </button>
        </div>
      ) : (
        //
        <>
          {isParticipantOrGM && ( //
            <div className="mb-8 p-4 border border-gray-700 rounded-lg bg-gray-850 shadow">
              <h3 className="text-xl font-semibold text-gray-100 mb-3">
                あなたの参加可能日を選択
              </h3>
              <div className="flex flex-col items-center mb-4">
                <Calendar
                  onClickDay={handleCalendarDayClick} //
                  value={calendarDisplayValue} // ★ Date[] を渡す
                  tileClassName={tileClassName} //
                  selectRange={false} //
                  className="bg-gray-700 border-gray-600" //
                  minDate={new Date()} //
                  // allowPartialRange={true} // 複数の日付を選択するために必要に応じて
                />
              </div>
              <div className="mt-2 text-sm text-gray-400">
                選択中の日付:{" "}
                {mySelectedDates.length > 0 //
                  ? mySelectedDates.map(formatDateForDisplay).join(", ") //
                  : "なし"}
              </div>
              <button
                onClick={handleSubmitAvailability} //
                className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-md disabled:opacity-60"
                disabled={isSubmittingAvailability} //
              >
                {isSubmittingAvailability //
                  ? "更新中..." //
                  : "選択した候補日を更新"}
              </button>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="p-4 border border-gray-700 rounded-lg bg-gray-850 shadow">
              <h3 className="text-xl font-semibold text-gray-100 mb-3">
                メンバーの提出状況
              </h3>
              {allMemberIdsForDisplay.length === 0 ? ( //
                <p className="text-gray-400">参加メンバーがいません。</p> //
              ) : (
                //
                <ul className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {allMemberIdsForDisplay.map(
                    (
                      memberId //
                    ) => (
                      <li
                        key={memberId} //
                        className="bg-gray-700 p-3 rounded-md shadow-sm" //
                      >
                        <h4 className="text-md font-medium text-indigo-300 mb-1.5">
                          {memberUsernames[memberId] || //
                            `ID: ${memberId.substring(0, 8)}...`}
                          {memberId === currentSessionData.gmId && ( //
                            <span className="ml-1.5 text-xs text-yellow-300 bg-yellow-700 bg-opacity-50 px-1.5 py-0.5 rounded-full">
                              (GM)
                            </span>
                          )}
                          {userId === memberId && ( //
                            <span className="ml-1.5 text-xs text-blue-300 bg-blue-700 bg-opacity-50 px-1.5 py-0.5 rounded-full">
                              (あなた)
                            </span>
                          )}
                        </h4>
                        {(currentSessionData.availabilities?.[memberId]
                          ?.length ?? //
                          0) > 0 ? ( //
                          <ul className="list-disc list-inside text-gray-300 text-sm pl-1 space-y-1">
                            {//
                            (
                              currentSessionData.availabilities?.[memberId] ||
                              []
                            ) //
                              .map(
                                (
                                  dateStr,
                                  idx //
                                ) => (
                                  <li key={idx}>
                                    {formatDateForDisplay(dateStr)}
                                  </li> //
                                )
                              )}
                          </ul>
                        ) : (
                          //
                          <p className="text-gray-400 text-xs italic">
                            まだ日時が提出されていません。
                          </p>
                        )}
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>

            <div className="p-4 border border-green-700 rounded-lg bg-green-900 bg-opacity-20 shadow">
              <h3 className="text-xl font-semibold text-green-300 mb-3">
                全員が参加可能な日時 ✨
              </h3>
              {commonAvailableDates.length === 0 ? ( //
                <p className="text-gray-300">
                  {Object.keys(currentSessionData.availabilities || {}).length < //
                  allMemberIdsForDisplay.length //
                    ? `まだ全員が日時を提出していません (${
                        //
                        Object.keys(currentSessionData.availabilities || {}) //
                          .length //
                      }/${allMemberIdsForDisplay.length}人提出済み)。` //
                    : "全員が参加可能な日時がありません。"}
                </p>
              ) : (
                //
                <ul className="space-y-2 max-h-72 overflow-y-auto pr-2">
                  {commonAvailableDates.map(
                    (
                      dateStr,
                      index //
                    ) => (
                      <li
                        key={index} //
                        className="bg-green-700 bg-opacity-50 p-2.5 rounded-md shadow-sm text-green-200 font-medium flex justify-between items-center" //
                      >
                        <span>{formatDateForDisplay(dateStr)}</span>
                        {isGM &&
                          currentSessionData.status !== "日程確定" && ( //
                            <button
                              onClick={
                                () =>
                                  //
                                  openFinalDateConfirmationModal(dateStr) //
                              }
                              className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-1 px-2.5 rounded-md disabled:opacity-60" //
                              disabled={isSubmittingAvailability} //
                            >
                              この日に確定
                            </button>
                          )}
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          </div>

          <button
            onClick={() => setView("list")} //
            className="mt-6 w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2.5 px-4 rounded-lg" //
          >
            セッション一覧に戻る
          </button>

          {showConfirmFinalDateModal && ( //
            <ConfirmationModal
              message={`最終日程を「${formatDateForDisplay(
                //
                finalDateToConfirm //
              )}」に確定しますか？この操作は元に戻せません。`}
              onConfirm={handleConfirmFinalDate} //
              onCancel={() => setShowConfirmFinalDateModal(false)} //
            />
          )}
        </>
      )}
    </div>
  );
}

export default ScheduleAdjustment; //
