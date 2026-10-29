import { useState } from "react";
import { hostSession, type HostGame } from "../lib/storage";
import { GameScreen } from "./GameScreen";
import { LoginScreen } from "./LoginScreen";
import { UploadScreen } from "./UploadScreen";

// Teacher flow: log in → upload a quiz → run the game. A refresh mid-game returns
// straight to the game, because the tab remembers the game code and host key.

export function HostApp() {
  const [token, setToken] = useState(() => {
    const saved = hostSession.token();
    return saved && saved.expiresAt > Date.now() ? saved.token : null;
  });
  const [game, setGame] = useState<HostGame | null>(() => hostSession.game());
  const [loginMessage, setLoginMessage] = useState<string | null>(() => {
    const saved = hostSession.token();
    return saved && saved.expiresAt <= Date.now() ? "Your login has expired. Please log in again." : null;
  });

  if (game) {
    return (
      <GameScreen
        game={game}
        onLeave={() => {
          hostSession.setGame(null);
          setGame(null);
        }}
      />
    );
  }

  if (!token) {
    return (
      <LoginScreen
        message={loginMessage}
        onLoggedIn={(value) => {
          hostSession.setToken(value);
          setToken(value.token);
          setLoginMessage(null);
        }}
      />
    );
  }

  return (
    <UploadScreen
      token={token}
      onLoggedOut={() => {
        hostSession.setToken(null);
        setToken(null);
        setLoginMessage("Your login has expired. Please log in again, then create the game.");
      }}
      onCreated={(created) => {
        hostSession.setGame(created);
        setGame(created);
      }}
    />
  );
}
