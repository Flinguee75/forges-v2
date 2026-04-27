const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

function getSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage;
}

export function getStoredSession() {
  const storage = getSessionStorage();

  if (!storage) {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }

  const accessToken = storage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = storage.getItem(REFRESH_TOKEN_KEY);
  const rawUser = storage.getItem(USER_KEY);

  if (!rawUser) {
    return {
      accessToken,
      refreshToken,
      user: null,
    };
  }

  try {
    return {
      accessToken,
      refreshToken,
      user: JSON.parse(rawUser),
    };
  } catch {
    clearStoredSession();
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }
}

export function setStoredSession({ accessToken, refreshToken, user }) {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  if (accessToken) {
    storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    storage.removeItem(ACCESS_TOKEN_KEY);
  }

  if (refreshToken) {
    storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    storage.removeItem(REFRESH_TOKEN_KEY);
  }

  if (user) {
    storage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    storage.removeItem(USER_KEY);
  }
}

export function updateStoredUser(user) {
  const storage = getSessionStorage();

  if (!storage || !user) {
    return;
  }

  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(USER_KEY);
}

export function getAccessToken() {
  return getStoredSession().accessToken;
}

export function getRefreshToken() {
  return getStoredSession().refreshToken;
}
