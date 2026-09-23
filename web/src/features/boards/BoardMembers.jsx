import { useEffect, useId, useRef, useState } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { boardMemberDirectory } from '../../utils/boardAccess';

export function BoardMembers({ board, users, teams }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const { members, candidates } = boardMemberDirectory(board, users, teams);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  if (board.visibility === 'public') return null;
  const list = (people) => <ul>{people.map((person) => <li key={person._id}>
    <Avatar person={person} small /><div><strong>{person.name}</strong><small>{person.email}</small></div>
  </li>)}</ul>;
  return <div className="board-members" ref={root} onBlur={(event) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button type="button" className="board-members-trigger" ref={trigger} aria-expanded={open} aria-controls={id}
      aria-label={`Ver membros do quadro (${members.length}) e usuários disponíveis para compartilhar`} onClick={() => setOpen((value) => !value)}>
      <span className="avatar-stack">
        {members.slice(0, 4).map((person) => <Avatar key={person._id} person={person} small />)}
        {members.length > 4 && <span className="avatar small board-members-count">+{members.length - 4}</span>}
      </span>
      {!members.length && <span>Membros (0)</span>}
    </button>
    {open && <div className="board-members-popover" id={id} role="region" aria-label="Membros e candidatos ao compartilhamento" tabIndex={0}>
      <h3>Membros do quadro ({members.length})</h3>
      {members.length ? list(members) : <p>Nenhum membro neste quadro.</p>}
      <h3>Disponíveis para compartilhar ({candidates.length})</h3>
      <p>Estes usuários ainda não participam do quadro.</p>
      {list(candidates)}
    </div>}
  </div>;
}
