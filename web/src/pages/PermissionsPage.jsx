import { ShieldCheck } from 'lucide-react';
import { Checkbox } from '../components/forms/Checkbox';
import { PageHead } from '../components/ui/PageHead';

const permissions = [
  { id: 'manageBoards', label: 'Gerenciar quadros', description: 'Criar, editar e excluir quadros.' },
  { id: 'manageCards', label: 'Gerenciar cards', description: 'Criar, editar e movimentar cards.' },
  { id: 'manageTeams', label: 'Gerenciar equipes', description: 'Criar equipes e definir integrantes.' },
  { id: 'manageUsers', label: 'Gerenciar usuários', description: 'Cadastrar, editar e desativar usuários.' },
  { id: 'viewPermissions', label: 'Consultar permissões', description: 'Visualizar os acessos predefinidos de cada perfil.' },
  { id: 'manageAppearance', label: 'Alterar aparência', description: 'Modificar as configurações de aparência.' },
];
const defaultRoles = {
  superadmin: permissions.map(({ id }) => id),
  admin: ['manageUsers', 'viewPermissions'],
  teamlead: ['manageBoards', 'manageCards', 'manageTeams'],
  member: ['manageCards'],
};
const roles = [
  { id: 'superadmin', name: 'Super Admin', description: 'Acesso completo à aplicação.' },
  { id: 'admin', name: 'Administrador', description: 'Acessa somente usuários e permissões.' },
  { id: 'teamlead', name: 'Líder de equipe', description: 'Gerencia quadros, equipes e cards.' },
  { id: 'member', name: 'Membro', description: 'Gerencia somente os cards dos quadros.' },
];

export function PermissionsPage() {
  return (
    <>
      <PageHead
        eyebrow="ADMINISTRAÇÃO"
        title="Permissões"
        subtitle="As permissões são predefinidas pelo sistema e não podem ser editadas, inclusive pelo superadmin."
      />
      <div className="permission-grid">
        {roles.map((role) => (
          <section className="panel permission-role" key={role.id}>
            <header>
              <span><ShieldCheck size={20} /></span>
              <div><h3>{role.name}</h3><p>{role.description}</p></div>
            </header>
            <div>
              {permissions.map((permission) => (
                <Checkbox
                  key={permission.id}
                  label={permission.label}
                  description={permission.description}
                  checked={defaultRoles[role.id].includes(permission.id)}
                  disabled
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
