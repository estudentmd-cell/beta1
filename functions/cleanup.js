// This cleanup should be run from the browser console on fotocarte.md
// while logged in as admin (fotocartemd@gmail.com)
//
// Copy-paste this into browser DevTools console:

console.log(`
=== CLEANUP SCRIPT ===
Run this in the browser console on fotocarte.md while logged in as admin.
Copy the code below and paste it in DevTools console:

---COPY FROM HERE---

(async () => {
  const { collection, getDocs, doc, deleteDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
  // Use the existing Firestore instance
  const db = window.__FIREBASE_DB || (await import('/src/firebase/config.js')).db;

  const ADMIN_EMAIL = 'fotocartemd@gmail.com';
  const collections = ['orders', 'projects', 'project_data', 'mail_queue', 'visitors', 'email-codes', 'user-notifications', 'admin-notifications', 'errors', 'funnel', 'invitations'];

  for (const colName of collections) {
    const snap = await getDocs(collection(db, colName));
    let deleted = 0;
    for (const d of snap.docs) {
      await deleteDoc(doc(db, colName, d.id));
      deleted++;
    }
    console.log(colName + ': deleted ' + deleted);
  }

  // Clients — keep admin
  const clientsSnap = await getDocs(collection(db, 'clients'));
  let clientDel = 0, clientKept = 0;
  for (const d of clientsSnap.docs) {
    const data = d.data();
    if ((data.email || '').toLowerCase() === ADMIN_EMAIL) { clientKept++; continue; }
    await deleteDoc(doc(db, 'clients', d.id));
    clientDel++;
  }
  console.log('clients: deleted ' + clientDel + ', kept ' + clientKept);

  console.log('\\n=== CLEANUP DONE ===');
})();

---END COPY---
`);
