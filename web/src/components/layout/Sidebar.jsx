import { WorkanLogo } from "../assets/WorkanLogo";
import {
  Columns3,
  LogOut,
  MoreHorizontal,
  Palette,
  ShieldCheck,
  UsersRound,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "../ui/Avatar";
import { hasCustomBranding } from "../../hooks/useBranding";

const navigationItems = [
  { id: "boards", label: "Quadros", icon: Columns3 },
    { id: "teams", label: "Equipes", icon: UsersRound },
];

const administrationItems = [
  { id: "teams", label: "Equipes", icon: UsersRound, permissions: ["admin"] },
  { id: "appearance", label: "Aparência", icon: Palette, permissions: ["superadmin"] },
  { id: "users", label: "Usuários", icon: UserRound, permissions: ["superadmin", "admin"] },
  { id: "permissions", label: "Permissões", icon: ShieldCheck, permissions: ["superadmin", "admin"] },
];

export function Sidebar({ page, navigate, branding, currentUser, onLogout }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const activePage = page === "board" ? "boards" : page;
  const permission = currentUser?.permission || "member";
  const showWorkspace = permission !== "admin";
  const visibleAdministrationItems = administrationItems.filter((item) => item.permissions.includes(permission));
  useEffect(() => {
    const close = (event) =>
      !menuRef.current?.contains(event.target) && setUserMenuOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <aside className="sidebar">
      <div className={hasCustomBranding(branding) ? "brand" : "brand default-brand"}>
          {!hasCustomBranding(branding) ? <WorkanLogo /> : <>
            {branding?.logoUrl && <span className="brandmark"><img src={branding.logoUrl} alt="" /></span>}
            <div>
              {branding?.appName && <strong>{branding.appName}</strong>}
              {branding?.tagline && <small>{branding.tagline}</small>}
            </div>
          </>}
        </div>
        <nav>
        {showWorkspace && <span className="nav-label">ESPAÇO DE TRABALHO</span>}
        {showWorkspace && navigationItems.filter((item) => permission !== "member" || currentUser?.ledTeamIds?.length > 0 || item.id !== "teams").map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={activePage === id ? "active" : ""}
            onClick={() => navigate(id)}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
        {!!visibleAdministrationItems.length && <div className="admin-navigation">
          <span className="nav-label">ADMINISTRAÇÃO</span>
          {visibleAdministrationItems.map(({ id, label, icon: Icon }) => <button key={id} className={activePage === id ? "active" : ""} onClick={() => navigate(id)}><Icon size={19}/><span>{label}</span></button>)}
        </div>}
      </nav>
      <div className="sidebar-bottom">
        <div className="user" ref={menuRef}>
          <Avatar person={currentUser || { initials: "?" }} small />
          <div>
            <strong>{currentUser?.name || "Usuário"}</strong>
            <small>{permission === "superadmin" ? "Superadmin" : permission === "admin" ? "Administrador" : permission === "teamlead" ? "Líder de equipe" : "Membro"}</small>
          </div>
          <button
            className="user-menu-trigger"
            aria-label="Opções do usuário"
            onClick={() => setUserMenuOpen((current) => !current)}
          >
            <MoreHorizontal size={18} />
          </button>
          {userMenuOpen && (
            <div className="user-menu">
              <button className="logout-option" onClick={onLogout}>
                <LogOut size={16} />
                <span>
                  <strong>Sair</strong>
                  <small>Encerrar sessão</small>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
