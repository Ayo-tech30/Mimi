const admin = require('firebase-admin');

// ============================================================
// FIREBASE SERVICE ACCOUNT - Already configured with your creds
// ============================================================
const serviceAccount = {
  "type": "service_account",
  "project_id": "nexo-violet",
  "private_key_id": "3c086cb9130dfeb397b6f1e832f475dac3344237",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQConAz9yzX5Vsie\nr6sNBzcCjQnOgKyllVw0ktE8x0cZGZk+BCNgbcqrtmW/eygcHboic3xVOyoPn/RV\nAeKXx9GQTS+gNMtbKk1JN6op02sKM/yMf0QiS6RF2TAYnZWDfSRMjkUidlOLKYZX\n+wxBFzGvlOkJK8RsapqPwx0KKcCVqLm3yqKNKvFVPM4QppgW96zL68NwirWQlicJ\nWt2CsLx3yOQZrB0aNgJN9enk9QLFRB9mY5CTnYxHNz7bmfUZYHGUcX7E3rJO+0nV\nknLVi3r13p8/su3iaHz3WC1lNixdjBvCQ+RypHElAhkOtAJ4RNKfYYWmalPbUqYw\nfl2unfM/AgMBAAECggEAFMDgeHytcBCr25xpGXlsiUvYNoAawBGE/+jyXYt0cjUh\nv5hoIlO2lobPj09sEx81l01PsyNNJ2SGK9ByQOxqHFuOeScGa3o8I7748Eetl9vo\n7KzdiLshb9eD1q55hhhpLLh2RKpRLi02SViv8XMWvTM/Bnn0phjuXV5OvL7W4uoR\nKhD9E8uK9UpjyQUojQF8x4Krlg3aJCD6L6Ldv6Nbotdq6H5f0qkMMvT/Gk+sRbf1\nEHJeP/DVTGQDYcDWyKv4tT18FWC9jWRYVJuxeyZDn0Al30PDYzAcAV2grVKqTzFC\nbPw3CrpU9PjYte0LhaZb7xrYwVBrsnFbJwaFkpFkgQKBgQDZX8MJ/k2QpGsbw4H7\nS/qldS5WMBv6ut47P3Sm8aqZOimzk+PObMOtqjQVEO9SuqDWo+BwSAVs3yMF61A3\nhAAd9xAAsXD0f462e1TMXAIqICRYdUl+tZMzrVacNjJ6f2HndCzuUDXkvpdidWQ6\nsaANEkjCv8Cn821U2AzRtBFlxwKBgQDGkgQnQiwJaaV8ifXuupcqFtz6uhUEkVMZ\nC5RgSxYHSTQfLTiDnzOSoS4ssbO6XUUW5qqarcq7t9d3dw0hOjqfkoVq2+3GgGfo\noJu7lXjEhAbJeZ/va4QnTnCIy+S7ioYPH9dc0mooZElGKsYhDsWOn5WXm9Bw/5m8\njqMT21qmyQKBgGH7ZWoKxCHPyyvvm5aPsAKG6IUXGHWTZ/ri5o0d391Dt2pn3ka9\nBhMw5lsckBQFZdx6b/+Mp01k41+Wq0jq6jaXmBIH6bd8C/M7coTPcHZWmKt66s7/\nv8OKfcDaOTS4WIRA/MPLSg+6zXgnHC/Mwy1BMaT/VDMgagbVgCnCdhkfAoGBAL3C\nak+uD/FK0YeLO8fQ7oadZL4CN/Wufy/u/fNrrfh2f2XPzDMUX6+fckXp5+yQF2dE\nNgMtVBFCJZmX3qdDQySdW/x7geXxbdtEKK8Br3B1DxtYrHubTqZVcnt4BfUm8uff\nMOsWdbZ16AQy+jY7LJYYcVd54p8p1Bv6X2Opex7pAoGBAMw4bH9gCxnfWqqgIiFs\n5SSqOMk5XlYaNwSfnnYYRMQlfROyB+jfgnWuz76hB+tNpg6RQGN3jOW6gyQr0iE0\nHXtVBTwF2BiUrZ3mM11Zgrx/1Rn0Wlkx4HmVM5MECJwPwbwZpV1cbPKS2Q/Ln/yn\nQQDsfxvcq6mDaobltjTgUkOf\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@nexo-violet.iam.gserviceaccount.com",
  "client_id": "108955771584722856465",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40nexo-violet.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
  });
}

const db = admin.firestore();

// ============================================================
// DATABASE HELPER FUNCTIONS
// ============================================================

