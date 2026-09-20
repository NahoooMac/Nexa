import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuthStore } from '../store/authStore';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

/**
 * Sign in with Google using a popup. 
 * MUST be called directly in the onClick handler without any preceding `await` or state updates
 * to prevent the browser's popup blocker from blocking it.
 */
export const signInWithGoogle = async (): Promise<string | null> => {
  const authInstance = getAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope(CALENDAR_SCOPE);

  const result = await signInWithPopup(authInstance, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken ?? null;

  if (token) {
    useAuthStore.getState().setGoogleAccessToken(token);
  }
  return token;
};

/** Gets a stored Google access token, or returns null if not available. */
async function getGoogleToken(): Promise<string> {
  const stored = useAuthStore.getState().googleAccessToken;
  if (stored) return stored;
  throw new Error('Google Calendar not connected. Please connect it in Settings.');
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

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Calendar API Error:', errorText);
    useAuthStore.getState().setGoogleAccessToken(null);
    throw new Error('Failed to create event in Google Calendar. API Error: ' + response.statusText);
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
    await fetch(
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
