import { createContext } from "react";
import { FirebaseContextType } from "../types";

// createContextの型引数にデフォルト値を指定
export const FirebaseContext = createContext<FirebaseContextType | null>(null);
