import { JSX } from "react";

function LoadingIndicator(): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-lg">読み込み中...</div>
    </div>
  );
}

export default LoadingIndicator;
