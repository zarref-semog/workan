const API_URL = '/api';
const TOKEN_KEY = 'workan.auth.token';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(path, options = {}) {
  const token = authStorage.getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Não foi possível concluir a operação.');
  }
  return response.status === 204 ? null : response.json();
}

export const api = {
  uploadFile: async (file) => {
    const content = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      reader.readAsDataURL(file);
    });
    return request('/files', { method: 'POST', body: JSON.stringify({ name: file.name, content }) });
  },
  downloadFile: async (file) => {
    const response = await fetch(`${API_URL}/files/${encodeURIComponent(file.fileId)}`, { headers: { Authorization: `Bearer ${authStorage.getToken()}` } });
    if (!response.ok) throw new Error('Não foi possível baixar o arquivo.');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url; link.download = file.name; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getCurrentUser: () => request('/auth/me'),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  listBoards: () => request('/boards'),
  getBoard: (id) => request(`/boards/${id}`),
  createBoard: (data) => request('/boards', { method: 'POST', body: JSON.stringify(data) }),
  updateBoard: (id, data) => request(`/boards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBoard: (id) => request(`/boards/${id}`, { method: 'DELETE' }),
  listUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetUserPassword: (id) => request(`/users/${id}/reset-password`, { method: 'POST' }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  listTeams: () => request('/teams'),
  createTeam: (data) => request('/teams', { method: 'POST', body: JSON.stringify(data) }),
  updateTeam: (id, data) => request(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeam: (id) => request(`/teams/${id}`, { method: 'DELETE' }),
  getAppearance: () => request('/appearance'),
  updateAppearance: (data) => request('/appearance', { method: 'PUT', body: JSON.stringify(data) }),
};
