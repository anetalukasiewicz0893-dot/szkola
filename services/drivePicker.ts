// Type definitions for Google API globals
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

let tokenClient: any;
let accessToken: string | null = null;
let pickerInited = false;
let gisInited = false;

// Helper to wait for scripts
const waitForGoogleScripts = async (): Promise<boolean> => {
  let attempts = 0;
  while (attempts < 20) {
    if (window.gapi && window.google) return true;
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }
  return false;
};

// Load the Google API scripts
export const loadGoogleDriveApi = async (apiKey: string, clientId: string) => {
  if (!apiKey || !clientId) return;

  const scriptsLoaded = await waitForGoogleScripts();
  if (!scriptsLoaded) {
    console.error("Google Scripts failed to load.");
    return;
  }

  window.gapi.load('client:picker', async () => {
    try {
      await window.gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: [DISCOVERY_DOC],
      });
      pickerInited = true;
    } catch (e) {
      console.error("GAPI Init Error:", e);
    }
  });

  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: '', // defined dynamically
    });
    gisInited = true;
  } catch (e) {
    console.error("GIS Init Error:", e);
  }
};

// Open the Picker
export const openDrivePicker = async (
  apiKey: string,
  appId: string, 
  onSelect: (files: DriveFile[]) => void
) => {
  // Try loading if not ready (late init)
  if (!pickerInited || !gisInited) {
    await loadGoogleDriveApi(apiKey, window.localStorage.getItem('LL_DRIVE_CLIENT_ID') || '');
    // Wait a bit for async init
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!pickerInited || !gisInited) {
    alert("Google Drive API not initialized. Please check your internet connection or API keys in Settings.");
    return;
  }

  const handleAuth = (response: any) => {
    if (response.error !== undefined) {
      console.error("Auth Error:", response);
      if (response.error === 'popup_closed_by_user') return;
      alert("Authentication failed: " + response.error);
      return;
    }
    accessToken = response.access_token;
    createPicker();
  };

  const createPicker = () => {
    const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
    view.setMimeTypes('application/pdf,application/vnd.google-apps.document,text/plain');
    
    const pickerBuilder = new window.google.picker.PickerBuilder()
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setOAuthToken(accessToken)
      .addView(view)
      .setCallback((data: any) => {
        if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
          const docs = data[window.google.picker.Response.DOCUMENTS];
          const files: DriveFile[] = docs.map((doc: any) => ({
            id: doc[window.google.picker.Document.ID],
            name: doc[window.google.picker.Document.NAME],
            url: doc[window.google.picker.Document.URL],
            mimeType: doc[window.google.picker.Document.MIME_TYPE],
            accessToken: accessToken // Pass token back to allow fetching content
          }));
          onSelect(files);
        }
      });
      
    const picker = pickerBuilder.build();
    picker.setVisible(true);
  };

  if (accessToken) {
    createPicker();
  } else {
    // Request a new token
    tokenClient.callback = handleAuth;
    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  }
};

export interface DriveFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  accessToken?: string;
}

export const fetchDriveFileContent = async (fileId: string, token: string): Promise<string> => {
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.text();
  } catch (error) {
    console.error("Error fetching Drive file content:", error);
    return "Error: Content fetch failed. CORS or Permission issue.";
  }
};