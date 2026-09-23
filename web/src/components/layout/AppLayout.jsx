import { Sidebar } from "./Sidebar";

export function AppLayout({ page, navigate, branding, currentUser, onLogout, children }) {
  return (
    <div className="app">
      <Sidebar page={page} navigate={navigate} branding={branding} currentUser={currentUser} onLogout={onLogout} />
      <main>
        <div className={`content ${page === "board" ? "wide" : ""}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
