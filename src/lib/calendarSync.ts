import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { useAuthStore } from '../store/authStore';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

/**
 * Sign in with Google and request the Calendar scope.
 * Always uses prompt:'consent' + select_account to ensure we get a fresh
 * access token (Google only returns an access token on the consent screen).
 */
export const signInWithGoogle = async (): Promise<string | null> => {
  const authInstance = getAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope(CALENDAR_SCOPE);
  // Force consent screen so Google always returns a fresh access token
  provider.setCustomParameters({ prompt: 'consent', access_type: 'offline' });

  try {
    const result = await signInWithPopup(authInstance, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;

    if (token) {
      useAuthStore.getState().setGoogleAccessToken(token);
    }
    return token;
  } catch (err: any) {
    if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
      console.warn('Popup blocked, falling back to redirect auth...');
      await signInWithRedirect(authInstance, provider);
      return null; // The page will navigate away
    }
    throw err;
  }
};

/**
 * Captures the redirect result if the user just returned from Google sign-in.
 */
export const handleGoogleRedirectResult = async (): Promise<void> => {
  try {
    const authInstance = getAuth();
    const result = await getRedirectResult(authInstance);
    if (!result) return;
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;
    if (token) {
      useAuthStore.getState().setGoogleAccessToken(token);
    }
  } catch (err) {
    console.warn('Google redirect result error:', err);
  }
};

/** Gets a stored Google access token, or returns null if not available. */
async function getGoogleToken(): Promise<string> {
  const stored = useAuthStore.getState().googleAccessToken;
  if (stored) return stored;
  throw new Error('Google Calendar not connected. Please connect it in Settings → Integrations.');
}

/**
 * Make a Google Calendar API request, auto-retrying once if the token is expired (401).
 * On a 401, it clears the stored token so the user can re-connect.
 */
async function calendarFetch(
  url: string,
  options: RequestInit
): Promise<Response> {
  const response = await fetch(url, options);

  if (response.status === 401) {
    // Token expired — clear it so the UI shows "Connect" again
    useAuthStore.getState().setGoogleAccessToken(null);
    throw new Error(
      'Your Google Calendar session has expired. Please reconnect in Settings → Integrations.'
    );
  }

  return response;
}

/** Push a task/reminder as an event to Google Calendar. */
export const pushToGoogleCalendar = async (task: {
  title: string;
  dueDate: string;
  dueTime?: string;
  description?: string;
  reminderMinutesBefore?: number;
}): Promise<string> => {
  const authInstance = getAuth();
  if (!authInstance.currentUser) {
    throw new Error('Must be logged in to sync with Google Calendar.');
  }

  const token = await getGoogleToken();

  const startDate = new Date(task.dueDate);
  if (task.dueTime) {
    const [h, m] = task.dueTime.split(':').map(Number);
    startDate.setHours(h, m, 0, 0);
  } else {
    startDate.setHours(9, 0, 0, 0);
  }
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 1);

  const reminderMinutes = task.reminderMinutesBefore ?? 10;

  const event = {
    summary: task.title,
    description: task.description ?? 'Synced from Nexa Personal OS.',
    start: { dateTime: startDate.toISOString() },
    end: { dateTime: endDate.toISOString() },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: reminderMinutes },
        { method: 'email', minutes: reminderMinutes },
      ],
    },
  };

  const response = await calendarFetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Calendar API Error:', errorText);
    throw new Error('Failed to create event in Google Calendar: ' + response.statusText);
  }

  const data = await response.json();
  return data.id as string;
};

/** Delete a Google Calendar event by its event id. */
export const deleteFromGoogleCalendar = async (eventId: string): Promise<void> => {
  const authInstance = getAuth();
  if (!authInstance.currentUser) return;

  try {
    const token = await getGoogleToken();
    await calendarFetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  } catch {
    // Silently ignore — calendar event deletion is best-effort
  }
};
