import { describe, expect, it, vi } from "vitest";
import {
  FirebaseAdminConfigurationError,
  createFirebaseAdminManager,
  parseFirebaseServiceAccount
} from "./firebaseAdmin.js";

const serviceAccount = {
  type: "service_account",
  project_id: "edulience-920ba",
  private_key_id: "test-key-id",
  private_key: "-----BEGIN PRIVATE KEY-----\\nTEST_KEY_MATERIAL\\n-----END PRIVATE KEY-----\\n",
  client_email: "firebase-adminsdk-test@edulience-920ba.iam.gserviceaccount.com",
  client_id: "1234567890"
};

function createMockAdminSdk() {
  const app = {
    name: "edulience-backend",
    options: { projectId: "edulience-920ba" }
  };
  const noAppError = Object.assign(new Error("App does not exist"), {
    code: "app/no-app"
  });

  return {
    app,
    sdk: {
      applicationDefault: vi.fn(() => ({ source: "adc" })),
      cert: vi.fn(() => ({ source: "certificate" })),
      getApp: vi.fn(() => {
        throw noAppError;
      }),
      initializeApp: vi.fn(() => app),
      getAuth: vi.fn(() => ({ verifyIdToken: vi.fn() })),
      getFirestore: vi.fn()
    }
  };
}

describe("Firebase Admin configuration", () => {
  it("initializes a named Admin app from valid mocked service-account credentials", () => {
    const { app, sdk } = createMockAdminSdk();
    const manager = createFirebaseAdminManager({
      env: {
        FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(serviceAccount),
        FIREBASE_PROJECT_ID: "edulience-920ba"
      },
      sdk
    });

    expect(manager.initialize()).toEqual({
      credentialSource: "service_account_json",
      projectId: "edulience-920ba"
    });
    expect(sdk.cert).toHaveBeenCalledWith(expect.objectContaining({
      project_id: "edulience-920ba",
      client_email: serviceAccount.client_email,
      private_key: "-----BEGIN PRIVATE KEY-----\nTEST_KEY_MATERIAL\n-----END PRIVATE KEY-----\n"
    }));
    expect(sdk.initializeApp).toHaveBeenCalledWith(
      {
        credential: { source: "certificate" },
        projectId: "edulience-920ba"
      },
      "edulience-backend"
    );
    expect(sdk.initializeApp.mock.results[0].value).toBe(app);
  });

  it("rejects malformed JSON without including credential contents in the error", () => {
    const malformedCredential = "{private_key: SUPER_SECRET_KEY}";

    expect(() => parseFirebaseServiceAccount(malformedCredential)).toThrowError(
      expect.objectContaining({
        name: "FirebaseAdminConfigurationError",
        code: "firebase_admin_credentials_invalid_json",
        message: "FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON"
      })
    );

    try {
      parseFirebaseServiceAccount(malformedCredential);
    } catch (error) {
      expect(error.message).not.toContain("SUPER_SECRET_KEY");
    }
  });

  it("rejects missing credentials instead of assuming ambient Render credentials", () => {
    const { sdk } = createMockAdminSdk();
    const manager = createFirebaseAdminManager({ env: {}, sdk });

    expect(() => manager.initialize()).toThrowError(
      expect.objectContaining({
        code: "firebase_admin_credentials_missing",
        message: "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS"
      })
    );
    expect(sdk.applicationDefault).not.toHaveBeenCalled();
    expect(sdk.initializeApp).not.toHaveBeenCalled();
  });

  it("accepts explicit GOOGLE_APPLICATION_CREDENTIALS as the ADC fallback", () => {
    const { sdk } = createMockAdminSdk();
    const manager = createFirebaseAdminManager({
      env: {
        GOOGLE_APPLICATION_CREDENTIALS: "/etc/secrets/firebase-admin.json",
        FIREBASE_PROJECT_ID: "edulience-920ba"
      },
      sdk
    });

    expect(manager.initialize()).toEqual({
      credentialSource: "google_application_credentials",
      projectId: "edulience-920ba"
    });
    expect(sdk.applicationDefault).toHaveBeenCalledOnce();
  });

  it("rejects a service account for a different Firebase project", () => {
    const { sdk } = createMockAdminSdk();
    const manager = createFirebaseAdminManager({
      env: {
        FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
          ...serviceAccount,
          project_id: "different-project"
        })
      },
      sdk
    });

    expect(() => manager.initialize()).toThrowError(
      expect.objectContaining({
        code: "firebase_admin_project_mismatch"
      })
    );
    expect(sdk.initializeApp).not.toHaveBeenCalled();
  });

  it("uses revocation checking when verifying a Firebase ID token", async () => {
    const { sdk } = createMockAdminSdk();
    const verifyIdToken = vi.fn().mockResolvedValue({ uid: "verified-user" });
    sdk.getAuth.mockReturnValue({ verifyIdToken });
    const manager = createFirebaseAdminManager({
      env: {
        FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(serviceAccount)
      },
      sdk
    });

    await expect(manager.verifyIdToken("firebase-id-token")).resolves.toEqual({
      uid: "verified-user"
    });
    expect(verifyIdToken).toHaveBeenCalledWith("firebase-id-token", true);
  });

  it("uses a dedicated configuration error type", () => {
    const error = new FirebaseAdminConfigurationError(
      "firebase_admin_test_error",
      "Safe backend-only message"
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("firebase_admin_test_error");
  });
});