const Database = {
  // Users
  async getUser(jid) {
    const doc = await db.collection('users').doc(jid).get();
    return doc.exists ? doc.data() : null;
  },
  async setUser(jid, data) {
    await db.collection('users').doc(jid).set(data, { merge: true });
  },
  async updateUser(jid, data) {
    await db.collection('users').doc(jid).update(data);
  },

  // Economy
  async getBalance(jid) {
    const user = await this.getUser(jid);
    return user ? (user.balance || 0) : 0;
  },
  async addBalance(jid, amount) {
    const user = await this.getUser(jid) || { balance: 0 };
    await this.setUser(jid, { balance: (user.balance || 0) + amount });
  },
  async removeBalance(jid, amount) {
    const user = await this.getUser(jid) || { balance: 0 };
    const newBal = Math.max(0, (user.balance || 0) - amount);
    await this.setUser(jid, { balance: newBal });
    return newBal;
  },

  // Groups
  async getGroup(groupId) {
    const doc = await db.collection('groups').doc(groupId).get();
    return doc.exists ? doc.data() : {};
  },
  async setGroup(groupId, data) {
    await db.collection('groups').doc(groupId).set(data, { merge: true });
  },

  // Warns
  async getWarns(jid, groupId) {
    const doc = await db.collection('warns').doc(`${groupId}_${jid}`).get();
    return doc.exists ? (doc.data().warns || 0) : 0;
  },
  async addWarn(jid, groupId, reason) {
    const ref = db.collection('warns').doc(`${groupId}_${jid}`);
    const doc = await ref.get();
    const warns = doc.exists ? (doc.data().warns || 0) : 0;
    await ref.set({ warns: warns + 1, reasons: admin.firestore.FieldValue.arrayUnion(reason) }, { merge: true });
    return warns + 1;
  },
  async resetWarns(jid, groupId) {
    await db.collection('warns').doc(`${groupId}_${jid}`).delete();
  },

  // Banned users
  async isBanned(jid) {
    const doc = await db.collection('banned').doc(jid).get();
    return doc.exists;
  },
  async banUser(jid) {
    await db.collection('banned').doc(jid).set({ banned: true, at: Date.now() });
  },
  async unbanUser(jid) {
    await db.collection('banned').doc(jid).delete();
  },

  // Blacklist
  async getBlacklist(groupId) {
    const doc = await db.collection('blacklist').doc(groupId).get();
    return doc.exists ? (doc.data().words || []) : [];
  },
  async addBlacklist(groupId, word) {
    await db.collection('blacklist').doc(groupId).set({
      words: admin.firestore.FieldValue.arrayUnion(word.toLowerCase())
    }, { merge: true });
  },
  async removeBlacklist(groupId, word) {
    await db.collection('blacklist').doc(groupId).set({
      words: admin.firestore.FieldValue.arrayRemove(word.toLowerCase())
    }, { merge: true });
  },

  // Activity tracking
  async logActivity(jid, groupId) {
    const key = `${groupId}_${jid}`;
    await db.collection('activity').doc(key).set({
      jid, groupId, count: admin.firestore.FieldValue.increment(1), last: Date.now()
    }, { merge: true });
  },
  async getGroupActivity(groupId) {
    const snap = await db.collection('activity').where('groupId', '==', groupId).orderBy('count', 'desc').limit(10).get();
    return snap.docs.map(d => d.data());
  },

  // AFK
  async setAFK(jid, reason) {
    await db.collection('afk').doc(jid).set({ reason, since: Date.now() });
  },
  async getAFK(jid) {
    const doc = await db.collection('afk').doc(jid).get();
    return doc.exists ? doc.data() : null;
  },
  async removeAFK(jid) {
    await db.collection('afk').doc(jid).delete();
  },

  // Cards
  async getCards(jid) {
    const doc = await db.collection('cards').doc(jid).get();
    return doc.exists ? (doc.data().cards || []) : [];
  },
  async addCard(jid, card) {
    await db.collection('cards').doc(jid).set({
      cards: admin.firestore.FieldValue.arrayUnion(card)
    }, { merge: true });
  },

  // Richlist
  async getRichlist(groupId) {
    const snap = await db.collection('users').where('groupId', '==', groupId).orderBy('balance', 'desc').limit(10).get();
    return snap.docs.map(d => ({ jid: d.id, ...d.data() }));
  },
  async getGlobalRichlist() {
    const snap = await db.collection('users').orderBy('balance', 'desc').limit(10).get();
    return snap.docs.map(d => ({ jid: d.id, ...d.data() }));
  },

  // Stardust
  async getStardust(jid) {
    const user = await this.getUser(jid);
    return user ? (user.stardust || 0) : 0;
  },
  async addStardust(jid, amount) {
    await this.setUser(jid, { stardust: admin.firestore.FieldValue.increment(amount) });
  },

  // Daily cooldown
  async getDailyCooldown(jid) {
    const doc = await db.collection('cooldowns').doc(`daily_${jid}`).get();
    return doc.exists ? doc.data().timestamp : 0;
  },
  async setDailyCooldown(jid) {
    await db.collection('cooldowns').doc(`daily_${jid}`).set({ timestamp: Date.now() });
  },
};

module.exports = { db, admin, Database };
