import { useEffect, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { BoardsPage } from "./pages/BoardsPage";
import { BoardPage } from "./pages/BoardPage";
import { AppearancePage } from "./pages/AppearancePage";
import { PermissionsPage } from "./pages/PermissionsPage";
import { useBranding } from "./hooks/useBranding";
import { api } from "./services/api";
import { authStorage } from "./services/api";
import { LoginPage } from "./pages/LoginPage";
import { TeamsPage } from "./pages/TeamsPage";
import { UsersPage } from "./pages/UsersPage";
import { NewPasswordModal } from './features/people/NewPasswordModal';

const pages = {
  dashboard: BoardsPage,
  boards: BoardsPage,
  board: BoardPage,
  teams: TeamsPage,
  users: UsersPage,
  appearance: AppearancePage,
  permissions: PermissionsPage,
};

export default function App() {
  const { page, resourceId, navigate } = useAppNavigation();
  const branding = useBranding();
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  useEffect(() => {
    if (!authStorage.getToken()) return setCheckingSession(false);
    api.getCurrentUser()
      .then(setCurrentUser)
      .catch(() => authStorage.clear())
      .finally(() => setCheckingSession(false));
  }, []);
  const handleLogin = ({ token, user }) => {
    authStorage.setToken(token);
    setCurrentUser(user);
    navigate(user.permission === "admin" ? "users" : "boards");
  };
  const handleLogout = () => {
    authStorage.clear();
    setCurrentUser(null);
  };
  if (checkingSession) return <div className="session-loading">Carregando...</div>;
  if (!currentUser) return <LoginPage branding={branding} onLogin={handleLogin} />;
  if (currentUser.mustChangePassword) return <NewPasswordModal onComplete={setCurrentUser} onLogout={handleLogout} />;
  const allowedPages = currentUser.permission === "admin"
    ? ["users", "permissions", "teams"]
    : currentUser.permission === "superadmin"
      ? Object.keys(pages)
      : currentUser.permission === "teamlead" || currentUser.ledTeamIds?.length > 0
        ? ["boards", "board", "teams"]
        : ["boards", "board"];
  const effectivePage = allowedPages.includes(page) ? page : currentUser.permission === "admin" ? "users" : "boards";
  const Page = pages[effectivePage] ?? BoardsPage;
  return (
    <AppLayout page={effectivePage} navigate={navigate} branding={branding} currentUser={currentUser} onLogout={handleLogout}>
      <Page navigate={navigate} resourceId={resourceId} currentUser={currentUser} />
    </AppLayout>
  );
}
