export const userFields = (data) => Object.fromEntries(
  ['name', 'email', 'permission', 'initials', 'active'].filter((key) => data[key] !== undefined).map((key) => [key, data[key]]),
);
export const publicUser = (user) => {
  const value = user.toObject ? user.toObject() : { ...user };
  delete value.password;
  return value;
};
