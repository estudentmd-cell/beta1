/**
 * Email verification code — everything happens server-side.
 * Cloud Function generates code, stores in Firestore, sends email via Nodemailer.
 * Frontend just calls the Cloud Function.
 */

/**
 * Send verification code to email.
 * Returns { success, exists } — exists=true means email has account already.
 */
export async function createEmailCode(email, mode) {
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const functions = getFunctions(undefined, 'europe-west1');
  const sendCode = httpsCallable(functions, 'sendCode');
  const { data } = await sendCode({ email: email.toLowerCase().trim(), mode: mode || '' });
  return data;
}
