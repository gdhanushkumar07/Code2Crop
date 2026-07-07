import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Singleton pattern: prevent re-initialization in dev hot-reload
const apps = getApps();
let app;

if (!apps.length) {
  // Check if environment variables are set (prevents crash during Next.js build)
  if (process.env.FIREBASE_PROJECT_ID) {
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // The private key comes as a string with literal \n characters
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    // Dummy initialization for build time
    app = initializeApp({ projectId: "dummy-project-id" });
  }
} else {
  app = apps[0];
}

const db = getFirestore(app);

export { db };
