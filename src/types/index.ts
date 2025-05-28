import { Timestamp, Firestore } from "firebase/firestore";
import { Auth } from "firebase/auth";

export interface UserProfile {
  username: string;
}

export type SessionStatus = "募集開始" | "募集終了" | "日程調整中" | "日程確定";

export interface Session {
  id: string;
  trpgType: string;
  scenarioName: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  notificationEmail: string;
  gmId: string;
  participants: string[];
  status: SessionStatus;
  createdAt: Timestamp | Date;
  availabilities?: {
    [userId: string]: string[];
  };
  finalDate?: string;
}
export type ViewType = "list" | "create" | "schedule";

export interface FirebaseContextType {
  db: Firestore | null;
  auth: Auth | null;
  userId: string | null;
  username: string | null;
  appId: string;
  fetchUsername: (
    db: Firestore,
    appId: string,
    uid: string
  ) => Promise<string | null>;
  setUsername: React.Dispatch<React.SetStateAction<string | null>>;
  setShowUsernameModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export interface SessionCardProps {
  session: Session;
  gmUsername: string | null | undefined;
  onSelectSession: (session: Session) => void;
}

export interface SessionListProps {
  onSelectSession: (session: Session) => void;
}

export interface SessionCreationFormProps {
  setView: (view: ViewType) => void;
}

export interface UsernameSettingModalProps {
  onUsernameSet: (newUsername: string) => void;
}

export interface ConfirmationModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ScheduleAdjustmentProps {
  session: Session;
  setView: (view: ViewType) => void;
}
